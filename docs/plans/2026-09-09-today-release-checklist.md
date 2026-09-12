# Today’s pilot testing release

Owner request: finish development today, 9 September 2026, for owner testing tomorrow. This checklist tracks the usable release separately from the longer commercial validation plan.

## Acceptance flow

1. Applicant sees the pilot scope and submits an access request.
2. Platform owner reviews the request and grants isolated pilot access; customer administrators cannot review other companies.
3. Invited user can set a password, sign in, intentionally start the pilot, and see dates, usage, and limits.
4. User creates a real job with saved criteria, uploads a private synthetic candidate document, and can inspect the source.
5. User prepares or reviews source-grounded evidence, records verification gaps, and saves a human decision with a reason and an atomic audit record.
6. User requests the next ongoing term with explicit acceptance: S$800 for each of the first three founding terms, then S$1,400 from term four. The request is pending until the platform owner records manual confirmation and approval. No automatic payment or conversion.
7. Expired or exhausted pilots cannot create new work. Existing permitted records remain viewable according to their lifecycle; customer changes cannot reset limits.
8. Root reviews changes, rehearses/applies reviewed Supabase migrations, runs repository checks and synthetic backend/browser tests, and prepares a Vercel preview for tomorrow.

## Assignments

- `customer_access` (Terra): public/customer/platform lifecycle screens, sign-in destinations, navigation, invitation compatibility.
- `security_review` (Terra): pilot status/limits, paid-access requests and reviewed activation, lifecycle SQL/service/tests.
- `honest_safeguards` (Terra): job creation, private upload, inspectable sources, evidence review and atomic human decisions.
- Primary model: integration, review, migration rehearsal/deployment, browser acceptance, verification report.

No agent may edit an already-deployed migration. No customer invitations, real candidate data, or paid AI test calls are made without the applicable authorization. The user authorized one synthetic provider test; it passed. All subsequent provider integration checks used a simulated response.

## Status

The testing release is implemented and deployed as a Vercel preview. Primary-agent browser acceptance passed for pilot start, real job creation, private PDF upload/download, manual evidence report creation, reason-required decision saving, persisted decision display, ongoing-access request, platform approval, and intentional ongoing-term activation. Generated recovery-link/password setup and subsequent sign-in also passed without sending email.

Customer site: https://hiringevidence.com

Supabase migrations 000–006 are applied. New pilots use 30 days / 1 role / 50 documents / 2 users; existing 14-day entitlements retain their dates. Ongoing access uses reviewed 30-day terms, 10 total roles, 500 new documents per term, and 5 users. The membership quota also covers reactivation.

Required repository gates pass. The new lifecycle/workflow SQL suites passed 45 assertions; the membership fix passed 5 rollback assertions. The prior compatibility/access suites passed another 44 assertions. Private-storage and expired-write API checks passed. Seven Deno tests passed. Dependency audit found zero vulnerabilities; the approximately 568 kB bundle warning remains.

This is a testing release, not a declaration of commercial or legal readiness. Evidence entry supports explicit AI-assisted processing with private browser extraction and manual fallback. One live provider connectivity call passed; the uploaded-document pipeline passed against real Supabase with an injected provider response. Online billing, actual emailed invitation delivery, and self-service additional team-member onboarding are outside the verified flow. The longer commercial plan still requires customer validation and operational/privacy review. See the testing handover for tomorrow's steps and the deployment report for operational limits.

## Final AI integration checks

005 approval finalization: 9 SQL assertions and 16 live API assertions passed. 006 document analysis: 17 SQL assertions and 14 real Auth/database plus simulated-provider assertions passed. Built-browser PDF and DOCX extraction, provider acknowledgement gating, saved AI-draft report, source references, and completed-run reuse passed. Supabase `analyze-resume` now rejects the old arbitrary resume payload before any provider request.
