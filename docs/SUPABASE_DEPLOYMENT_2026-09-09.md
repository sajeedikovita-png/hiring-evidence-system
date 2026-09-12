# Supabase deployment — 9 September 2026

## Scope and target

The owner authorized handling Supabase configuration and deployment directly. CLI access was already authenticated. The verified linked target is `hiring-evidence-system-dev`, project `vzfurafvkoqwmfkzcwjj`, region `ap-southeast-1`. Other projects were not changed.

Live inspection found migrations and functions newer than this checkout. Existing `platform_admins`, isolated workspace provisioning, private candidate storage, and historical entitlement dates were preserved. The first hardening stage retained 14-day defaults; the later testing release changes new pilots to 30 days while preserving existing rows.

## Applied changes

- `202609090000_access_request_compatibility`: adds and backfills fields needed by the current admin workspace without replacing the legacy request fields.
- `202609090001_workspace_access_hardening`: requires active company membership for both database and storage helpers; removes browser membership mutation; restricts public request inserts to form fields and pending status; uses the canonical platform allowlist; guards cross-company trial activation and rejected-request provisioning; preserves existing audit action names.
- Deployed `request-access`, `approve-access-request`, and `reject-access-request` for the current application. Approval calls the existing isolated workspace provisioning RPC and records the authenticated platform actor.
- Replaced the unprotected legacy `invite-user` endpoint with platform-authorized handling and gateway JWT verification. The later release makes its password destination use validated `APP_URL`; `/welcome` remains a frontend compatibility alias.
- Enabled platform access for the confirmed business-owner Auth account identified in the prior admin handoff. The older operator was retained. No customer-company membership was added to the business-owner account because platform review requires none.

The two migrations and their history entries were committed in one database transaction after a rollback rehearsal. Existing remote history was retained. A blanket `db push` was deliberately avoided: the checkout still lacks several historical remote migrations and includes an older local storage migration not recorded remotely. Reconcile that history before using a general push or rebuilding this database from scratch.

## Verification

- Rehearsal on the actual database: migration changes plus 20 behavior assertions inside a transaction, with an explicit pgTAP failure check, followed by rollback.
- Post-deployment: 21 behavior assertions, 15 schema/grant assertions, and 8 compatibility assertions passed in rollback transactions. The added behavior assertion proves a rejected request cannot be provisioned.
- Fifteen live API checks passed using temporary Auth users: anonymous denial, customer-admin denial, platform-only authority, public submission, approval, isolated company creation, pending 14-day entitlement, idempotent retry, rejection, and disabled-operator denial.
- Temporary Auth users, platform entries, access requests, and companies were removed. The original three pending requests remained unchanged. No invitation email was sent; approval used an already-created disposable Auth account.
- Repository typecheck, full tests, build, and dependency audit passed. Audit found zero vulnerabilities. Seven Deno tests passed. The existing roughly 553 kB bundle advisory remains.

## Later testing release

Applied three additional reviewed migrations, with history entries in the same transaction as each deployment:

- `202609090002_pilot_lifecycle`: 30-day defaults for new pilots, ongoing access request/review/start, per-term document limits, total role/user limits, renewal, and protection against the legacy pilot purge for workspaces with ongoing terms. Uploader attestation no longer implies candidate consent.
- `202609090003_workflow_completion`: source-grounded manual report creation and atomic human decision/reason/audit writes. Browser direct decision mutations are revoked.
- `202609090004_membership_quota_update`: closes the demonstrated disable/replace/reactivate user-limit bypass and checks company moves.

SHA256 values of the deployed migration files:

```text
002 2edb9fd2b506dbd9f46c29d6343b887877dbf837d8ff28cf5f51303410c6f2f8
003 d407fcdc5a6d8761653a70639c71869f017f31e97fb94c047b04aef9103c81dc
004 53df1d0db46b274663f98b2a8463a16e37886d47e26228123f0d3a48d139cba6
```

Vercel preview deployment `dpl_YQEL89jrvhna9gYCNzS62bbwECD1` reports **Ready**:
https://hiring-evidence-system-i5jelfrdv-sajeewas-projects-b911d5d0.vercel.app

The primary agent checked the production build locally against real Supabase using disposable accounts: pilot start, job and criteria creation, private PDF upload/download, manual report, required decision reason, persisted outcome/reason after reload, ongoing request, platform review, and intentional ongoing activation. API checks confirmed anonymous storage denial, platform-only exclusion from customer reports, customer exclusion from platform approval, and denial of actual writes after expiry.

Additional SQL validation: 16 lifecycle schema, 19 lifecycle behavior, 10 workflow, and 5 membership assertions passed. The prior 44 compatibility/access assertions also passed against the updated database. Seven Deno tests and all required repository gates passed; audit found zero vulnerabilities. The main bundle is approximately 568 kB with a build-size advisory.

Auth's existing site URL and redirect entries were retained; the exact preview origin was added. `APP_URL` was updated to that preview and verified by its server secret digest. `invite-user` was redeployed after a concurrent secret-update redeploy returned HTTP 409 on the first attempt; the retry succeeded. A generated recovery link, password setup, sign-out, and new-password sign-in passed with a disposable account and no email delivery. The temporary localhost redirect was removed after testing. Temporary accounts, company data, and private documents were cleaned up.

## Remaining limits

Actual invitation/recovery **email delivery** was not exercised. The generated-link browser test verifies the password destination and authentication path, not mailbox delivery. The preview was verified through Vercel deployment status; browser acceptance ran against the locally served production build and live Supabase. Production custom domains were not promoted.

Migration `202609090005_access_request_approval_finalization` adds service-only atomic actor/owner/company binding and a canonical approval audit event. Retrying a provisioned request completes missing finalization without duplicate canonical events. Auth lookup now uses bounded pagination (up to 100 pages of 1,000 users); exceeding the bound fails safely. Invitation and workspace provisioning remain separate operations, so an invitation may precede a provisioning failure. Nine assertions passed on the actual database in a rollback rehearsal before application. The approval Edge Function was redeployed. Sixteen live API assertions then passed, including repeated approval with exactly one canonical audit event. All disposable fixtures were removed, with no invitation email sent. Migration SHA256: `da5a0609dd2a8160805b066ace05ef4a62f2ba83a896af6caa7c06a892464a0f`.

This release provides manual and explicit AI-assisted evidence authoring and a manually approved ongoing-access workflow. Online payment collection, self-service additional team-member onboarding, complete retention/deletion operations for paid workspaces, and commercial/privacy validation remain outside the verified release. Ongoing terms are currently protected from legacy automatic pilot purging and therefore need an explicit paid-workspace retention policy before commercial launch. Price display and technical limits do not establish customer willingness to pay or Singapore legal compliance.

No passwords, API keys, access tokens, recovery links, or customer documents are stored in this report.


## Final document-analysis testing release

Migration `202609090006_document_analysis` was applied with its history entry after 17 actual-database rollback assertions passed. SHA256: `35f9e2352d94176a661489a4bd84aee1173d34e90309e6528cd1174f7fba705a`.

Private extraction is performed in the browser with a local PDF worker or DOCX raw-text extraction. Source text is previewed before explicit provider acknowledgement. Limits: 10 MB, 25 PDF pages, 24,000 characters, two attempts per document, 45-second provider timeout, no automatic retry. Incomplete extraction requires manual review. Service-only claim/finalize/fail functions bind the authenticated actor and company, preserve canonical job criteria and extraction provenance, rotate lease tokens on recovery, and atomically persist report/items/audit. Completed retries reuse the existing report. Source references are visible in the evidence matrix. Extracted text is private and is not a verified server-side transcription of the original file.

Exactly one authorized live synthetic request succeeded against the previously configured provider model, `anthropic/claude-opus-4.8`. The new handler contract was verified separately using injected recorded output and real Supabase Auth/database. Its test server's network allowlist excluded the provider. Fourteen integration assertions covered pre-provider denial, expired membership, completed reuse, malformed output and the two-attempt limit. Built-browser PDF and DOCX extraction and DOCX-to-persisted-report acceptance passed. No further external provider calls or invitation emails were made. Actual provider acceptance of the new structured response contract remains an owner test.

Production site: https://hiringevidence.com

The protected `analyze-resume` function replaces the legacy arbitrary-text endpoint. Existing provider credentials/model were preserved. Invitation `APP_URL` and the allowed redirects now use the production domain.

Final Vercel deployment `dpl_E2kZoZQwht73yobnxRoRcZUfCgam` reports Ready. Its build assets match the tested local build (`index-rfScA81k.js`, `pdf.worker.min-BmVo14Nb.mjs`). The deployed handler rejected anonymous and empty authenticated requests before provider work. The AI-draft report also passed browser human-decision saving, reload persistence, and a database assertion linking the decision to its actor audit. The final code passed typecheck, full tests, build and audit (zero vulnerabilities); chunk-size advisories remain.

All final synthetic Auth users, companies, documents, analysis runs, reports, decisions, private objects, and temporary session files were removed. Local test servers and browser were stopped.

## Company access policy — 10 September 2026

Migration `202609100000_company_access_policy` enforces one pending pilot request per normalized email and one active company membership per Auth user. Guarded public submission returns a generic receipt for new, pending, and existing-access emails, preventing duplicate workspaces without exposing account existence. The two historical pending requests for the approved `seya` owner were automatically closed with recorded reasons; the approved workspace was preserved.

Platform administrators can grant or transfer special company access from the access-request page. The operation requires a target company, role, written reason, and explicit transfer confirmation when another active membership exists. The database enforces the target user limit, disables the previous membership in the same transaction, and records the platform actor and reason in the audit trail. Multi-company active membership remains unsupported.

Seventeen linked-database rollback assertions passed before deployment. Live checks confirmed generic duplicate handling, exactly one stored pending request, anonymous and customer denial, transfer confirmation, one active membership, and reason-bound audit persistence. Synthetic accounts and companies were removed; no test email was sent. Migration SHA256: `9ee37f1b14573f1c4057599a5a72b1ee6bbdd3f3e6ad6aaf8928f9e0194a4002`.

Vercel production deployment `dpl_GZtG7eMKK7bqMteedsEKWhQxGp9p` reports Ready and is aliased to https://hiringevidence.com and https://www.hiringevidence.com. The production origin is allowed for Supabase redirects and is the verified `APP_URL` used by invitation flows.

## Founding pricing schedule — 10 September 2026

Migration `202609100001_ongoing_access_pricing_schedule` records the commercial offer on every ongoing-access request: S$800 for each of the first three manually renewed 30-day terms, followed by S$1,400 from term four. The customer, platform approval, and term-start audit records retain the exact accepted price, pricing version, and term number. Existing S$1,400 requests remain valid and are not repriced. Migration SHA256: `c1466ffa2d5d92dde1fdf7cdb75b5f67dcd38b9b6f6b5871272938550a32acf7`.

Migration `202609100002_expired_ongoing_offer_alignment` makes the read-only lifecycle response treat a term past `active_until` as completed when calculating the next offer. This guarantees that the price displayed in the acceptance checkbox matches the price the request RPC records, including the transition from founding term three to the S$1,400 fourth term. Migration SHA256: `6f65a2447df225df661c6de462c2e5364f2d2f65ca1d4861a03e0968cf181bb3`.

The linked database passed 16 lifecycle schema assertions, eight pricing structure and permission assertions, and a 38-step runtime lifecycle test covering terms one through four and exact request, approval, and start audit metadata. A focused rollback scenario independently verified the expired-term display and recorded fourth-term offer. Repository typecheck, tests, production build, and high-severity dependency audit passed; the audit found zero vulnerabilities.

Vercel production deployment `dpl_3tXtoTrTkd86yezXXCFMdeMSgmnT` reports Ready and is aliased to https://hiringevidence.com and https://www.hiringevidence.com. Live browser checks confirmed the homepage and request page disclose the S$500 pilot, three S$800 founding terms, S$1,400 from term four, and no automatic charge or renewal.

## Singapore readiness and candidate privacy requests — 11 September 2026

Migration `202609110000_candidate_privacy_requests` adds a company-scoped candidate privacy-request ledger for access, correction, deletion, and consent-withdrawal requests. Authenticated workspace staff can submit a request. Only an active company administrator can list or review requests. Identity verification and a written human note are required before resolution or refusal, and each material step is written to the audit trail. Direct table writes remain denied.

The workflow records and governs a request; it does not itself export, correct, delete, or withdraw candidate data. Those operational actions require a verified identity procedure, retention and legal-hold rules, and an authorized fulfillment process. This boundary is stated in the workspace UI and the internal readiness documentation.

The linked database confirms migration version `202609110000` and passed 16 rollback assertions after deployment. Live checks confirmed the table, RLS, admin policy, denied direct inserts, authenticated RPC grants, and audit actions. The test left zero synthetic users, companies, or candidates. Migration SHA256: `f0d84384acd528283816239c810d38364df0acdea4e8b1668b2eaee54d96db97`.

The public Singapore readiness page maps current controls and customer responsibilities to official MOM, PDPC, and IMDA material. It describes the product as designed around published guidance and explicitly states that this is not government endorsement, certification, or a guarantee of legal compliance. `docs/SINGAPORE_READINESS.md` and `docs/AI_ASSURANCE_TEST_PLAN.md` record the evidence checklist and the remaining assurance work.

Vercel production deployment `dpl_AYmHdyuD9NQrJTfvTaaYzdhY82mL` reports Ready and is aliased to https://hiringevidence.com and https://www.hiringevidence.com. The existing public Supabase browser configuration was added to Vercel's Production scope after a fresh-session check exposed that it had previously been scoped only to Preview. A replacement deployment confirmed that an unauthenticated `/workspace/privacy` visit reaches the configured sign-in gate rather than the configuration-error state. The public readiness route returned HTTP 200 and passed live visual review.
