# Live Demo Trial — Task Status Board

**Purpose:** one file that says exactly what is DONE and what is PENDING, so any new
session (or a new chat) can pick this up without re-reading the whole history.

**Keep this file updated.** Mark each task DONE or PENDING the moment it changes.

**Where the work lives:** git worktree `.worktrees/live-demo-trial`, branch
`feature/live-demo-trial`, branched from `codex/demo-test-lab` at `18b9496`.
Commits so far: `dd8e057`, `98448cb`.

**Status vocabulary** (from the plan — never blur these):
`local` = in the working tree · `committed` = in git · `backend deployed` = applied to
live Supabase · `production deployed` = promoted on Vercel · `end-to-end verified` =
proven with a real run.

---

## Task board

| # | Task | Status | Where |
|---|---|---|---|
| 1 | 14-day trial schema, activation RPC, split read/write RLS | **DONE** — committed + backend deployed | `supabase/migrations/202607310900_live_demo_trials.sql` |
| 2 | `approve-request` provisions company + profile + entitlement atomically | **DONE** — committed + backend deployed | `supabase/functions/approve-request/index.ts` |
| 3 | Dashboard activates the trial and shows the countdown banner | **DONE** — committed, **NOT production deployed** | `src/pages/DashboardPage.tsx`, `src/services/demoTrial*.ts` |
| 4 | Trial + pilot tests wired into `npm test` | **DONE** — committed | `package.json`, `tests/demo-trial-lifecycle.test.ts`, `tests/pilot-workspace.test.ts` |
| 5 | Separate platform authority from company admins | **DONE** — committed, **NOT backend deployed** | `202607310930_platform_admin_authority.sql`, `approve-request` |
| 6 | Private CV storage, persistent records, server-enforced quotas | **DONE** — committed, **NOT backend deployed** | `202607310940_pilot_candidate_storage.sql` |
| 7 | Client upload path that persists instead of using browser storage | **DONE** — committed, **NOT production deployed** | `src/services/pilotUploadService.ts`, `BulkUploadCandidatesPanel.tsx` |
| 8 | Admin conversion path (mark a company as continuing) | **DONE** — committed, **NOT backend deployed** | `202607310950_demo_conversion_and_purge.sql`, `AdminPage.tsx` |
| 9 | Scheduled purge of expired demo workspaces | **DONE** — committed, ships disabled, **NOT deployed** | `supabase/functions/purge-expired-demos/index.ts` |
| 10 | Create-a-role onboarding for a brand-new company | **DONE** — committed, **NOT deployed** | `202608020940_first_job_onboarding.sql`, `src/pages/CreateJobPage.tsx`, `jobSetupService.ts` |
| 11 | Founder email notification when a request arrives | **PENDING** | not started — founder must watch `/admin` |
| 21 | Public request form reports success only after a confirmed save | **DONE** — committed, **NOT deployed** | `RequestPilotPage.tsx`, `accessRequestService.ts` |
| 12 | Apply migrations + deploy functions to live Supabase | **PENDING** — needs founder | — |
| 13 | Promote the Vercel deployment to production | **PENDING** — needs founder | — |
| 14 | End-to-end live test with a fresh test company | **PENDING** — needs founder | — |
| 15 | Enable the purge only after a preview run proves it safe | **PENDING** — needs founder | — |
| 16 | Revoke anon access to the security-definer functions | **DONE** — committed, **NOT backend deployed — apply this one first** | `202608020900_restrict_security_definer_functions.sql` |
| 17 | Consent recorded with a timestamp, enforced in Postgres | **DONE** — committed, **NOT backend deployed** | `202608020930_upload_consent_timestamp.sql`, `pilotUploadService.ts` |
| 18 | Virus scanning of uploads | **DEFERRED** by decision 2026-08-02 — later phase | — |
| 19 | AI usage/cost logging (module, model, tokens, cost) | **DEFERRED** by decision 2026-08-02 — later phase | — |
| 20 | Candidate-facing consent capture (not recruiter attestation) | **PENDING** — no candidate flow exists | — |

---

## Verified live backend state (probed 2026-08-02, read-only)

| Live in Supabase now | Not deployed |
|---|---|
| `demo_entitlements` table | `platform_admins` (`…0930`) |
| `activate_demo_trial`, `provision_demo_workspace`, `demo_workspace_is_writable` | `record_candidate_upload`, `record_evidence_report` (`…0940`) |
| Edge functions: `ping`, `analyze-resume`, `approve-request`, `invite-user` | `convert_demo_workspace`, `demo_workspace_closures` (`…0950`) |
| | Edge function `purge-expired-demos` |
| | Function grant lockdown (`…20900`) |

**Apply `202608020900` first.** It is the only migration that fixes something already
live: `provision_demo_workspace` and `activate_demo_trial` are currently callable by an
unauthenticated caller holding just the public anon key. See `docs/DECISION_LOG.md`,
entry 2026-08-02.

### Every migration, in required execution order

Run in filename order. The order is not cosmetic: `202608020930` **drops** the function
that `202607310940` creates and that `202608020900` grants on, so running them out of
order fails outright.

| # | Migration file | Deployment status | What it does |
|---|---|---|---|
| 1 | `202607040001_existing_access_requests.sql` | **Already deployed** | Original access-requests table |
| 2 | `202607051200_access_requests_public_submit.sql` | **Already deployed** | Public submit policy, `is_current_user_admin()` |
| 3 | `202607060001_admin_workspace.sql` | **Already deployed** | Founder company + admin profile |
| 4 | `202607060002_ensure_admin_role.sql` | **Already deployed** | Ensures the founder profile has the admin role |
| 5 | `202607310900_live_demo_trials.sql` | **Already deployed** | `demo_entitlements`, `activate_demo_trial`, `provision_demo_workspace`, split read/write RLS |
| 6 | `202607310930_platform_admin_authority.sql` | **Pending deployment** | `platform_admins`; stops each customer owner being a platform admin |
| 7 | `202607310940_pilot_candidate_storage.sql` | **Pending deployment** | Private `candidate-documents` bucket, storage policies, upload/report RPCs, quotas |
| 8 | `202607310950_demo_conversion_and_purge.sql` | **Pending deployment** | Conversion, closures, purge functions |
| 9 | `202608020900_restrict_security_definer_functions.sql` | **Pending deployment** | Revokes anon EXECUTE on the security-definer functions |
| 10 | `202608020930_upload_consent_timestamp.sql` | **Pending deployment** | `consent_recorded_at`; refuses uploads without a confirmed attestation |
| 11 | `202608020940_first_job_onboarding.sql` | **Pending deployment** | `create_job_with_criteria` for first-role onboarding |

Verified live on 2026-08-02: items 1–5 are present in the database; 6–11 are not.

**Edge functions**

| Function | Status |
|---|---|
| `ping`, `analyze-resume`, `invite-user` | **Already deployed** |
| `approve-request` | **Deployed, but an older version** — needs redeploy for platform authority |
| `purge-expired-demos` | **Pending deployment** — leave `PURGE_ENABLED` unset |

### Safe order before the first company uploads a real CV

1. Apply migrations 6 → 11 above, in that order.
2. **Verify in Supabase:** bucket `candidate-documents` exists and is **not public**;
   `platform_admins` has exactly one row (yours); and
   `select proname, proacl from pg_proc where proname = 'provision_demo_workspace'`
   shows no `anon` grant.
3. Redeploy `approve-request`.
4. Promote the Vercel deployment — pushing only creates a preview.
5. **Rehearse end to end with a company you control:** request → approve → invite →
   set password → dashboard → **create the first role at `/jobs/new`** → upload two or
   three CVs → record a decision.
6. Check the audit trail:
   `select action, metadata from public.audit_log_entries order by created_at desc`
   should show `job_role_created` and `candidate_upload_recorded` carrying a
   `consent_recorded_at` value.
7. Only then invite a real company.

Do **not** set `PURGE_ENABLED` during any of this.

---

## Can a real company test with real CVs today? No — five blockers

What would actually happen if you approved a real request **right now**, before
deploying anything from this branch:

1. ~~**The request may never arrive.**~~ **Fixed locally 2026-08-02, pending deploy.**
   The form now reports success only after the backend confirms the save, keeps the
   visitor's details on failure, and writes the browser copy only afterwards.
2. **The first real customer becomes a platform admin.** The live `approve-request`
   still authorizes on `recruiter_profiles.role = 'admin'`, and provisioning makes each
   customer owner exactly that. They could list and approve other companies' requests.
   Fixed by migration `202607310930` + redeploying the function.
3. **Their workspace is locked.** `demo_workspace_is_writable()` returns false while
   `active_until is null`, and the only thing that sets it is the dashboard activation
   call — which is committed but **not promoted to production**. So an approved
   customer gets a workspace they cannot write to, and the 14 days never start.
4. ~~**There is nothing to upload against.**~~ **Fixed locally 2026-08-02, pending
   deploy.** `/jobs/new` lets the customer create their first role and criteria, and the
   dashboard prompts for it when a real workspace has none. The SQL runbook below is now
   a fallback, not the only path.
5. **Uploads would not persist.** The deployed panel still runs the scripted demo
   engine into browser storage, and the private `candidate-documents` bucket does not
   exist until migration `202607310940` is applied.

**All five now clear on deployment** — 1 and 4 are fixed in code (2026-08-02) and 2, 3
and 5 were always deploy-gated. Nothing further needs building before a first pilot;
what remains is applying migrations 6–11, redeploying `approve-request`, promoting
Vercel, and rehearsing end to end.

---

## Manual onboarding runbook (approving one company at a time)

While task 10 does not exist, each approved company needs its first role and criteria
inserted by hand. Run this in the Supabase SQL editor **after** approving them in
`/admin`. Change only the values in the first block.

```sql
-- 1. Who you are onboarding, and the role they want to review candidates for.
with input as (
  select
    'ACME Recruiting'::text        as company_name,   -- exactly as it appears in /admin
    'Frontend Developer'::text     as job_title,
    'Engineering'::text            as department,
    'Singapore'::text              as location,
    'Full time'::text              as employment_type
),
target as (
  select c.id as company_id, i.*
  from input i
  join public.companies c on c.name = i.company_name
),
new_job as (
  insert into public.job_roles (company_id, title, department, location, employment_type, status)
  select company_id, job_title, department, location, employment_type, 'open' from target
  returning id, company_id
)
-- 2. The criteria the evidence report is built against. Edit freely; keep them
--    job-related and observable. 3-8 works well; the analyzer caps at 12.
insert into public.job_requirements (company_id, job_id, label, description, priority, sort_order)
select
  new_job.company_id, new_job.id, criterion.label, criterion.description,
  criterion.priority, criterion.sort_order
from new_job
cross join (values
  ('React in production',     'Has shipped and maintained React applications in a work setting.', 'required',  1),
  ('TypeScript',              'Uses TypeScript day to day, not only JavaScript.',                 'required',  2),
  ('Testing',                 'Writes automated tests for the code they ship.',                   'required',  3),
  ('Accessibility',           'Has built interfaces that meet accessibility requirements.',       'preferred', 4)
) as criterion(label, description, priority, sort_order);
```

**Then check it worked** — this should return one row per criterion:

```sql
select c.name as company, j.title, j.status, r.label, r.priority
from public.job_requirements r
join public.job_roles j on j.id = r.job_id
join public.companies c on c.id = j.company_id
where c.name = 'ACME Recruiting'
order by r.sort_order;
```

**And confirm their trial is healthy** after they first open the dashboard:

```sql
select c.name, e.state, e.activated_at, e.active_until, e.purge_at
from public.demo_entitlements e
join public.companies c on c.id = e.company_id
order by e.created_at desc;
```

`state` should be `active` with dates filled in. If it is still `pending_activation`
after they have signed in, the dashboard activation code is not on production yet —
their workspace is read-only until you promote it.

**Two things to know about this runbook:**

- The demo quota trigger allows **2 roles per company**. A third insert raises
  `PILOT_JOB_LIMIT`. Raise it per company with
  `update public.demo_entitlements set max_jobs = 4 where company_id = '…';`
- `companies.name` is not unique. If you ever approve two companies with the same
  name, look the company id up manually instead of joining on the name.

Because you are approving one at a time, blocker 1 matters **more**, not less: a
request that silently fails to insert never appears in `/admin`, so you would never
know someone asked. Until that is fixed, confirm with anyone you are expecting.

---

## Known gap that blocks a real customer (task 10)

A newly provisioned company has **no jobs and no criteria**, and there is no screen to
create one. Uploading requires a role with criteria, so a real customer would land on
an empty workspace and stop. The upload path already fails honestly with
`Add the required criteria for this role before uploading resumes.`

Until task 10 exists, a pilot company has to have its first role and criteria inserted
by hand in Supabase.

---

## Why task 5 mattered (read before deploying)

Task 2 gives every provisioned customer owner a company profile with
`role = 'admin'`. The old `is_current_user_admin()` returned true for **any** active
admin profile, so every provisioned customer would have been able to list and approve
other companies' access requests. Task 5 re-points that helper at a `platform_admins`
table keyed to the founder's Auth UUID (`77560c26-…`, from
`202607060001_admin_workspace.sql`).

**Deploy `202607310930` before, or together with, approving any real customer.**

---

## What the founder has to do (nothing here is automated)

1. **Apply the migrations** in the Supabase SQL editor, in filename order:
   `202607310930_platform_admin_authority.sql`,
   `202607310940_pilot_candidate_storage.sql`,
   `202607310950_demo_conversion_and_purge.sql`.
   `202607310900_live_demo_trials.sql` is already applied.
2. **Confirm the private bucket exists**: Storage → `candidate-documents`, **not**
   public, 10 MB limit, PDF/DOCX only. The migration creates it.
3. **Redeploy** `approve-request` (it now requires platform authority) and **deploy**
   `purge-expired-demos`.
4. **Set the purge secrets**: `PURGE_JOB_SECRET` (any long random string).
   Leave `PURGE_ENABLED` unset — the job then only reports what it would delete.
5. **Schedule the purge** once a day (Supabase → Integrations → Cron), passing the
   `x-purge-secret` header. The header value must match `PURGE_JOB_SECRET`.
6. **Promote the Vercel deployment.** Pushing the branch only creates a preview —
   see `docs/INFRASTRUCTURE.md` §3.

---

## Verification gate

```bash
npm run typecheck && npm test && npm run build && npm audit --audit-level=high
```

As of `98448cb`: typecheck **passes**, 6 test suites **pass**, build **passes**.

`npm audit` reports **2 high advisories that pre-date this work** and are not fixed:
`react-router` 7.12–8.2 *RSC Mode CSRF Bypass*. The only offered fix is a downgrade to
`react-router-dom@7.11.0`. This app is a client-only SPA using `BrowserRouter` and
`MemoryRouter` with no RSC mode, so the advisory does not describe a path that exists
here. **Decide deliberately whether to pin the downgrade** — until then the audit
command exits non-zero and CI stays red. `npm audit fix` already cleared the other
four (babel, esbuild, postcss, vite) in `98448cb`.

---

## What is deliberately NOT built

- Payments. Conversion is a manual flag after an off-platform decision.
- Auth-user deletion during purge — a person may belong to another workspace.
- Per-IP rate limiting on the public demo's AI calls. The OpenRouter spending cap is
  still the only brake (`docs/INFRASTRUCTURE.md` §5).
- Founder email notification (task 11).

---

## Related documents

- `docs/plans/2026-07-31-live-demo-trial-design.md` — the approved lifecycle
- `docs/plans/2026-07-31-live-demo-trial-handoff.md` — the original handoff this board replaces
- `docs/plans/2026-07-30-hiring-evidence-main-project-demo-access-plan.md` — the full 14-task plan
- `docs/INFRASTRUCTURE.md` — accounts, deploys, costs
- `CLAUDE.md` — repo architecture and the rules a new session must follow
