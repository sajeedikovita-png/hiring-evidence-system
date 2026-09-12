# Hiring Evidence: Claude Continuation Brief

## Purpose

Continue the Hiring Evidence System toward a real, limited 14-day company trial using real candidate CVs. This brief is the authoritative handoff for another coding assistant.

## Do not run overlapping edits

A Codex task named **Review Live Trial Security Plan** is currently working on the first security gate: private, company-only CV storage and secure uploads. Before editing the same source files, confirm whether that task has finished. Do not overwrite its uncommitted or newly created work.

## Product decisions already approved

- A company receives a 14-day live trial after approval.
- The trial starts on the company user's first successful dashboard visit, not on approval or invitation.
- At day 14, the company becomes view-only: it can read and share its existing work but cannot create, upload, edit, or delete data.
- View-only access lasts 7 more days. The interface must show the exact deletion date and reminders, especially in the final 4 trial days.
- After the grace period, trial data must be deleted unless the company converts. Keep only a minimal non-person operational record.
- The existing public/sample demo must remain intact. The real customer trial must be a separate, authenticated path.
- Real CVs are allowed only after the security controls below are implemented and verified.

## Already completed in the prior live-demo work

- Existing access-request records were retained; no approval table was deleted or duplicated.
- A `demo_entitlements` database table was added for trial state and dates.
- Server-side functions were added for activation, provisioning, and write checks.
- Database policies were added so an expired trial stays readable but cannot be modified.
- The live `approve-request` Edge Function was upgraded to provision an isolated company workspace, customer administrator, and pending trial entitlement.

## Current first security task: implement now

Build a real secure CV upload path for authenticated company users.

Required controls:

1. Private Supabase Storage bucket; no public URLs.
2. Company-scoped object paths, for example a company identifier as the first path segment.
3. Storage policies that allow an authenticated user only to read and write objects for companies where the user has an active membership.
4. Browser-side and server-side validation: PDF/DOCX only, strict size limit, reject unknown types.
5. No Supabase service-role key in the browser.
6. Insert an audit record for a successful upload.
7. Preserve the current sample/demo upload experience. Do not route it through real storage unless it is a real authenticated company trial.
8. Write automated tests and run the project typecheck, test suite, and build.
9. Do not upload real CVs as a test. Use a harmless test file only after the storage configuration is verified.

## Remaining work after secure uploads

1. Deploy the website code that starts the trial on dashboard open and displays the countdown/warnings.
2. Implement scheduled cleanup after the seven-day view-only period, including deletion of the matching private Storage objects and database records.
3. Add conversion/upgrade handling so converted companies are exempt from expiry and deletion.
4. Add/verify audit logs for security-relevant actions and support access.
5. Review authentication hardening, including an appropriate MFA policy for privileged platform administrators.
6. Complete a fresh end-to-end test:
   - request pilot access;
   - approve as platform administrator;
   - invitation and password setup;
   - first dashboard visit starts the trial;
   - verify one company cannot see another company's data or documents;
   - verify writes are blocked after expiry but reads remain available;
   - verify the deletion warning and cleanup only with test data.
7. Resolve or assess dependency security findings before marketing the system as ready for real CVs.

## Important current truthfulness rule

Do not claim the product is ready for real candidate CVs until private storage, company isolation, secure upload, audit records, retention/deletion, and end-to-end verification are all complete. Until then, call the public experience a sample/demo using synthetic data.

## Related documents

- `docs/SECURITY_PRIVACY_RULES.md`
- `docs/plans/2026-07-31-live-demo-trial-handoff.md` if present in this checkout
- `docs/plans/2026-07-30-hiring-evidence-main-project-demo-access-plan.md`

