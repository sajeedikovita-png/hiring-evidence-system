# Hiring Evidence: premium pilot development plan

Created: 9 September 2026. Branch: `codex/premium-pilot-foundation`.

## Current milestone — testing release delivered

The owner's later instruction authorized Supabase operations and requested a release today for testing tomorrow. The bounded testing release is now deployed: [owner test guide](2026-09-10-owner-test-guide.md), [acceptance checklist](2026-09-09-today-release-checklist.md), and [deployment evidence](../SUPABASE_DEPLOYMENT_2026-09-09.md).

Implemented scope spans Step 1 and the essential parts of Steps 2–7: real job/criteria creation, private upload, explicit AI-assisted evidence with manual fallback, persistent human decisions/reasons, new 30-day pilots, and reviewed ongoing-access terms. The root model reviewed and tested Terra agents' work, returned browser/security defects, and verified the corrections. The preview is ready for owner acceptance testing. Production promotion, full live-provider acceptance of the new report contract, complete agency/client/versioning workflows, commercial validation, and the operational/privacy gates below remain separate work. Earlier milestone entries below describe their state at the first hardening batch, not the final testing release.

## Objective and commercial direction

Develop a dependable evidence-review workspace for specialist recruitment agencies. Validate a S$500, 30-day bounded pilot followed by three explicitly accepted S$800 founding terms and a disclosed S$1,400 standard price from term four. These are commercial targets, not proven willingness to pay. The complete commercial proposal is in `2026-09-09-premium-pilot-commercial-proposal.md`.

The first product outcome is a candidate report that connects approved job criteria to inspectable sources, exposes missing information, supports team review, and preserves the human decision and reason. It should complement the agency's existing recruitment tools.

AI assists. Human decides. Evidence explains.

## How implementation and review will work

- The primary model owns planning, task boundaries, acceptance criteria, integrated review, and honest reporting of completion.
- GPT-5.6 Terra implements bounded tasks. Medium reasoning is the default; high is reserved for authentication, database isolation, and other substantial correctness work. Use shorter contexts with explicit briefs to avoid copying the full conversation into each worker.
- GPT-5.6 Luna may handle narrow documentation or mechanical changes when no security or architectural judgment is needed. Do not change model merely to save a small amount if it makes the task unreliable.
- Current usage-saving instruction: run one active developer at a time; keep root review focused on changed behavior. The earlier batch used two implementers on independent files and one reviewer. Do not let agents overwrite one another's work. Shared-file edits must be handed off explicitly.
- Every task names owned files, excluded scope, acceptance tests, and dependencies. No uncontrolled nested delegation.
- An implementer's completion message is not acceptance. The primary model inspects the diff, checks user-visible behavior, runs the integrated gates, and sends defects back for correction. A read-only review is required for access and persistence changes.
- Keep implementation changes reviewable. The owner's later authorization covers the reviewed Supabase deployments and testing preview described above. Customer communications, real payment collection, and production promotion require their applicable authorization.
- Do not add unrequested production AI calls, real email sending, real PDF export, mobile apps, or advanced analytics. Prepare service boundaries and choose provider/deployment settings before those integrations. The repository's scope guardrails remain in force.
- Update this plan at each milestone with changed files, verification evidence, remaining gaps, and the next exact task. A release gate stays incomplete until its acceptance evidence exists.

## Step 1 — trustworthy access and report states

Status: local implementation reviewed; Supabase changes deployed and backend acceptance passed on 9 September 2026. Deployment of the current frontend and owner browser sign-in remain separate checks.

1. Protect dashboard, job, upload, and arbitrary report routes with a real authenticated user, one unambiguous active membership, and an active company. Protect the platform access-request screen with an independent active platform-operator allowlist; a customer administrator role is insufficient, and platform operators need no customer membership.
2. Fail closed when backend configuration is missing. Do not turn configuration failure into a signed-in synthetic customer workspace.
3. Preserve a clearly labeled public synthetic sample report. It must use synthetic data even when a live backend is configured, and must not save real or simulated hiring decisions.
4. Re-check access when the session changes and clear private state on sign-out or account changes. Do not display the previous company's content while another account is loading.
5. Remove fixed fairness success claims from the main report, sidebar, and dashboard. Unknown, legacy, or missing check results remain unverified. Describe only what was actually checked.
6. Inspect server/database isolation separately. A browser route guard does not establish database security.

Acceptance: tests for missing configuration, signed-out access, inactive/missing membership and company, unknown roles, non-admin administrator access, valid access, public-sample separation, and unsupported fairness success messages. Browser smoke check confirms sample and blocked-route behavior. Document any server-side gaps and address critical regressions before accepting the batch.

Assignments: `customer_access` — route/session/service work (Terra, high); `honest_safeguards` — shared safeguard presentation and tests, followed by independent access review (Terra, medium); `security_review` — isolation review followed by explicitly assigned server hardening (Terra, high); primary model — plan, diff review, browser verification, and integrated acceptance.

The local isolation review found unsafe workspace and administrator assumptions. Live inspection then found newer pilot migrations and an existing canonical `platform_admins` allowlist. The final migration preserves that authority, the isolated-workspace provisioning RPC, and the existing 14-day pilot lifecycle. It hardens company/storage access, profile writes, public submission fields, and activation/provisioning guards. Deployment and business-owner platform bootstrap have now been performed; see `../SUPABASE_DEPLOYMENT_2026-09-09.md` for evidence and remaining limits.

## Step 2 — real agency jobs and consistent criteria

Status: pending Step 1.

1. Replace the fixed Frontend Developer routing with company-scoped job identifiers and working job creation/editing.
2. Add the agency's client/assignment relationship behind repositories. Decide which internal users may see each client; do not grant external clients agency-wide access.
3. Save required/preferred job criteria and their source, owner, version, and approval time.
4. Apply a consistent criteria version to reports for an assignment; require a recorded reason for changes and identify reports needing review after a change.
5. Flag potentially discriminatory or unsupported job requirements for human review without asserting legal certification.

Acceptance: two agencies cannot read or mutate each other's jobs or clients; all links open the correct role; saved criteria survive reload; a criteria change is traceable; no page imports mock data directly.

## Step 3 — private uploads with honest processing states

Status: pending Steps 1–2.

1. Connect the upload screen to the existing private storage service through the repository boundary.
2. Validate file type, size, role permission, company ownership, and processing permission before accepting a file. Define handling for untrusted PDF/DOCX content and scanning.
3. Record the actual processing basis/notice and uploader confirmation. Do not record candidate consent merely because an employee clicked upload.
4. Handle partial failures, retries, duplicate submissions, and cleanup without orphaning documents or duplicating applications.
5. Persist queued, processing, failed, and manual-review states. A stored file is not a parsed CV or a completed report.

Acceptance: valid files persist to the correct private workspace; forbidden files and other-company paths fail; retries are safe; failed steps are visible; database/storage tests prove isolation; reload matches persisted state.

## Step 4 — evidence extraction and source verification

Status: pending Step 3 and explicit processing-provider decisions.

1. Define the processing job and provider interfaces, per-document limits, timeouts, retries, and cost accounting.
2. Extract document text with source/page references and surface unreadable or ambiguous content for manual review.
3. Map evidence to the approved job criteria. Separate candidate claims from independently verified facts, and missing information from lack of ability.
4. Show inspectable source excerpts and verification questions. Require every positive factual claim to have a usable source or an explicit human-entered source record.
5. Keep prompt instructions found inside uploaded documents untrusted. Prevent them from changing the processing policy or exposing other customers' data.
6. Select any production AI model and data-processing settings before connecting it; no hidden paid calls or unapproved data transfer.

Acceptance: a representative, permissioned evaluation set covers extraction failures, unsupported claims, source accuracy, contradictory evidence, and adversarial documents. Measure errors and processing cost; do not reuse seed outputs as accuracy evidence.

## Step 5 — human review, corrections, and decision history

Status: pending Steps 2 and 4.

1. Allow reviewers to correct extracted claims with a recorded source and amendment reason.
2. Add assigned reviewers, review status, and internal handoff appropriate to agencies.
3. Require a human-entered job-related reason for a hiring review decision and enforce it on the server/database.
4. Save the decision and its audit record atomically. Use server timestamps and authenticated actor identity.
5. Preserve version history and concurrent-edit behavior. Reconstruct which evidence and criteria were seen when the decision was made.

Acceptance: blank reasons, forged actors, unauthorized edits, and cross-company decisions are rejected; retries do not duplicate decisions; saved records and audit history remain consistent after refresh and failure injection.

## Step 6 — client-ready report delivery

Status: pending Step 5 and agency client-access design.

1. Build a concise review report with sources, open questions, reviewer notes, and a clear human-review status.
2. Support controlled sharing only with the intended recipient and assignment; make access expirable and revocable.
3. Keep internal notes separate from deliberately shared content. Preview exactly what the recipient will receive.
4. Add export only when explicitly authorized and ready; the initial reviewable artifact can be the protected web report.

Acceptance: recipients cannot access other candidates/clients by changing identifiers; expired/revoked links fail; hidden internal notes do not appear in responses; recipient review is usable without exposing the agency workspace.

## Step 7 — pilot lifecycle and paid-access requests

Status: pending working customer workflow; independent schema planning may follow Step 1.

1. Preserve request → owner review → invitation → active pilot.
2. Separate platform-owner approval permissions from customer-company administrator permissions.
3. Record the agreed pilot scope, start/end date, seat allowance, document allowance, and usage server-side.
4. Show remaining pilot access and stop new paid processing when access expires or limits are reached, with a defined route for retrieving existing records under the agreement.
5. Add an explicit request for ongoing access. Record the customer's accepted offer and owner activation separately; no automatic subscription conversion.
6. Keep invoicing/manual payment confirmation separate from entitlement activation until a payment integration is explicitly requested.

Acceptance: customer admins cannot grant themselves paid access, reset usage, or extend pilots; concurrent uploads cannot bypass limits; expired pilots cannot initiate new processing; requested paid access is not treated as paid or activated.

## Step 8 — privacy, retention, and operational readiness

Status: required before real customer data is accepted, developed alongside Steps 3–7.

1. Complete company isolation tests across database tables, storage, processing workers, reports, and logs.
2. Provide documented processing purposes, providers, access controls, retention schedules, and appropriate customer agreements.
3. Support access/correction handling, deletion across related systems, and documented legal/business retention exceptions.
4. Reconcile interview/job-offer record retention with data minimisation; avoid indefinite retention of all candidate data.
5. Test backups, recovery, incident handling, support coverage, and safe logging. Do not log private resume text or secrets unnecessarily.
6. Map any Singapore-related marketing claim to working behavior and the relevant official guidance. Obtain an appropriate employment/privacy review before publishing broad compliance claims.

Acceptance: privacy and operational procedures have owners and tested actions; restore/deletion exercises succeed; no unresolved high-risk tenant isolation issue; actual production configuration is checked independently of local tests.

## Step 9 — run three bounded commercial pilots

Status: pending product and operational release gates; customer discovery may start earlier without real-data processing.

1. Demonstrate the sample and communicate the S$500 evaluation scope, three S$800 founding terms, and S$1,400 standard price from term four upfront.
2. Agree a baseline and success criteria with each buyer: review/preparation time, correction effort, source trust, repeat use, and delivery cost.
3. Run the promised one-role evaluation only when that workflow is usable. Record feedback and failures alongside positive results.
4. Offer ongoing access only after explicit acceptance. Apply the agreed credit transparently.
5. Reassess scope, customer fit, and economics if buyers will not continue at the target price. Do not mask this by adding unrelated features.

Acceptance: actual paid continuation and recurring use, not sign-ups or compliments; sustainable support/processing cost; accurately documented customer results with permission for any public use.

## Step 10 — release and iterate on verified demand

Status: pending earlier gates and deployment authorization.

1. Prepare a concrete release candidate, migration/recovery plan, environment checklist, and reviewer sign-off.
2. Run all required checks and production smoke tests with appropriate test accounts/data.
3. Deploy only with the necessary authorization. Verify the deployed version and critical workflows independently.
4. Track reliability and customer feedback; prioritise repeatable value before expanding seats, volume, integrations, or product categories.

Acceptance: the running deployment matches the reviewed release and the promised scope. Keep implementation completeness, deployed readiness, legal review, and commercial validation as separate statuses.

## Required checks and current baseline

Run before accepting each batch:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
git diff --check
```

Baseline on this branch before Step 1: all four npm gates passed after targeted transitive dependency updates; audit reported zero vulnerabilities. Build retained a bundle-size warning. Earlier 45-second timeouts were not proof of code failure; allow a bounded 120-second initial run and report exact failures. Passing these checks does not prove live authentication, production data isolation, or commercial readiness.

## Progress ledger

- Commercial direction and step-by-step plan: written; development requested by owner.
- Dependency baseline: updated and verified before this batch.
- Step 1 local changes: protected customer routes and repository access, immediate private-state clearing on auth events, stale-result guards, retryable timeouts, independent platform approval authority, synthetic read-only sample, and conservative review-safeguard labels. Removed fixed live recruiter/questionnaire claims.
- Primary review returned defects for correction, including disabled-operator handling, platform-only operator access, ambiguous membership, stale auth results, and sample decision controls. Corrections were inspected and access work received peer review.
- Final integrated verification: typecheck, full npm tests, production build, and diff check passed; audit reported zero vulnerabilities. Seven Deno Edge tests passed. Build retains a roughly 554 kB JavaScript chunk advisory.
- Browser verification: a local production build with backend configuration deliberately absent blocked dashboard, candidates, upload, arbitrary report, and platform-admin routes without showing sample candidate data. The public report displayed the synthetic notice, disabled decision controls, and Not checked safeguards. Vite dev navigation initially timed out; verification used a separately built local static server.
- Additional browser checks: with synthetic backend settings present, intercepted requests showed zero external calls while the public sample rendered and decision saving stayed disabled. A malformed backend URL produced the access-unavailable screen without a page exception. These are isolated local checks, not live backend authentication tests.
- Database verification supersedes the earlier local-database limitation: the two reviewed migrations were rehearsed in a rollback transaction, then applied to the linked Supabase development project. Post-deployment checks passed: 21 behavioral SQL assertions, 15 schema/grant assertions, 8 compatibility assertions, and 15 live API checks using disposable authenticated users. All temporary fixtures were removed. This coverage does not prove every workflow or all cross-table integrity properties.
- Remaining server risks tracked for subsequent steps: related-row same-company integrity, atomic provisioning/approval/audit failure handling, authoritative audit actors for all writes, and a dedicated platform audit history. Do not interpret this batch as complete tenant-security assurance or a ready paid pilot.
- First hardening batch: Steps 2–10 were still planned. The later testing release implements the essential manual workflow and lifecycle portions described in the current milestone; it does not complete every long-term product/operational/commercial item.
- Latest Supabase/backend status: five migrations, reviewed access functions, validated invitation destination, and owner platform access are deployed. Existing entitlement dates are preserved, while new pilot defaults are 30 days. The frontend is deployed as a Vercel preview; customer email delivery, online billing, and real-data processing were not exercised.
