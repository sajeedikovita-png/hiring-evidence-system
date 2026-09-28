# Linked Supabase isolation validation — 2026-09-16

## Scope and safety

This check used the existing `supabase db query --linked --file` path through the Supabase Management API. No migrations were applied, no database reset or seed was run, no Auth users were created persistently, no privileges were granted, and no Edge Function was invoked. The test files were inspected before execution and each ends with `rollback;` after its pgTAP assertions.

The following existing tests were run:

| Test | Result | Safety boundary |
| --- | --- | --- |
| `supabase/tests/workspace_access_hardening.sql` | PASS — 15 assertions | Synthetic rows and role changes are inside one transaction; ends with `rollback` |
| `supabase/tests/workspace_access_behavior.sql` | PASS — 21 assertions | Synthetic Auth/company/profile/candidate/request fixtures are inside one transaction; ends with `rollback` |
| `supabase/tests/access_request_approval_finalization.sql` | PASS — 9 assertions | Synthetic approval/finalization fixtures are inside one transaction; ends with `rollback` |
| `supabase/tests/company_access_policy.sql` | INCOMPLETE — `# Looks like you failed 6 tests of 17` | Transaction completed and ended with `rollback`; no fixture persisted |

## Scoped migration rehearsal

Prepared `supabase/migrations/202609160002_restore_special_company_access_audit_actions.sql`. It preserves every action currently present in the linked constraint and adds only `special_company_access_granted` and `special_company_access_transferred`, the two actions emitted by the policy function. The migration was concatenated with `company_access_policy.sql` inside one linked-database transaction; all 17 assertions passed, and the test's final `rollback` removed the temporary constraint change and fixtures. The migration was not applied.

The company-access policy suite initially reported six failures. A separately reviewed rollback diagnostic identified the cause: the linked database's `audit_log_entries_action_check` omits `special_company_access_granted` and `special_company_access_transferred`, while `apply_special_company_access` writes those actions and the repository migration/test expects them. The six dependent failures were the grant, transfer, resulting membership/audit assertions, and quota assertion. Temporarily replacing only that check with a permissive non-null check inside the same transaction made all 17 policy assertions pass; the diagnostic transaction ended with `rollback`. This is deployed schema drift and requires a reviewed migration before the policy flow can be considered live-safe.

## Rollback verification

Before and after the suites, the linked project reported 5 companies, 9 recruiter profiles, and 5 access requests. Afterward, read-only checks found zero synthetic Auth users matching the test fixtures, zero synthetic companies, zero synthetic profiles, and zero synthetic access requests. This is evidence that the rollback boundaries left no test data behind.

## Required repository gates

All required gates passed in the current checkout:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --audit-level=high` — 0 vulnerabilities

The build emitted the existing chunk-size advisory; it did not fail.

## Onboarding and live-flow boundary

No onboarding mutation was run. The public `request-access` function persists an access request; approval can invite an Auth user and provision a workspace; support submission persists an issue and can notify an owner; and `scripts/support-agent-queue.mjs` claims or updates support jobs with a private token. Those paths require explicit synthetic-fixture cleanup and, for approval, can send email, so they were outside this rollback-only isolation check.

This validation proves current linked-database behavior for the three passing rollback suites and proves cleanup for all executed suites. It does not prove browser route behavior, mailbox delivery, or a complete live onboarding flow.

## Applied and verified

Parent reviewed the exact live constraint and applied migration 202609160002 in a transaction with its migration-history record. The unchanged company_access_policy.sql passed all 17 assertions afterward and rolled back its fixtures. The four original suites now total 62 passing assertions.
