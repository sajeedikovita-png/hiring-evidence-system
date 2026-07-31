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
| 10 | Create-a-role onboarding for a brand-new company | **PENDING** | not started — see "Known gap" below |
| 11 | Founder email notification when a request arrives | **PENDING** | not started — founder must watch `/admin` |
| 12 | Apply migrations + deploy functions to live Supabase | **PENDING** — needs founder | — |
| 13 | Promote the Vercel deployment to production | **PENDING** — needs founder | — |
| 14 | End-to-end live test with a fresh test company | **PENDING** — needs founder | — |
| 15 | Enable the purge only after a preview run proves it safe | **PENDING** — needs founder | — |

---

## Can a real company test with real CVs today? No — five blockers

What would actually happen if you approved a real request **right now**, before
deploying anything from this branch:

1. **The request may never arrive.** `RequestPilotPage.tsx:51` awaits
   `saveAccessRequestToBackend(form)` and ignores the result, then always shows
   "Pilot request recorded." A rejected insert looks identical to a successful one.
2. **The first real customer becomes a platform admin.** The live `approve-request`
   still authorizes on `recruiter_profiles.role = 'admin'`, and provisioning makes each
   customer owner exactly that. They could list and approve other companies' requests.
   Fixed by migration `202607310930` + redeploying the function.
3. **Their workspace is locked.** `demo_workspace_is_writable()` returns false while
   `active_until is null`, and the only thing that sets it is the dashboard activation
   call — which is committed but **not promoted to production**. So an approved
   customer gets a workspace they cannot write to, and the 14 days never start.
4. **There is nothing to upload against.** A new company has no job and no criteria,
   and no screen creates one. `BulkUploadCandidatesPage` dead-ends on
   "Upload workspace cannot load".
5. **Uploads would not persist.** The deployed panel still runs the scripted demo
   engine into browser storage, and the private `candidate-documents` bucket does not
   exist until migration `202607310940` is applied.

**After the deploy steps below, 1–3 and 5 clear.** Blocker 4 needs either task 10 or a
hand-written SQL insert of the customer's first role and criteria.

Order to do it in: apply the three migrations → redeploy `approve-request` → promote
the Vercel deployment → insert the customer's first role/criteria → run one full
rehearsal with a company you control before inviting a real one.

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
