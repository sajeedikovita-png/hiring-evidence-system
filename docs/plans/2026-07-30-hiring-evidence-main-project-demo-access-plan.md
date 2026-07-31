# Hiring Evidence Self-Serve Pilot Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the existing Hiring Evidence request/approval flow so the founder is notified, can safely approve a company, and the approved customer receives an isolated 14-day workspace that can persistently process real CVs under enforced limits.

**Architecture:** Build on the active repository’s existing public request, `/admin`, Supabase invitation, and OpenRouter analysis code. Separate platform-owner authority from company authority; make request intake and notification reliable; provision company/profile/trial records during approval; move customer data from browser `localStorage` into company-scoped Supabase tables and private Storage; enforce trial access and quotas in Postgres/Edge Functions; and retain the public login-free demo as a clearly labeled, non-persistent sales demo.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Supabase Auth/Postgres/Storage/Edge Functions/Cron, OpenRouter, transactional email provider, Vercel, Deno tests, pgTAP, existing TypeScript tests.

---

## 1. Authoritative Project

Use only:

```text
/Users/sajeewa/development/recruiter applications
```

Do not implement this plan in:

```text
/Users/sajeewa/Documents/New project
```

That is an older clone and does not contain the latest deployed work.

### Git state observed on 2026-07-30

- Active branch: `codex/demo-test-lab`
- Local and remote commit: `09274c3`
- GitHub: `sajeedikovita-png/hiring-evidence-system`
- `main` is behind and is not the production source.
- The working directory contains many unrelated untracked Lost Story/media files. Preserve them and do not stage, move, or delete them.

### Hosting observed from `docs/INFRASTRUCTURE.md`

- Production site: `https://hiringevidence.com`
- Vercel project: `hiring-evidence-system`
- Vercel public fallback URL: `https://hiring-evidence-system.vercel.app`
- Production is updated by manually promoting a Vercel deployment.
- Pushing a branch produces a preview and does not automatically update production.
- Supabase project reference documented as `vzfurafvkoqwmfkzcwjj`.
- Founder Auth account documented as `sajeedikovita@gmail.com`.
- The placeholder `myriadlooptech@gmail.com` in `supabase/bootstrap.sql` was documented as never created.

These are repository records last verified on 2026-07-29, not proof of current live state. Task 0 must verify them in Vercel and Supabase before any deployment.

## 2. Approved Product Behavior

- A prospect submits a demo request from the public website.
- The request must reach Supabase; a browser-only fallback must not be reported as success.
- The founder receives an email notification.
- The email links to `/admin`; it does not approve from email.
- Only a verified platform owner can list and decide requests.
- Approval creates a new isolated company and an owner/recruiter profile.
- Supabase sends the requester an invitation to `/welcome`.
- The customer sets a password and opens `/dashboard`.
- The 14-day period begins on first successful activation.
- Default limits: two users, two jobs, and 50 CVs.
- The customer may use real candidate data after acknowledging lawful authority/consent.
- Customer data is private, company-scoped, and persistent across devices.
- At expiry, writes stop and the workspace becomes read-only for seven days.
- The founder may manually convert the company to paid.
- If not converted, private CV files and demo-company data are purged after the grace period.
- Every approval, rejection, activation, quota failure, expiry, conversion, and purge is audited.

## 3. What Already Exists in the Active Repository

### Verified in code

- `/request-pilot` form.
- Public Supabase insertion into `access_requests`.
- `/admin` request list with submitted date.
- Founder sign-in.
- Admin approve and reject buttons.
- `approve-request` Edge Function.
- Supabase Auth invitation with recovery-email fallback.
- `/welcome` password setup.
- Successful password setup links to `/dashboard`.
- Supabase tenant schema and RLS foundation.
- Login-free public demo.
- PDF/DOCX text extraction in the browser.
- `analyze-resume` Edge Function calling OpenRouter.
- Bounded analysis output and maximum 12 criteria.
- AI safety prompt that avoids automatic hiring decisions.
- Browser-local persistence of uploaded demo reports.
- Custom domain, Vercel configuration, Supabase project, and infrastructure documentation.

### Existing files to preserve and extend

- `src/App.tsx`
- `src/pages/RequestPilotPage.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/SetPasswordPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/BulkUploadCandidatesPage.tsx`
- `src/components/bulk-upload/BulkUploadCandidatesPanel.tsx`
- `src/services/accessRequestService.ts`
- `src/services/pilotRequestService.ts`
- `src/services/authService.ts`
- `src/services/hiringRepository.ts`
- `src/services/supabaseHiringRepository.ts`
- `src/services/demoUploadEngine.ts`
- `src/services/resumeAnalysis.ts`
- `src/services/resumeTextExtraction.ts`
- `src/services/publicSupabaseClient.ts`
- `supabase/functions/approve-request/index.ts`
- `supabase/functions/invite-user/index.ts`
- `supabase/functions/analyze-resume/index.ts`
- `supabase/migrations/202607051200_access_requests_public_submit.sql`
- `supabase/migrations/202607060001_admin_workspace.sql`
- `docs/INFRASTRUCTURE.md`
- `docs/plans/2026-07-27-pilot-user-lifecycle.md`

## 4. Current Gaps and Risks

### Request intake can falsely report success

`RequestPilotPage.tsx` first writes to browser `localStorage`, then calls
`saveAccessRequestToBackend(form)` as best effort and ignores its result. The page
always shows “Pilot request recorded,” even if Supabase rejects the request.

Production must show success only after Supabase confirms it. Browser storage may
remain a development diagnostic, but cannot be the source of truth.

### Public insertion has weak validation and spam protection

The browser inserts directly through PostgREST using the anon key. The current RLS
policy permits any insert with `WITH CHECK (true)`. There is no server validation,
duplicate control, CAPTCHA, IP/email throttle, or notification outbox.

### No founder email notification

The founder must manually check `/admin`. Supabase Auth email can send invitations
and recovery messages, but not this arbitrary business notification.

### Company admins and platform owner are conflated

`is_current_user_admin()` and `approve-request` authorize any active
`recruiter_profiles.role = 'admin'`. Once customer companies can have administrators,
that would allow a customer admin to access platform requests unless the authority
model is separated.

### Approval is non-transactional and incomplete

`approve-request`:

- marks the request approved before invitation succeeds;
- does not require the request to be pending;
- does not provision a company;
- does not create the requester’s recruiter profile;
- does not create a trial record;
- returns the requester’s email to the browser unnecessarily;
- hardcodes the Vercel fallback URL instead of using the custom domain/configured `APP_URL`.

### Login does not create a usable customer workspace

`supabaseHiringRepository` requires an active recruiter profile. Approved users do
not receive one, so they cannot resolve company context after login.

### No create-job onboarding

A newly provisioned company would still have no way to define its first role and
criteria. Existing buttons route to demo data.

### “Real analysis” is not yet a real private customer workflow

The login-free demo does call OpenRouter using extracted CV text. However:

- extraction runs in the browser;
- the function accepts the anon key;
- there is no per-user/IP rate limit;
- metadata is assembled from mock company/job data;
- reports and decisions are stored in `localStorage`;
- failures silently fall back to a scripted report;
- there is no private Supabase Storage object;
- there is no persistent candidate/application/document/report/audit transaction.

This proves that a model can analyze extracted text. It does not prove an isolated,
persistent, paid-equivalent customer workspace.

### No trial lifecycle

No activation, expiry, quota, read-only grace, conversion, or purge exists.

### Documentation drift

`docs/PROJECT_STATE.md` still says real AI and backend features are not built, while
later commits added parts of them. Update documentation during implementation.

## 5. Target Architecture

### Two deliberately separate products modes

1. **Public sales demo**
   - no login;
   - clear “demo” labeling;
   - browser-local data;
   - may use controlled/synthetic files;
   - strict rate/cost controls;
   - never represented as a persistent company workspace.

2. **Approved self-serve pilot**
   - authentication required;
   - private company;
   - persistent Supabase records and Storage;
   - real customer role/criteria;
   - real CV processing;
   - database-enforced trial limits;
   - audit, expiry, conversion, and deletion.

Do not mix the two storage models or silently fall back from the approved pilot to
the scripted demo.

### Platform-owner authority

Create:

```sql
create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null,
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Platform authority must be tied to the Auth user UUID, not an email string or
company-admin role.

### Pilot entitlement

Create:

```sql
create table public.company_entitlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_type text not null check (plan_type in ('demo', 'paid')),
  status text not null check (
    status in ('invited', 'active', 'expired', 'converted', 'suspended', 'purging', 'purged')
  ),
  activated_at timestamptz,
  expires_at timestamptz,
  grace_ends_at timestamptz,
  max_users integer not null default 2 check (max_users > 0),
  max_jobs integer not null default 2 check (max_jobs > 0),
  max_candidates integer not null default 50 check (max_candidates > 0),
  converted_at timestamptz,
  created_by_platform_admin_id uuid references public.platform_admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Notification outbox

Create one outbox record in the same transaction as the request:

```sql
create table public.access_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null references public.access_requests(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (access_request_id)
);
```

The request must remain successful even if notification delivery is temporarily
unavailable.

## 6. Implementation Plan

### Task 0: Verify Live Vercel, Supabase, and Production Behavior

**Files:**

- Create: `docs/handoffs/2026-07-30-self-serve-pilot-live-audit.md`
- Inspect: `docs/INFRASTRUCTURE.md`

**Step 1: Verify Vercel**

Record:

- current production deployment URL and commit;
- whether `hiringevidence.com` points at that deployment;
- preview versus production distinction;
- environment-variable names;
- SPA rewrite status;
- current promoted deployment.

Do not record secret values.

**Step 2: Verify Supabase**

Sign in to project `vzfurafvkoqwmfkzcwjj` only after confirming it is the project
connected to Vercel. Record:

- Auth users;
- actual founder Auth user UUID;
- `access_requests` rows and RLS;
- recruiter profiles;
- deployed Edge Functions and versions;
- Storage buckets;
- secrets by name only;
- Auth redirect URLs;
- Cron jobs;
- recent function errors.

**Step 3: Run a controlled live request**

Submit one test request through production. Confirm:

- whether the browser shows success;
- whether a Supabase row exists;
- whether `/admin` shows it;
- whether approval sends the invitation;
- whether the invited user receives a profile/company (expected currently: no).

**Step 4: Record truth labels**

For every checkpoint use one of:

- local;
- preview;
- backend deployed;
- production deployed;
- end-to-end verified;
- unverified.

**Step 5: Commit**

```bash
git add docs/handoffs/2026-07-30-self-serve-pilot-live-audit.md
git commit -m "docs: record live self-serve pilot baseline"
```

### Task 1: Create an Isolated Worktree From the Active Branch

**Files:** Git worktree only.

**Step 1: Preserve user files**

Do not stage or move the unrelated untracked media/plan files in the repository
root.

**Step 2: Fetch and confirm the branch**

```bash
git fetch origin --prune
git status --short --branch
git log --oneline --decorate -15
```

Expected baseline: verified production source on `codex/demo-test-lab`, at or after
`09274c3`.

**Step 3: Create the worktree**

```bash
git worktree add .worktrees/self-serve-pilot -b codex/self-serve-pilot <verified-production-commit>
```

**Step 4: Run baseline verification**

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
```

Record exact results before edits.

### Task 2: Add Access-Flow Tests Before Changing Behavior

**Files:**

- Create: `tests/access-request-service.test.ts`
- Create: `tests/admin-access-flow.test.tsx`
- Create: `supabase/functions/tests/access-flow.test.ts`
- Create: `supabase/tests/access_requests.sql`
- Modify: `package.json`

**Step 1: Test current request behavior**

Cover:

- normalized valid input;
- invalid email rejected;
- backend not configured;
- backend non-2xx;
- network failure;
- production success only after HTTP success;
- no false success from local storage.

**Step 2: Test admin authorization**

Cover:

- anonymous list denied;
- recruiter list denied;
- company admin list denied after platform-admin separation;
- platform admin list allowed.

**Step 3: Test approval invariants**

Cover:

- pending request required;
- approval idempotency;
- invitation failure does not leave request approved;
- no requester email returned unnecessarily;
- company/profile/entitlement provisioned.

**Step 4: Run tests and confirm expected failures**

```bash
npm run test
deno test supabase/functions/tests
supabase test db
```

**Step 5: Commit tests**

```bash
git add tests supabase/functions/tests supabase/tests package.json
git commit -m "test: define self-serve pilot access behavior"
```

### Task 3: Make Public Request Intake Authoritative

**Files:**

- Modify: `src/pages/RequestPilotPage.tsx`
- Modify: `src/services/accessRequestService.ts`
- Modify: `src/services/pilotRequestService.ts`
- Create: `supabase/functions/request-access/index.ts`
- Create: `supabase/functions/_shared/accessValidation.ts`
- Create: `supabase/migrations/202607300001_access_request_hardening.sql`
- Test: Task 2 files

**Step 1: Move validation server-side**

The Edge Function must normalize and validate:

- company name;
- work email;
- requester role;
- hiring volume;
- first role;
- note length;
- request payload size.

**Step 2: Add duplicate and abuse controls**

- one pending request per normalized email;
- bounded request rate;
- honeypot field;
- provider-backed CAPTCHA before broad marketing if required;
- no raw IP address retained unless privacy review approves it.

**Step 3: Replace direct PostgREST insert**

The browser calls `request-access`. Remove the production reliance on
`WITH CHECK (true)` public table insertion.

**Step 4: Remove false success**

`RequestPilotPage` shows recorded only after the function returns a request ID.
Network/backend failure shows a retryable message and preserves form contents.

**Step 5: Keep local storage development-only**

If retained, guard it with an explicit development flag and label it diagnostic.

**Step 6: Commit**

```bash
git add src supabase tests
git commit -m "fix: make pilot request intake authoritative"
```

### Task 4: Separate Platform Owner From Company Administrators

**Files:**

- Create: `supabase/migrations/202607300002_platform_admins.sql`
- Create: `supabase/functions/_shared/authorizePlatformAdmin.ts`
- Modify: `src/pages/AdminPage.tsx`
- Create: `src/services/platformAdminService.ts`
- Modify: `supabase/functions/approve-request/index.ts`
- Modify: rejection behavior
- Test: platform-admin SQL/Deno/React tests

**Step 1: Add `platform_admins` with RLS**

Normal clients cannot insert or update rows. A signed-in platform administrator may
read their own active record.

**Step 2: Bootstrap the verified founder UUID**

Use a migration only after Task 0 confirms the live Auth UUID. Do not copy the old
hardcoded UUID without verification.

**Step 3: Update `/admin`**

The page must verify platform authority before loading all requests.

**Step 4: Move rejection to a protected function**

Current rejection updates the table directly from the browser and has no required
reason. Add `reject-request` Edge Function requiring a platform admin and a
human-entered reason.

**Step 5: Audit platform decisions**

Record request ID, actor, outcome, reason, and timestamp without storing secrets.

**Step 6: Commit**

```bash
git add src supabase tests
git commit -m "feat: separate platform and company administration"
```

### Task 5: Add Reliable Founder Email Notification

**Files:**

- Create: `supabase/migrations/202607300003_access_notification_outbox.sql`
- Modify: `supabase/functions/request-access/index.ts`
- Create: `supabase/functions/process-access-notifications/index.ts`
- Create: `supabase/functions/_shared/emailProvider.ts`
- Test: `supabase/functions/tests/access-notification.test.ts`
- Test: `supabase/tests/access_notification_outbox.sql`

**Step 1: Create request and outbox transactionally**

Use a security-definer database function called by `request-access`. Duplicate
pending requests must not enqueue duplicate email.

**Step 2: Add provider adapter**

```ts
export type EmailProvider = {
  send(input: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ providerMessageId: string }>;
};
```

Verify the selected provider’s current official API during implementation.

**Step 3: Add scheduled delivery and retry**

Use a Supabase scheduled function. Email failure records the error and retries; it
does not remove the request.

**Step 4: Email content**

Include:

- company name;
- requester work email and role;
- intended first role;
- submitted time;
- link to `https://hiringevidence.com/admin?request=<id>`.

Do not include an approval token, password, candidate data, or one-click approval.

**Step 5: Secrets**

Use server-only secrets such as:

- `ADMIN_NOTIFICATION_EMAIL`;
- `NOTIFICATION_FROM_EMAIL`;
- provider credential;
- `APP_URL=https://hiringevidence.com`.

Do not use `VITE_` for secrets.

**Step 6: Commit**

```bash
git add supabase tests
git commit -m "feat: notify founder of pilot requests"
```

### Task 6: Provision Company, Profile, and Trial During Approval

**Files:**

- Create: `supabase/migrations/202607300004_company_entitlements.sql`
- Modify: `supabase/migrations/...access_requests...` through a new additive migration
- Rewrite: `supabase/functions/approve-request/index.ts`
- Modify: `src/pages/AdminPage.tsx`
- Test: approval SQL/Deno/React tests

**Step 1: Extend request states**

Use explicit states:

- `pending`;
- `provisioning`;
- `approved`;
- `rejected`;
- `provisioning_failed`.

**Step 2: Add trial fields**

Create `company_entitlements` as specified in Section 5.

**Step 3: Implement safe provisioning**

Approval must:

1. verify platform admin;
2. lock and require pending request;
3. create a new company from normalized company name;
4. create invited demo entitlement with approved limits;
5. invite or safely locate the Auth user;
6. create recruiter profile linked to the new company;
7. mark approved only after all required records exist;
8. write an audit event.

Handle partial Auth failure with a recoverable provisioning state. Do not leave an
approved request without company/profile/entitlement.

**Step 4: Use configured domain**

Read `APP_URL` and redirect to `${APP_URL}/welcome`. Do not hardcode the Vercel
fallback URL.

**Step 5: Remove unsafe recovery fallback**

Do not send an unsolicited password-reset email merely because the email already
exists. Define the existing-user flow explicitly and prove it does not attach a
user to the wrong company.

**Step 6: Commit**

```bash
git add supabase src tests
git commit -m "feat: provision approved pilot companies"
```

### Task 7: Activate the 14-Day Trial

**Files:**

- Create: `supabase/functions/activate-pilot/index.ts`
- Modify: `src/pages/SetPasswordPage.tsx`
- Modify: `src/services/authService.ts`
- Create: `src/services/pilotEntitlementService.ts`
- Test: activation tests

**Step 1: Write failing tests**

Prove:

- authenticated invited owner required;
- first activation sets `activated_at`;
- `expires_at = activated_at + 14 days`;
- `grace_ends_at = expires_at + 7 days`;
- repeated activation is idempotent and never extends the trial;
- audit entry created.

**Step 2: Activate after password setup**

After `updateUser({ password })`, call `activate-pilot`. Redirect to `/dashboard`
only after activation succeeds.

**Step 3: Add login recovery**

The authenticated application bootstrap may call activation idempotently so an
interrupted welcome redirect can recover.

**Step 4: Commit**

```bash
git add src supabase tests
git commit -m "feat: activate pilot on first account setup"
```

### Task 8: Build First-Role Onboarding

**Files:**

- Create: `src/pages/CreateJobPage.tsx`
- Create: `src/services/jobSetupService.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: empty-state components/styles
- Create: protected Edge Function or RPC for role creation
- Test: job-setup tests

**Step 1: Define minimum role input**

- title;
- department;
- location;
- employment type;
- required criteria;
- preferred criteria.

**Step 2: Require company context**

Derive company/profile from the authenticated user. Never accept arbitrary company
ID from the browser.

**Step 3: Enforce two-job limit in Postgres**

The UI shows remaining jobs; the database prevents bypass and concurrent overflow.

**Step 4: Add new-company empty state**

After first login, guide the customer to:

1. create role;
2. add criteria;
3. upload CVs;
4. review evidence;
5. record a human decision.

**Step 5: Commit**

```bash
git add src supabase tests
git commit -m "feat: onboard pilot company first role"
```

### Task 9: Enforce Entitlement, Quotas, and Read-Only Grace

**Files:**

- Create: `supabase/migrations/202607300005_pilot_access_policies.sql`
- Modify: tenant RLS policies from `supabase/schema.sql` through additive migrations
- Modify: `src/services/supabaseHiringRepository.ts`
- Modify: `src/services/connectionStatusService.ts`
- Test: `supabase/tests/pilot_access_policies.sql`

**Step 1: Test the boundary**

Prove:

- active pilot reads/writes own company;
- cross-company access denied;
- third user denied;
- third job denied;
- 51st candidate denied;
- expired pilot reads during grace;
- expired pilot cannot write or analyze;
- after grace, reads denied;
- converted company not blocked by demo expiry;
- concurrent inserts cannot exceed quotas.

**Step 2: Split read and write policies**

Current broad tenant policies must distinguish read entitlement from write
entitlement.

**Step 3: Add authoritative quota guards**

Use database triggers or locked security-definer RPCs. Client counts are advisory.

**Step 4: Return stable codes**

- `PILOT_EXPIRED`;
- `PILOT_USER_LIMIT`;
- `PILOT_JOB_LIMIT`;
- `PILOT_CANDIDATE_LIMIT`;
- `PILOT_PURGED`.

**Step 5: Commit**

```bash
git add supabase src tests
git commit -m "feat: enforce pilot access and quotas"
```

### Task 10: Build Persistent, Private CV Processing

This is the critical distinction between the public demo and a paid-equivalent
pilot.

**Files:**

- Create: private Supabase Storage migration/policies
- Create: `supabase/functions/create-candidate-upload/index.ts`
- Modify: `supabase/functions/analyze-resume/index.ts`
- Create: `src/services/persistentResumeAnalysis.ts`
- Modify: upload panel/page
- Modify: `src/services/supabaseHiringRepository.ts`
- Test: storage, upload, analysis, persistence, and RLS tests

**Step 1: Add consent/authority acknowledgement**

Require the customer to confirm a lawful basis or authority to upload and process
candidate CVs.

**Step 2: Create private storage**

Key format:

```text
<company-uuid>/<job-uuid>/<application-uuid>/<document-uuid>.<extension>
```

Allow PDF/DOCX only, enforce size, sanitize metadata, and never use candidate name
or email in the key.

**Step 3: Persist domain records**

Create consistent rows for:

- candidate;
- application;
- uploaded document;
- parser/analysis state;
- evidence report;
- evidence items;
- audit events.

**Step 4: Protect analysis**

For self-serve pilot requests:

- JWT required;
- active entitlement required;
- company derived server-side;
- candidate quota checked;
- job criteria loaded from the customer’s company;
- OpenRouter call bounded;
- output validated;
- report persisted transactionally.

Keep the public demo endpoint separate and rate-limited.

**Step 5: Remove silent scripted fallback from pilot mode**

If real analysis fails, display a retryable failure/manual-review state. Never show
a scripted report for customer data while implying AI completed the analysis.

**Step 6: Protect data**

- no CV contents in logs;
- no raw CV text retained unless required and documented;
- signed URLs expire;
- cross-company file access denied;
- delete partial uploads safely.

**Step 7: Commit**

```bash
git add src supabase tests
git commit -m "feat: persist private pilot CV analysis"
```

### Task 11: Add Trial Status UI

**Files:**

- Create: `src/components/pilot/PilotStatusBanner.tsx`
- Modify: `src/components/layout/RecruiterShell.tsx`
- Modify: dashboard, job, upload, and report pages
- Modify: `src/styles.css`
- Test: rendering/service tests

Show:

- days remaining;
- users/jobs/CVs used and remaining;
- expiry warning;
- read-only status;
- grace deadline;
- contact/convert action.

Server enforcement remains authoritative.

**Commit:**

```bash
git add src tests
git commit -m "feat: show pilot status and limits"
```

### Task 12: Add Expiry, Conversion, and Purge

**Files:**

- Create: `supabase/functions/expire-pilots/index.ts`
- Create: `supabase/functions/convert-pilot/index.ts`
- Create: `supabase/functions/purge-pilot/index.ts`
- Create: scheduled job configuration
- Modify: `src/pages/AdminPage.tsx`
- Test: expiry/conversion/purge tests

**Step 1: Expire by time and policy**

Database write policies must stop access at `expires_at` even if the scheduled job
is delayed.

**Step 2: Manual conversion**

Platform admin converts to paid only after an explicit off-platform commercial
decision. No payment code is added in this plan.

**Step 3: Purge after seven-day grace**

Order:

1. mark purging;
2. delete private Storage objects;
3. verify Storage deletion;
4. delete tenant data;
5. remove profiles;
6. delete Auth user only if they have no other company membership;
7. retain minimal non-PII platform audit;
8. mark purged.

Purge must be idempotent and disabled until preview verification passes.

**Step 4: Commit**

```bash
git add src supabase tests
git commit -m "feat: expire convert and purge pilot workspaces"
```

### Task 13: Complete Security and End-to-End Verification

**Files:**

- Create: `tests/e2e/self-serve-pilot.spec.ts`
- Create: `docs/verification/SELF_SERVE_PILOT_E2E.md`

Run:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
deno test supabase/functions/tests
supabase test db
```

Prove:

1. request submission creates a Supabase row;
2. founder notification arrives;
3. platform admin alone can view it;
4. approval creates company/profile/entitlement;
5. invitation arrives at customer;
6. password setup activates the 14-day period;
7. customer signs in to their own empty workspace;
8. customer creates their role/criteria;
9. customer uploads controlled real test CVs;
10. private files and persistent rows are company-scoped;
11. OpenRouter produces a real persisted evidence report;
12. human decision requires a reason and creates audit;
13. another company cannot read the report/file;
14. quotas reject excess use;
15. expiry blocks writes;
16. grace reads work;
17. conversion preserves data;
18. purge deletes storage and tenant data.

Record exact HTTP responses, row IDs, timestamps, and screenshots without secrets
or candidate content.

### Task 14: Deploy Carefully Through Vercel Promotion

**Step 1: Deploy backend to development/preview Supabase**

Apply reviewed migrations, secrets, functions, storage policies, and Cron jobs.

**Step 2: Build Vercel preview**

Confirm the deployment commit. Do not call preview production.

**Step 3: Run the full E2E flow on preview**

Do not promote if any customer path uses mock data, browser-only state, or scripted
fallback.

**Step 4: Promote the exact verified deployment**

```bash
vercel ls
vercel promote <verified-deployment-url> --yes
```

**Step 5: Re-run production smoke tests**

Verify both `https://hiringevidence.com` and direct routes.

**Step 6: Update infrastructure documentation**

Record:

- production commit;
- deployment URL;
- migrations;
- function versions;
- secret names;
- Cron schedules;
- storage bucket;
- E2E evidence location;
- rollback deployment.

## 7. Rollback Strategy

### Public intake

- Disable the request CTA or `request-access` feature flag if intake fails.
- Preserve all already-recorded requests.

### Notification

- Pause the worker without disabling intake.
- Retry outbox rows after provider recovery.

### Approval

- Disable approval if provisioning becomes inconsistent.
- Keep requests pending/provisioning-failed; do not mark approved manually.

### Frontend

- Promote the prior known-good Vercel deployment.
- Do not roll database state backward merely because the frontend rolls back.

### Database

- Prefer additive migrations.
- Never drop request/customer tables during rollback.
- Review all RLS down migrations before deployment.

### AI cost

- Keep the documented OpenRouter spending cap.
- Add rate/usage controls before marketing the public AI demo widely.
- The kill switch may stop analysis, but pilot mode must show failure honestly
  instead of generating a scripted report.

### Purge

- Ship disabled by default.
- Enable only after preview clock/purge tests pass.
- Stop on uncertain state; do not continue deleting blindly.

## 8. Definition of Done

Do not report completion until:

- live Vercel/Supabase truth is documented;
- plan work is based on the active repository;
- production request success means Supabase confirmed the row;
- founder email notification works and retries;
- platform authority is separate from company admin;
- approval provisions company/profile/entitlement atomically or recoverably;
- invitation and activation work on `hiringevidence.com`;
- the customer can create a real role;
- persistent private CV processing is proven;
- no silent scripted fallback exists in pilot mode;
- two-user, two-job, and 50-CV limits are server-enforced;
- 14-day expiry and seven-day read-only grace are enforced;
- conversion and purge are verified;
- company isolation is proven for database and Storage;
- AI safety and human-decision requirements remain intact;
- all required commands pass;
- Vercel preview is tested before manual production promotion;
- exact production deployment commit is recorded.

## 9. Next-Session Instructions

1. Open `/Users/sajeewa/development/recruiter applications`.
2. Read `AGENTS.md`.
3. Read `docs/INFRASTRUCTURE.md`.
4. Read `docs/plans/2026-07-27-pilot-user-lifecycle.md`.
5. Copy this plan to `docs/plans/2026-07-30-self-serve-pilot-completion.md` if it is not already there.
6. Use `superpowers:executing-plans`.
7. Start with Task 0.
8. Do not modify the older `/Users/sajeewa/Documents/New project` clone.
9. Preserve unrelated untracked files.
10. Separate local, preview, backend-deployed, production-deployed, and end-to-end-verified status in every update.

Core product rule:

**AI assists. Human decides. Evidence explains.**
