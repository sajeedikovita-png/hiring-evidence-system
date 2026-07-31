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
