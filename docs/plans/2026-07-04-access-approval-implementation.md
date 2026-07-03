# Secure Access Approval Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the owner login work first, then add a Supabase-backed request and human-admin approval workflow whose privileged provisioning runs only in Edge Functions.

**Architecture:** The existing Northstar company is reused. Public access requests and authenticated approvals call Supabase Edge Functions. The approval function verifies the caller's active admin profile before using the server-only Auth Admin API and database admin client. Browser code contains only the public Supabase key and user session.

**Tech Stack:** React 19, TypeScript, Vite, Supabase Auth/Postgres/RLS, Supabase Edge Functions (Deno), `@supabase/supabase-js`.

---

### Task 1: Make the Owner Admin Login Work

**Files:**
- Reference: `supabase/seed.sql`
- Reference: `docs/LIVE_SUPABASE_SMOKE_TEST.md`
- No company-creation migration is permitted in this task.

**Step 1: Confirm the live project and existing company**

Run:

```bash
supabase projects list
```

Expected: `hiring-evidence-system-dev` is linked.

In the Supabase SQL editor, run:

```sql
select id, name, status
from public.companies
where id = '11111111-1111-4111-8111-111111111111';
```

Expected: one Northstar Digital company row. Do not insert another company.

**Step 2: Invite the owner**

In Supabase Authentication > Users, send an invitation to:

```text
sajeedikovita@gmail.com
```

Expected: one Auth user row exists and Supabase sends an invitation email.

**Step 3: Link the owner to the existing company**

Copy the new Auth user UUID, then run:

```sql
insert into public.recruiter_profiles (
  company_id,
  user_id,
  display_name,
  email,
  role,
  status
)
values (
  '11111111-1111-4111-8111-111111111111',
  'PASTE_AUTH_USER_UUID_HERE',
  'Sajeewa',
  'sajeedikovita@gmail.com',
  'admin',
  'active'
)
on conflict (company_id, user_id)
do update set
  display_name = excluded.display_name,
  email = excluded.email,
  role = 'admin',
  status = 'active',
  updated_at = now();
```

Expected: exactly one active admin profile for the owner.

**Step 4: Complete invitation and sign in**

The owner opens the invitation email, chooses a password, and signs in at `/login`.

Expected: `/dashboard` shows `Live Supabase workspace ready` rather than `Auth user missing`.

**Step 5: Run the live smoke test**

Verify:

- dashboard data loads;
- candidate list loads;
- report `HER-2026-0521-AL` loads;
- a human decision cannot save without a reason;
- a decision with a reason saves;
- a `human_review_decision_saved` audit row exists.

**Step 6: Record the checkpoint**

Update `docs/LIVE_SUPABASE_SMOKE_TEST.md` with the actual owner-login result without storing passwords or tokens.

Commit:

```bash
git add docs/LIVE_SUPABASE_SMOKE_TEST.md
git commit -m "docs: verify owner Supabase login"
```

Stop here if the invitation has not been completed. Do not let the broader feature obscure an owner-login failure.

### Task 2: Add the Access Request Database Migration

**Files:**
- Create: `supabase/migrations/202607040001_access_requests.sql`
- Create: `supabase/tests/access_requests.sql`

**Step 1: Write the failing SQL security checks**

Cover:

- `access_requests` exists;
- status is constrained to `pending`, `approved`, or `rejected`;
- email is normalized;
- only active admins can select requests;
- ordinary recruiters cannot select or update requests;
- duplicate pending requests are prevented.

**Step 2: Run the SQL test before the migration**

Run:

```bash
supabase test db supabase/tests/access_requests.sql
```

Expected: FAIL because `public.access_requests` does not exist.

**Step 3: Implement the migration**

Create `public.access_requests` with the approved design fields. Add:

```sql
create unique index access_requests_one_pending_email
on public.access_requests (lower(work_email))
where status = 'pending';
```

Add:

```sql
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recruiter_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  )
$$;
```

Enable RLS. Add admin-only select/update policies. Do not add anonymous table select.

**Step 4: Re-run SQL tests**

Run:

```bash
supabase test db supabase/tests/access_requests.sql
```

Expected: PASS.

**Step 5: Apply the migration**

Run:

```bash
supabase db push --linked
```

Expected: the migration is applied once to `hiring-evidence-system-dev`.

**Step 6: Commit**

```bash
git add supabase/migrations/202607040001_access_requests.sql supabase/tests/access_requests.sql
git commit -m "feat: add secure access request records"
```

### Task 3: Build Server-Side Edge Functions

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/functions/_shared/access.ts`
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/request-access/index.ts`
- Create: `supabase/functions/approve-access-request/index.ts`
- Create: `supabase/functions/reject-access-request/index.ts`
- Create: `supabase/functions/tests/access.test.ts`

**Step 1: Write failing Deno tests**

Test pure shared functions for:

- lowercase email normalization;
- required field validation;
- safe duplicate-request response;
- admin authorization rejection;
- approved role allow-list;
- idempotent approval result mapping;
- no response containing service keys.

Run:

```bash
deno test supabase/functions/tests/access.test.ts
```

Expected: FAIL because the shared module does not exist.

**Step 2: Implement shared validation**

Keep input validation and response shaping in `_shared/access.ts`. Do not read environment secrets from shared browser code.

**Step 3: Implement `request-access`**

Configure it as public:

```toml
[functions.request-access]
verify_jwt = false
```

The function validates input and inserts with its server-side database client. It returns only the submitted request's ID and status.

**Step 4: Implement authenticated approval and rejection**

Keep JWT verification enabled for both functions. Each function must:

1. read the caller JWT;
2. resolve the caller with `auth.getUser`;
3. query an active `admin` recruiter profile;
4. reject non-admin callers with `403`;
5. perform privileged work only after authorization.

Approval calls:

```ts
await supabaseAdmin.auth.admin.inviteUserByEmail(request.work_email, {
  redirectTo: `${appUrl}/set-password`
});
```

Then it upserts the recruiter profile into the selected existing company, marks the request approved, and writes an audit row. It must not create a company.

**Step 5: Verify service-role isolation**

Run:

```bash
rg -n "SERVICE_ROLE|SECRET_KEYS|service_role" src
```

Expected: no matches.

Run:

```bash
rg -n "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS" supabase/functions
```

Expected: matches occur only in server-side Edge Function code.

**Step 6: Run function tests**

Run:

```bash
deno test supabase/functions/tests/access.test.ts
```

Expected: PASS.

**Step 7: Deploy**

Run:

```bash
supabase functions deploy request-access
supabase functions deploy approve-access-request
supabase functions deploy reject-access-request
```

Expected: all three functions are active in `hiring-evidence-system-dev`.

**Step 8: Commit**

```bash
git add supabase/config.toml supabase/functions
git commit -m "feat: provision approved users server-side"
```

### Task 4: Replace Browser Storage and Add Admin UI

**Files:**
- Modify: `src/services/pilotRequestService.ts`
- Modify: `src/pages/RequestPilotPage.tsx`
- Modify: `src/services/authService.ts`
- Create: `src/services/accessApprovalService.ts`
- Create: `src/pages/AdminAccessRequestsPage.tsx`
- Create: `src/pages/SetPasswordPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/RecruiterShell.tsx`
- Modify: `src/styles.css`
- Modify: `tests/design-system.test.tsx`
- Modify: `tests/supabase-foundation.test.ts`

**Step 1: Write failing frontend tests**

Test:

- the public request service invokes `request-access`;
- the page no longer references `localStorage`;
- the admin page lists pending requests through the repository/service boundary;
- Approve invokes the Edge Function, never Auth Admin directly;
- a recruiter receives an authorization error;
- the set-password page calls `auth.updateUser`;
- routes exist for `/admin/access-requests` and `/set-password`;
- browser source contains no service-role key names or values.

Run:

```bash
npm run test
```

Expected: FAIL on the new behavior.

**Step 2: Implement the public request service**

Make `submitPilotRequest` asynchronous and call:

```ts
client.functions.invoke("request-access", { body: normalizedInput });
```

Remove browser storage reads and writes.

**Step 3: Implement the admin service and page**

Use the signed-in Supabase client for list access under RLS and for function invocation. The UI may select only existing companies visible to the administrator.

**Step 4: Implement password setup**

Use the invitation session and:

```ts
await client.auth.updateUser({ password });
```

Never log the password.

**Step 5: Add routes and navigation**

Add:

- `/admin/access-requests`
- `/set-password`

Show Access requests navigation only when the active profile role is `admin`.

**Step 6: Run frontend tests**

Run:

```bash
npm run test
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src tests
git commit -m "feat: add human access approval workspace"
```

### Task 5: End-to-End Security and Product Verification

**Files:**
- Modify: `docs/LIVE_SUPABASE_SMOKE_TEST.md`
- Modify: `docs/PROJECT_STATE.md`

**Step 1: Test a public request**

In a signed-out browser, submit a unique tester email.

Expected: confirmation says the request is pending human review; a Supabase row exists.

**Step 2: Test authorization**

As a recruiter, request the admin page and invoke approval.

Expected: no request data is returned and approval returns `403`.

**Step 3: Test admin approval**

As `sajeedikovita@gmail.com`, approve the request as `recruiter` for the existing Northstar company.

Expected: one invitation is sent, one recruiter profile exists, the request is approved, and an audit row exists.

**Step 4: Test idempotency**

Repeat approval for the same request.

Expected: no duplicate Auth user, company, or recruiter profile.

**Step 5: Test invited-user login and isolation**

Complete the invitation, set a password, and sign in.

Expected: the user sees only the assigned Northstar workspace.

**Step 6: Run required verification**

Run:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
deno test supabase/functions/tests/access.test.ts
```

Report every result accurately. Do not call the work complete if the audit or live smoke test fails.

**Step 7: Update status docs and commit**

Document what is live, what is still development-only, email rate-limit boundaries, and the SMTP follow-up.

```bash
git add docs/LIVE_SUPABASE_SMOKE_TEST.md docs/PROJECT_STATE.md
git commit -m "docs: record live access approval verification"
```
