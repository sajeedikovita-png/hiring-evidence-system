# Decision Log

**What this is:** why each non-obvious change was made, written for whoever picks this
up next. Git says *what* changed. This says *why*, what was considered and rejected,
and what it would break to undo.

**Append to this after any non-trivial change.** Newest entry first. Never rewrite an
old entry — if a decision turns out to be wrong, add a new entry that supersedes it and
say so.

**Companion documents:**
- `docs/plans/2026-07-31-live-demo-trial-STATUS.md` — what is DONE vs PENDING right now
- `CLAUDE.md` — how the codebase is put together
- `AGENTS.md` — the product rules, several of which are enforced by a test

---

## 2026-08-02 (fourth) — Backend deployed; three orphaned Edge Functions found and deleted

**All 11 migrations are now applied to the live project** via `supabase db push`, after
the founder took a Dashboard backup. `supabase migration list --linked` shows local and
remote matching for every migration, so the history drift recorded in the earlier entry
is resolved.

**Why `db push` was safe, having looked rather than assumed:** the migration history
recorded `202607040001`, `202607051200`, `202607060001` and `202607060002` as applied, so
`db push` skipped them. That mattered because `202607051200` opens with
`drop table if exists public.access_requests cascade` — pushing it would have destroyed
every pilot request received. It did re-run `202607310900`, which had been applied by
hand and never recorded; that file is idempotent (`create table if not exists`,
`create or replace function`, `drop policy if exists` + `create policy`), and it
re-applied cleanly.

**Verified after the push:** the old five-argument, consent-free `record_candidate_upload`
is **gone** (`PGRST202`), the six-argument consent version exists, and anon now receives
`42501 permission denied` on every security-definer function it previously reached. The
two helpers used *inside* RLS policies remain anon-callable, as intended.

### The redeploy alone did not close the authority hole

`approve-request` was redeployed (version 4 → 5) to require `platform_admins`. Listing
the project's functions to confirm the version bump revealed **three Edge Functions live
with no source in this repository**, dating from 2026-07-04:
`request-access`, `approve-access-request`, `reject-access-request`.

`approve-access-request` was downloaded and read. It provisions recruiter profiles and
approves access requests, authorized by a shared `authorizeAdmin` helper that checks:

```ts
.from("recruiter_profiles").eq("user_id", user.id).eq("status", "active")
... if (!isActiveAdminProfile(profile)) throw new Error("Admin permission required");
```

**That is the old any-company-admin rule.** Since approval provisions every customer
owner as `role = 'admin'` of their own company, any onboarded customer could have called
that endpoint directly and approved or rejected other companies' access requests —
precisely the hole `202607310930` and the redeploy were meant to close. It required a
login, so it was never open to the public, but it was open to every customer.

**Deleted all three** (founder-authorized) after confirming nothing references them:
`src/` calls only `approve-request`, and no repo function imports the `_shared` module
they depend on. Verified afterwards: all three return 404; `approve-request`,
`analyze-resume`, `invite-user` and `ping` still respond; `access_requests` is intact.

**The lesson worth carrying:** a security fix in the repository proves nothing about the
live project. The repo had one approval path; the project had three. **Whenever an
authorization rule changes, list what is actually deployed** — `supabase functions list`,
and compare it against `supabase/functions/`. Orphans do not appear in any diff.

---

## 2026-08-02 (third) — First-role onboarding, and the request form stops lying

### `/jobs/new` — a company can set up its own first role

**Migration:** `202608020940_first_job_onboarding.sql`
**UI:** `src/pages/CreateJobPage.tsx`, `src/services/jobSetupService.ts`

**Why:** a newly provisioned company had no job and no criteria and no screen to make
one. Uploads have nothing to analyse against without them, so a real customer signed in
and stopped — and the founder was inserting the first role by hand in SQL. This was the
last remaining blocker that deploying alone would not have fixed.

**The company is derived from `auth.uid()`, never accepted from the browser.** There is
no company parameter to tamper with.

**A user in two workspaces is refused, not guessed at.** `create_job_with_criteria`
raises `AMBIGUOUS_WORKSPACE` when `current_company_ids()` returns more than one row.
Filing a role under the wrong company silently would be worse than an error.

**Criteria are capped at 12 to match the analyzer's own limit.** Otherwise a customer
could define 20 criteria and have the evidence analysis quietly truncate them, with no
sign that most of what they wrote was ignored.

**At least one criterion must be `required`.** A role where everything is "preferred"
produces an evidence matrix that asks nothing of a candidate.

**Empty description falls back to the label.** `job_requirements.description` is
`NOT NULL`, and description quality drives analysis quality — but it should not block a
first role. Blank rows in the starter form are dropped rather than rejected.

**Validation is duplicated on purpose** — in `jobSetupService` for a usable form, and
again in Postgres because that is the only place a rule is actually enforced.

**Known limitation, not introduced here:** `supabaseHiringRepository.getJobRowForRoute`
ignores the slug and takes the company's *first* job (`.limit(1)`). With the two-job
quota and one pilot role this works, but a company with two roles cannot reach the
second through the UI. Worth fixing before any company runs two roles at once.

### The pilot request form no longer reports success it cannot confirm

**Files:** `src/pages/RequestPilotPage.tsx`, `src/services/accessRequestService.ts`

The page called `saveAccessRequestToBackend(form)`, **ignored the returned result**, and
always rendered "Pilot request recorded." A request rejected by Supabase looked
identical to one that succeeded.

**Why this mattered more than it looks:** with approvals handled one at a time by hand,
`/admin` is the only place demand becomes visible. A silently dropped request means a
prospect waits for a reply that will never come and the founder never learns they asked.

**The browser copy is now written only after the backend confirms.** It was previously
written first and described as a "fallback" — which it never was, since nothing ever
read it back. It is a diagnostic, and it must not accumulate phantom requests that were
never saved.

**Failures keep everything typed.** Re-entering six fields after a network blip is how
you lose the prospect a second time.

**`saveAccessRequestToBackend` now takes an injectable `fetchFn` and `config`** purely
so the tests can prove the rule: success on 201, failure on 401, on 500, on a thrown
network error, and when no backend is configured. The failure copy is asserted never to
contain "recorded", "received", or "submitted successfully".

---

## 2026-08-02 (later) — Consent timestamps; two security items deferred on purpose

**Scope given:** close the consent-timestamp gap only. Virus scanning and AI usage/cost
logging were **explicitly deferred by the founder** to a later phase — they are not
oversights, and they are listed under "Remaining security-readiness items" below and in
the status board.

### Consent is now timestamped, and refused in the database

`docs/SECURITY_PRIVACY_RULES.md`: *"Consent must be stored with timestamp."* The upload
path set `consent_status = 'recorded'` with no time attached, so the record could not
answer "confirmed when?".

**Migration:** `202608020930_upload_consent_timestamp.sql`.

**Why the attestation is passed explicitly rather than inferred from the UI:** the panel
already disabled the file input until the checkbox was ticked, but that is a
convenience, not a control — anyone can call the RPC directly. `record_candidate_upload`
now takes `p_consent_confirmed` and raises `CONSENT_REQUIRED` **before** creating any
row or storage object, so a refusal leaves nothing behind.

**Why the function was dropped and recreated rather than replaced:** adding a parameter
changes the signature, and `create or replace` with a different argument list creates an
*overload* — the old consent-free five-argument function would have remained callable,
which is exactly the bypass this closes. The new signature also inherits no grants, so
it repeats the revoke/grant from `202608020900`; without that it would have defaulted
back to `PUBLIC`.

**The constraint is `NOT VALID` on purpose.** Seeded rows predate the column, so
validating history would fail the migration. `NOT VALID` still binds every new and
updated row, which is what matters going forward.

**The timestamp is written twice** — on `candidate_applications.consent_recorded_at` and
into the audit entry's `metadata`. The evidence of consent should not depend on the
application row surviving.

**Honest scope limit, do not let this be overstated:** this records the **recruiter's
attestation** that they have lawful authority to upload the CV. It is **not the
candidate's own consent**, which would require a candidate-facing application flow that
does not exist. Product copy must keep that distinction.

**Test note:** this suite transpiles to CJS, so top-level `await` fails to build. The
async check runs inside a function whose rejection exits non-zero and skips the success
line. If you add async assertions elsewhere, follow the same shape.

### Remaining security-readiness items (deferred, not forgotten)

| Item | Rule it satisfies | Status |
|---|---|---|
| Virus scanning of uploads | `SECURITY_PRIVACY_RULES.md` — "Use virus scanning if available" | **Deferred** by decision, 2026-08-02 |
| AI usage logging: module, model, tokens, estimated cost, timestamp | `SECURITY_PRIVACY_RULES.md` — "AI Logging" | **Deferred** by decision, 2026-08-02 |
| Candidate-facing consent capture | "Candidate must consent… stored with timestamp" | Not built; recruiter attestation only |
| Configurable data retention | "Add configurable data retention later" | Not built (the purge is fixed at 14 + 7 days) |

The AI logging item is worth doing before the public demo is marketed widely: without
token and cost records there is no way to attribute an OpenRouter bill to a company, a
demo visitor, or an abuser. The spending cap remains the only brake.

---

## 2026-08-02 — Audit of the live backend; anon could reach the provisioning function

**Why this session happened:** asked to check what a Codex session had done since
2026-07-31.

**First finding: no new work exists.** Both branches sit exactly where 2026-07-31 left
them, `origin` is *behind* local, there are no new worktrees or branches, and the only
files touched since are the two docs. `/Users/sajeewa/Documents/New project` — the older
clone named in the plan — is an empty directory. The Supabase CLI link files and the
Vercel config have not been touched since early July. Whatever was done, it was not done
in this repository from this machine.

**So the live backend was probed directly**, since work applied through the Supabase web
SQL editor leaves no local trace. Results — read-only probes with the public anon key:

| Live now | Not live |
|---|---|
| `demo_entitlements`, `activate_demo_trial`, `provision_demo_workspace`, `demo_workspace_is_writable` (migration `202607310900`) | `platform_admins` (`202607310930`) |
| Edge functions `ping`, `analyze-resume`, `approve-request`, `invite-user` | `record_candidate_upload`, `record_evidence_report` (`202607310940`) |
| | `convert_demo_workspace`, `demo_workspace_closures` (`202607310950`) |
| | Edge function `purge-expired-demos` |

This **confirms the prior handoff's claim** that the trial backend is deployed, and
confirms nothing from 2026-07-31 has been.

**A note on method, because it nearly produced a wrong answer:** the first probe posted
`{}` to each function and read `PGRST202` as "does not exist". PostgREST returns that
same code when a function exists but no overload matches the arguments given, so every
function looked missing — including ones that are demonstrably live. Re-probing with
correct parameter names gave the real answer. **Do not read `PGRST202` as "missing"
without matching the signature.**

### The finding worth acting on

`provision_demo_workspace` executed for a caller holding **only the anon key with no
user session**, returning its own business error rather than a permission error. Same
for `activate_demo_trial`. Postgres grants EXECUTE on new functions to `PUBLIC` by
default and none of the migrations revoked it.

These are `SECURITY DEFINER` functions — they bypass RLS by design. Reachable by anon,
`provision_demo_workspace` would let anyone who learned a pending access request's UUID
approve it themselves: create a company, attach an arbitrary Auth user to it as admin,
and mark the request approved, never passing through `/admin`.

**What stops it today is that request and company ids are unguessable UUIDs. That is
obscurity, not authorization**, and it degrades the moment an id leaks through a log,
screenshot, or support conversation.

**Fix:** `202608020900_restrict_security_definer_functions.sql` — revoke from
`PUBLIC`/`anon`, grant narrowly (`service_role` for provisioning and purging,
`authenticated` for the rest).

**Two helpers are deliberately left callable by anon:** `demo_workspace_is_writable` and
`demo_folder_is_writable`. Both are evaluated *inside* RLS and Storage policies as the
querying role, so revoking EXECUTE would turn an anonymous query into "permission denied
for function" instead of an empty result. Both are read-only booleans.

**This migration must be applied to the live project even if nothing else from the
branch is** — it is the only entry here that fixes something already deployed.

---

## 2026-07-31 — Real customer workspaces: storage, authority, lifecycle

**Session context:** a previous session (in Codex, because Claude was unavailable) built
the 14-day trial backend and left it **uncommitted** in a git worktree. This session
found it, committed it, and built the remaining pieces needed for an approved company to
process real CVs.

**Where the code is:** branch `feature/live-demo-trial`, worktree
`.worktrees/live-demo-trial`. Commits `dd8e057`, `98448cb`, `28216e6`, `71d882b`,
`ec533c8`. **Nothing from this branch is deployed.**

**Why a separate branch and not `codex/demo-test-lab`:** `codex/demo-test-lab` is what
Vercel builds from. Keeping unproven backend changes off it means a routine promotion
can't accidentally ship a half-finished trial lifecycle.

---

### 1. The prior session's work was committed before anything else

**Why:** it existed only as uncommitted files inside `.worktrees/live-demo-trial`. A
`git status` in the main directory does not show it, so it was one `rm -rf` or one
confused cleanup away from being lost, and it represented the whole trial backend.

Its test (`tests/demo-trial-lifecycle.test.ts`) existed but was **not** in the `test`
script in `package.json`, so `npm test` never ran it. Added it. In this repo a test file
only runs if it is named in that chain — there is no test runner doing discovery.

---

### 2. Platform authority was split from company authority

**File:** `supabase/migrations/202607310930_platform_admin_authority.sql`

**The problem this fixes — this was a live security hole, not a hypothetical.** The
previous session's approval flow provisions each customer owner as a
`recruiter_profiles` row with `role = 'admin'` for their own company. The existing
`is_current_user_admin()` helper returned true for **any** active admin profile in any
company. Since the `/admin` page's RLS policies and the `approve-request` function both
authorize through that helper, the first real customer would have been able to list and
approve **other companies'** access requests.

**The fix:** a `platform_admins` table keyed to a specific Auth user UUID. The helper
now checks that table. The policies did not have to change — redefining the helper moved
all of them at once, which is why it was done that way.

**The founder's UUID (`77560c26-93bc-4b8e-a13b-29ebb14b1d3c`)** was taken from
`202607060001_admin_workspace.sql`, not invented. Confirm it against Supabase → Auth →
Users before relying on it.

**Considered and rejected:** checking an email string instead of a UUID. Emails change
and can be spoofed at the profile level; the Auth UUID is the only stable identity.

**If you undo this,** every customer becomes a platform administrator. Do not.

---

### 3. Customer CVs are stored privately, and the records persist

**File:** `supabase/migrations/202607310940_pilot_candidate_storage.sql`
**Client:** `src/services/pilotUploadService.ts`

**Why:** the login-free demo keeps uploaded reports in browser storage. That is fine for
a sales demo and useless for a customer — refresh the page and their work is gone, and a
colleague in the same company can't see any of it. A pilot has to prove a *product*, not
a screen recording.

**The order of operations is deliberate: database first, then the file upload.** The
`record_candidate_upload` RPC creates the candidate/application/document rows and
*returns the storage key*. The browser never chooses where a customer's file lands. That
prevents a malicious or buggy client from writing into another company's folder, and it
guarantees every stored file has a row pointing at it.

**Object key:** `<company>/<job>/<application>/<document>.<ext>`. The first segment is
the tenant boundary that the storage policies check. **No candidate name or email is
ever in the key** — object keys leak through logs and URLs.

**Quotas (2 users, 2 jobs, 50 CVs) are enforced in Postgres,** by trigger and inside the
RPC, not in the browser. A client-side count is advisory; anyone can call the API
directly. `pg_advisory_xact_lock` per company serializes the check so two simultaneous
uploads can't both pass a count of 49 and land at 51.

**The cast in the storage policies is defensive on purpose.**
`demo_folder_is_writable(text)` swallows a bad UUID cast and returns false, because
policy predicates can be evaluated in any order — a malformed object key must be denied,
not raise an error.

---

### 4. A customer upload never falls back to a scripted report

**Files:** `src/services/pilotUploadService.ts`, guard in `tests/quality-gate.test.ts`

**Why this is the single most important rule in that file:** the demo path
(`resumeAnalysis.ts`) deliberately falls back to a scripted preview when the model call
fails, so a sales demo never breaks on stage. Doing that for a *customer* would mean
showing them invented findings about a real person's CV while implying the model read
it. That is the kind of thing that ends a company.

So in the pilot path every failure marks the upload for manual review and reports the
failure honestly. To keep this structural rather than a matter of care, the repo quality
gate now fails the build if `pilotUploadService.ts` imports `demoUploadEngine`,
`mockHiringData`, or `mockSelectors`.

**Consent** is required before a pilot upload: the file input is disabled until the
authority/privacy statement is confirmed. Real candidate CVs are other people's personal
data.

---

### 5. Ending a demo: convert, or delete

**File:** `supabase/migrations/202607310950_demo_conversion_and_purge.sql`
**Function:** `supabase/functions/purge-expired-demos/index.ts`

**Storage objects are deleted and then re-listed to verify, before any database rows are
touched.** If deletion is uncertain the purge stops for that workspace rather than
continuing. Doing it the other way round would orphan real candidate files with nothing
left pointing at them — undiscoverable and undeletable.

**Deleting the `companies` row cascades** to jobs, candidates, applications, documents,
reports, evidence, decisions and audit rows, because every tenant table declares
`on delete cascade`. This is why the purge function is short: it is not a list of
deletes that could drift out of sync with the schema.

**Auth users are deliberately not deleted.** A person may belong to another workspace.
Deleting the row that represents someone's login because one of their demos ended is not
recoverable.

**The purge ships disabled** (`PURGE_ENABLED` unset) and reports what it *would* delete.
This follows the rollback rule in the plan: a destructive scheduled job earns its
permissions by first proving, on real data, that it selects the right rows.

**Conversion is a manual flag** set by the platform administrator after an off-platform
commercial decision. Converted workspaces have `purge_at` cleared and are excluded from
expiry forever. No payment code was added — that is explicitly out of scope in
`AGENTS.md`.

---

### 6. `npm audit` — four fixed, two left open on purpose

`npm audit fix` (no `--force`, lockfile only) cleared babel, esbuild, postcss and vite.

**Two high advisories remain and were deliberately not fixed:** `react-router`
7.12–8.2, *RSC Mode CSRF Bypass*. The only offered remedy is downgrading to
`react-router-dom@7.11.0`. This app is a client-only SPA using `BrowserRouter` and
`MemoryRouter`; it has no RSC mode, so the advisory does not describe a code path that
exists here.

**This is an open decision, not an oversight.** Until it's resolved,
`npm audit --audit-level=high` exits non-zero and CI stays red — which also means the
four-command gate in `AGENTS.md` cannot fully pass. Either pin the downgrade or record
an accepted-risk exception. It was left to the founder because silently downgrading the
router the production site runs on is not a call an agent should make alone.

---

### 7. The status board moved to the default branch

`docs/plans/2026-07-31-live-demo-trial-STATUS.md` was created on
`feature/live-demo-trial`, where an agent opening the repo in the main directory would
never see it. It now lives on `codex/demo-test-lab` and was removed from the feature
branch so there is exactly one copy.

---

### 8. What was deliberately NOT built, and why

- **A create-a-role screen.** A brand-new company has no job and no criteria and no way
  to make one, so a real customer cannot self-serve. Deferred because the founder is
  approving companies one at a time; the SQL runbook in the status board covers it.
  `docs/PROJECT_STATE.md` says go-to-market before new features. Build this when a
  second or third pilot makes the SQL tedious.
- **Founder email notification.** Still means watching `/admin` manually.
- **Honest request intake.** `src/pages/RequestPilotPage.tsx:51` awaits
  `saveAccessRequestToBackend(form)`, **ignores the result**, and always shows "Pilot
  request recorded". A request that fails to insert is invisible. This matters more now
  that manual approval is the only way in — you would never learn that someone asked.
- **Per-IP rate limiting** on the public demo's AI calls. The OpenRouter spending cap is
  still the only brake (`docs/INFRASTRUCTURE.md` §5).

---

### 9. `CLAUDE.md` was created

There was no repo-level guide. The parent workspace file at
`/Users/sajeewa/development/CLAUDE.md` describes *other* projects and is actively
misleading here — it implies Tailwind and shadcn/ui, which this repo does not use.
