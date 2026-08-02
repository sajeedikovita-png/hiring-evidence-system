# Deployment and Rehearsal Runbook — first real company

**Written 2026-08-02. Nothing in this file has been executed.** Every step is performed
by the founder.

**What this gets you:** the live-trial backend deployed, and one *test* company taken
end to end — request, approval, invitation, first role, a test CV upload, and proof that
another company cannot see any of it. Only after that should a real company be invited.

**Read before starting:** `docs/plans/2026-07-31-live-demo-trial-STATUS.md` (what is
already deployed) and `docs/DECISION_LOG.md` (why each change exists).

---

## Ground rules for this whole runbook

**Do not enable at any point:**

| Must stay off | Why |
|---|---|
| `PURGE_ENABLED` | The purge deletes company data. It stays reporting-only until a scheduled dry run has shown it selecting the right rows. |
| The purge Cron schedule | Deploy the function, do not schedule it yet. |
| Manual calls to `purge_demo_workspace` | Never run it by hand "to test". |
| Payments of any kind | Out of scope; conversion is a manual flag. |
| Real candidate CVs | Rehearse with your own CV or an invented one. A rehearsal is not a lawful basis to process a real person's data. |
| Invitations to real companies | Not until step 6 has fully passed. |

**Stop rule:** if any step's verification does not match what is written here, **stop and
do not continue to the next step.** A half-applied backend is recoverable; a real
customer on a half-applied backend is not.

**Rollback:** the frontend rolls back with `vercel promote <previous-deployment-url>
--yes`. Database migrations are additive and are not rolled back — if one fails, fix
forward and re-run it.

---

## Step 0 — Get the code onto the branch Vercel builds ✅ DONE 2026-08-02

**Completed.** `feature/live-demo-trial` was merged into `codex/demo-test-lab` (merge
commit `496df35`, no conflicts) and pushed to `origin` (`09274c3..496df35`). The full
gate passed on the merged result: typecheck clean, 7 test suites pass, build succeeds.
`npm audit --audit-level=high` still exits 1 on the two known `react-router` advisories.

**This created a Vercel Preview only. Production is unchanged** until step 5.

*Original instructions kept below for reference.*

**Where:** your terminal, in `/Users/sajeewa/development/recruiter applications`.

All of this work lives on `feature/live-demo-trial`. Vercel builds from
`codex/demo-test-lab` (`docs/INFRASTRUCTURE.md` §3), so **without this step the
promoted site will not contain the new upload path or `/jobs/new`.**

```bash
git checkout codex/demo-test-lab
git merge feature/live-demo-trial
npm run typecheck && npm test && npm run build
git push origin codex/demo-test-lab
```

**Success looks like:** the merge completes with no conflicts, typecheck and all 7 test
suites pass, the build succeeds, and the push creates a **Preview** deployment in Vercel.

**Verify:** `git log --oneline -3` shows the merge, and
`ls supabase/migrations/` lists all six pending migration files.

**Expected and acceptable:** `npm audit --audit-level=high` exits non-zero — two
pre-existing `react-router` advisories. CI will be red for this reason. It does not block
a Vercel deploy. See `docs/DECISION_LOG.md`, entry 6 of 2026-07-31.

**Must not be enabled yet:** nothing is live from this step. A push creates a Preview
only — it does **not** change the public site.

**Stop if:** the merge conflicts, or any test fails.

---

## Step 1 — Apply the six migrations

**Where:** Supabase Dashboard → project `vzfurafvkoqwmfkzcwjj` → **SQL Editor**.

Open each file from `supabase/migrations/`, paste its **entire** contents into a new
query, and run it. **One file at a time, in exactly this order:**

| Order | File | What it does |
|---|---|---|
| 1 | `202607310930_platform_admin_authority.sql` | `platform_admins`; stops each customer owner being a platform admin |
| 2 | `202607310940_pilot_candidate_storage.sql` | Private bucket, storage policies, upload/report RPCs, quotas |
| 3 | `202607310950_demo_conversion_and_purge.sql` | Conversion, closure records, purge functions |
| 4 | `202608020900_restrict_security_definer_functions.sql` | Revokes anon EXECUTE on the security-definer functions |
| 5 | `202608020930_upload_consent_timestamp.sql` | `consent_recorded_at`; refuses uploads without a confirmed attestation |
| 6 | `202608020940_first_job_onboarding.sql` | `create_job_with_criteria` for first-role onboarding |

**The order is not cosmetic.** File 5 *drops* a function that file 2 creates and file 4
grants on. Running them out of order fails outright.

**Success looks like:** each run reports "Success. No rows returned" (or similar). No
error output.

**Verify** — run this after all six; every row must say `deployed`:

```sql
select 'platform_admins' as object,
       case when to_regclass('public.platform_admins') is not null
            then 'deployed' else 'MISSING' end as status
union all
select 'demo_workspace_closures',
       case when to_regclass('public.demo_workspace_closures') is not null
            then 'deployed' else 'MISSING' end
union all
select 'candidate_applications.consent_recorded_at',
       case when exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='candidate_applications'
           and column_name='consent_recorded_at')
       then 'deployed' else 'MISSING' end
union all
select p.proname,
       case when p.oid is not null then 'deployed' else 'MISSING' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('record_candidate_upload','record_evidence_report',
                    'create_job_with_criteria','convert_demo_workspace',
                    'purge_demo_workspace','mark_candidate_upload_failed');
```

Also confirm the consent-aware upload function replaced the old one — this must return
**exactly one row**, with six arguments ending in `boolean`:

```sql
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='record_candidate_upload';
```

**Must not be enabled yet:** do not set any function secrets for the purge, and do not
create a Cron schedule.

**Stop if:** any object reports `MISSING`, or `record_candidate_upload` returns two rows
(that would mean the old consent-free version is still callable).

---

## Step 2 — Verify `platform_admins` contains only you

**Where:** Supabase SQL Editor.

```sql
select pa.user_id, pa.display_name, pa.status, u.email
from public.platform_admins pa
join auth.users u on u.id = pa.user_id;
```

**Success looks like: exactly one row**, `status = 'active'`, and the email is your
founder account (`sajeedikovita@gmail.com` per `docs/INFRASTRUCTURE.md` §4).

**Why this matters:** approval provisions every customer owner as an `admin` **of their
own company**. Before this migration, `is_current_user_admin()` returned true for any
company admin, which would have let your first customer list and approve other
companies' access requests.

**Also verify anon can no longer execute the sensitive functions** — every row must show
`anon_can_execute = false`:

```sql
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in ('provision_demo_workspace','activate_demo_trial',
                    'record_candidate_upload','record_evidence_report',
                    'mark_candidate_upload_failed','create_job_with_criteria',
                    'convert_demo_workspace','purge_demo_workspace',
                    'demo_workspaces_due_for_purge')
order by p.proname;
```

`provision_demo_workspace`, `purge_demo_workspace` and `demo_workspaces_due_for_purge`
should show **false for both** — they are called only with the service role.

**Expected, and correct:** `demo_workspace_is_writable` and `demo_folder_is_writable` are
**deliberately still executable by anon**. They are evaluated inside RLS and Storage
policies as the querying role; revoking them turns an anonymous query into a permission
error instead of an empty result. Both are read-only booleans.

**Stop if:** more than one platform admin exists, or any listed function still shows
`anon_can_execute = true`.

---

## Step 3 — Verify the CV bucket is private, PDF/DOCX only, 10 MB

**Where:** Supabase SQL Editor, then Dashboard → Storage.

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'candidate-documents';
```

**Success looks like exactly this:**

| Column | Required value |
|---|---|
| `public` | `false` |
| `file_size_limit` | `10485760` (10 MB) |
| `allowed_mime_types` | `{application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document}` |

**Also confirm the four company-scoped policies exist** — expect four rows:

```sql
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'candidate_documents_%'
order by policyname;
```

**Visual check:** Dashboard → Storage → `candidate-documents`. It must **not** show a
"Public" badge.

**Must not be enabled yet:** do not make the bucket public "just to check a file opens".
The private-URL test in step 6 is how you check that.

**Stop if:** `public` is `true`, the size limit is anything other than `10485760`, or
fewer than four policies exist.

---

## Step 4 — Redeploy `approve-request`

**Where:** your terminal, or Supabase Dashboard → Edge Functions.

The live version still authorizes on `recruiter_profiles.role = 'admin'`. It must be
replaced with the version that requires platform authority, or step 2's protection is
bypassed by the approval path itself.

```bash
supabase functions deploy approve-request
```

Also deploy the purge function **without enabling it**:

```bash
supabase functions deploy purge-expired-demos
supabase secrets set PURGE_JOB_SECRET=<a long random string you generate>
```

**Success looks like:** both functions listed as deployed, with a new timestamp on
`approve-request`.

**Verify:** Dashboard → Edge Functions shows `approve-request` updated today, and
`purge-expired-demos` present. Invoking the purge function with the correct
`x-purge-secret` header returns `"dryRun": true` and deletes nothing.

**Must not be enabled yet:**
- **Do not set `PURGE_ENABLED`.** Without it the purge only reports.
- **Do not create the Cron schedule.**

**Stop if:** `approve-request` fails to deploy — an old version plus the new migrations
means approvals will fail, which is safe, but do not proceed to invite anyone.

---

## Step 5 — Promote the Vercel deployment

**Where:** your terminal.

**Pushing a branch does not update the public site, and neither does merging to `main`.**
Production only changes when a deployment is promoted.

```bash
vercel ls                                   # find the newest Preview from step 0
vercel promote <deployment-url> --yes
```

**Success looks like:** `vercel ls` shows that deployment marked as production.

**Verify:** open `https://hiringevidence.com` in a **private window** and check:
- `/request-pilot` loads and the submit button reads "Request pilot access";
- `/jobs/new` loads (it will ask you to sign in — that is correct).

Note the promoted deployment URL and commit somewhere — that is your rollback target.

**Must not be enabled yet:** nothing new. Do not announce or share the link yet.

**Stop if:** the site errors after promotion — roll back immediately with
`vercel promote <previous-deployment-url> --yes`.

---

## Step 6 — The rehearsal, with a test company

Do this whole step yourself before any real company is invited. **Use a real email
address you control** (it must receive the invitation), a company name that is obviously
a test, and **a CV that is your own or invented — never a real candidate's.**

### 6a. Submit a request

**Where:** `https://hiringevidence.com/request-pilot`, private window.

Fill in the form as a prospect would, using a test company name.

**Success looks like:** "Pilot request received."

**Verify** — the row must actually exist:

```sql
select id, company_name, work_email, status, created_at
from public.access_requests
order by created_at desc limit 5;
```

**This is the whole point of the intake fix:** previously the page said "recorded"
whether or not the row was saved. If the message appears but no row exists, **stop** —
something is wrong with the public insert policy.

**Also test the failure path once:** turn off your network and submit again. It must show
a failure message and **keep everything you typed**. It must not say "received".

### 6b. Approve it

**Where:** `https://hiringevidence.com/admin`, signed in as the founder.

**Success looks like:** the request flips to `approved` and the invitation email arrives
at your test address.

**Verify** — a company, a profile, and a *pending* entitlement now exist:

```sql
select c.name, e.state, e.activated_at, e.active_until, e.purge_at,
       e.max_users, e.max_jobs, e.max_candidates
from public.demo_entitlements e
join public.companies c on c.id = e.company_id
order by e.created_at desc limit 3;
```

State must be `pending_activation` with **null** dates. The clock has not started yet —
that is correct.

**Verify the customer is not a platform admin** — this must still return only you:

```sql
select count(*) from public.platform_admins;
```

### 6c. Set the password and activate the trial

**Where:** the invitation link → `/welcome` → then `/dashboard`.

**Success looks like:** you reach the dashboard as the test company, and it shows the
"Create your first role" prompt and a trial banner.

**Verify** — the 14 days started on this first dashboard visit:

```sql
select c.name, e.state, e.activated_at, e.active_until, e.purge_at
from public.demo_entitlements e join public.companies c on c.id = e.company_id
order by e.created_at desc limit 1;
```

`state` must be `active`, `active_until` = `activated_at` + 14 days, `purge_at` =
+21 days.

**Stop if:** state is still `pending_activation` after opening the dashboard — the
promoted build does not contain the activation code, and the workspace will be
read-only.

### 6d. Create the first role and criteria

**Where:** `/jobs/new`, signed in as the test company.

Enter a role title and at least one **required** criterion.

**Success looks like:** "…is ready for candidate resumes."

**Verify:**

```sql
select j.title, j.status, r.label, r.priority, r.sort_order
from public.job_requirements r
join public.job_roles j on j.id = r.job_id
order by r.sort_order;
```

### 6e. Upload a test CV

**Where:** the upload screen, still as the test company.

Tick the authority/privacy confirmation — **the file input stays disabled until you do,
and the database refuses the upload without it.**

**Success looks like:** the row reaches "Report ready" with a working "View report" link,
and the report shows evidence against *your* criteria, not demo ones.

**Verify the file is stored privately and company-scoped:**

```sql
select name, bucket_id, metadata->>'size' as size_bytes
from storage.objects
where bucket_id = 'candidate-documents'
order by created_at desc limit 5;
```

The `name` must begin with the **test company's UUID**.

**Verify it is not publicly readable.** Take that object path and open:

`https://vzfurafvkoqwmfkzcwjj.supabase.co/storage/v1/object/public/candidate-documents/<path>`

**It must fail** (400/404). If that URL returns the file, the bucket is public — stop and
fix step 3.

**Verify the consent audit record:**

```sql
select action,
       metadata->>'consent_recorded_at' as consent_recorded_at,
       created_at
from public.audit_log_entries
where action in ('candidate_upload_recorded','job_role_created','evidence_report_generated')
order by created_at desc limit 10;
```

`candidate_upload_recorded` must carry a non-null `consent_recorded_at`. Cross-check it
against the application row:

```sql
select id, status, consent_status, consent_recorded_at
from public.candidate_applications
order by created_at desc limit 3;
```

**Remember what this records:** the *recruiter's attestation* of lawful authority — not
the candidate's own consent. There is no candidate-facing consent flow yet.

### 6f. Prove company isolation

**Where:** two browsers, or one normal and one private window.

Signed in as the **test company**, try to open a report URL belonging to your own
Northstar workspace (take a `public_report_code` from it).

**Success looks like:** the report does **not** load and no candidate evidence from the
other company is shown.

**Verify at the database level** — every row must carry only its own company id:

```sql
select c.name,
       (select count(*) from public.candidates       where company_id = c.id) as candidates,
       (select count(*) from public.job_roles        where company_id = c.id) as roles,
       (select count(*) from public.evidence_reports where company_id = c.id) as reports
from public.companies c
order by c.created_at desc;
```

**Stop if:** the test company can read anything belonging to another company. That is the
one failure that must block a real customer entirely.

### 6g. Record a human decision

Open the report, record a decision with a written reason.

**Success looks like:** the reason is required, and the decision is saved.

**Verify:**

```sql
select decision, reason, created_at
from public.human_review_decisions
order by created_at desc limit 3;
```

---

## After the rehearsal

**Keep the test company** until you are confident, then mark it as continuing (`/admin`
→ "Mark as continuing") so it is never purged, or leave it to expire naturally once the
purge is eventually enabled.

**Only now** invite a real company — one at a time.

---

## Deferred security items — not done, not forgotten

These were **deliberately deferred** on 2026-08-02 and are not part of this runbook:

| Item | Rule | Status |
|---|---|---|
| **Virus scanning of uploads** | `SECURITY_PRIVACY_RULES.md` — "Use virus scanning if available" | Deferred |
| **AI usage/cost logging** (module, model, tokens, estimated cost, timestamp) | `SECURITY_PRIVACY_RULES.md` — "AI Logging" | Deferred |
| Candidate-facing consent capture | "Candidate must consent… stored with timestamp" | Not built — recruiter attestation only |
| Per-IP rate limiting on the public demo's AI calls | — | Not built; the OpenRouter spending cap is the only brake |
| Configurable data retention | "Add configurable data retention later" | Not built — the lifecycle is fixed at 14 + 7 days |

The AI logging item is worth doing before the public demo is marketed widely: without
token and cost records there is no way to attribute an OpenRouter bill to a company, a
demo visitor, or an abuser.

---

## Quick reference — everything that must stay off

- [ ] `PURGE_ENABLED` — unset
- [ ] Purge Cron schedule — not created
- [ ] `purge_demo_workspace` — never called by hand
- [ ] Bucket `candidate-documents` — never public
- [ ] Real candidate CVs — not during rehearsal
- [ ] Real company invitations — not until step 6 fully passes
