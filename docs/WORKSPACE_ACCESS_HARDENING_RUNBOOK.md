# Workspace access hardening runbook

## Purpose

Milestone 1C separates customer-workspace membership from platform access approval. A customer administrator is not a platform operator. Customer routes require an active recruiter profile in an active company. The access-request queue and approval functions require an authenticated user listed as active in the canonical `platform_admins` allowlist.

The browser never supplies a platform user ID. The database helper derives it from the verified Supabase Auth session, and the Edge Functions verify the bearer token before querying the allowlist with the service role.

The migration hardens both `current_company_ids()` and `current_company_ids_text()` so database and Storage policies lose access when a company is paused. Where the live trial lifecycle is installed, it also requires active workspace membership before `activate_demo_trial` can start a 14-day clock.

## Prerequisites

- Confirm the intended operator already exists in Supabase Auth.
- Confirm the base schema, the access-request compatibility migration, and the live demo-trial lifecycle are already deployed where applicable.
- Review `202609090001_workspace_access_hardening.sql` before deploying it. It does not add any platform operator automatically.
- The migration grants `service_role` allowlist read access for protected Edge Functions. An authenticated browser may read only its own allowlist row through RLS and cannot write that table.
- Deploy the hardening migration before deploying the changed `approve-access-request` and `reject-access-request` Edge Functions. Those functions write `reviewed_by_platform_user_id`.

## Controlled platform-operator bootstrap

Use a restricted SQL deployment session after the migration is in place. Replace the placeholder with the verified Supabase Auth user UUID; do not take it from browser input or a request payload.

```sql
insert into public.platform_admins (user_id, display_name, status)
values ('VERIFIED_AUTH_USER_UUID', 'Verified platform operator', 'active')
on conflict (user_id) do update
set status = 'active';
```

Do not add every customer `recruiter_profiles.role = 'admin'` user to this table. Disabling an operator is a controlled database action:

```sql
update public.platform_admins
set status = 'disabled'
where user_id = 'VERIFIED_AUTH_USER_UUID';
```

## Deployment order

1. Apply `supabase/migrations/202609090001_workspace_access_hardening.sql` through the normal reviewed migration workflow.
2. Deploy `approve-access-request` and `reject-access-request` from the same reviewed revision.
3. Bootstrap only the verified platform operator with the controlled SQL above.
4. Sign in as that operator and verify the access-request queue can load.
5. Perform the acceptance checks below with synthetic records only.

## Acceptance checks

- A user with an active profile in an active company can read only that company through normal workspace RLS.
- Pausing the company immediately prevents that member from reading or writing company rows and candidate-document storage objects.
- A customer user with `recruiter_profiles.role = 'admin'`, but no active `platform_admins` row, cannot load the access-request queue or invoke approval/rejection successfully.
- An active platform operator without a customer membership can load the queue and approve or reject a request. Approval provisions the requester's isolated active trial workspace; it has no broad customer-company selector.
- An authenticated browser cannot update `recruiter_profiles` to change a role, company, status, or `user_id`, and cannot update `access_requests` directly.
- A disabled platform operator loses queue and Edge Function approval access.

## Validation commands

Run the repository gates before deployment:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
```

Run the database regression test in a local Supabase database when its dependencies are available:

```bash
supabase test db supabase/tests/workspace_access_hardening.sql
supabase test db supabase/tests/workspace_access_behavior.sql
```

`workspace_access_behavior.sql` creates and rolls back synthetic Auth, company, profile, entitlement, and request fixtures. It therefore requires the demo-trial lifecycle and pgTAP in the target test database. The SQL tests validate deployed schema and grants; browser route checks are a separate end-to-end test. This milestone does not yet enforce cross-table same-company foreign keys or make all audit actors server-derived.

Approval writes a company-scoped audit entry with the platform operator ID in metadata. Rejection records the platform operator, timestamp, and human review note on `access_requests`; a dedicated global platform-audit stream remains later work because a rejected public request has no customer company to own a `audit_log_entries` row.
