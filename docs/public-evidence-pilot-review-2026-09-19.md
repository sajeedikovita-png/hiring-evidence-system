# Public professional evidence pilot review — 2026-09-19

Target: https://hiringevidence.com. Local HEAD: c662979, with substantial pre-existing uncommitted changes including this feature. Current working tree and deployed release must not be assumed identical.

AI provides job-related evidence. The recruiter verifies the evidence and makes the decision.

## Current evidence

- Read AGENTS.md, the feature component, service, edge function and relevant migration.
- Live homepage and company sign-in page opened successfully. This browser is not authenticated; further live testing awaits pilot-user sign-in.
- Existing `public-evidence-fictional-qa-2026-09-16.md` records an authenticated fictional-text comparison and persistence after reload. This is historical evidence, not a fresh test or proof of real source authenticity.
- The edge function sends role criteria, resume evidence, source title and pasted excerpt to OpenRouter. It does not retrieve the public URL. The deployed provider/model configuration has not been verified in this review.
- Fresh local typecheck, full test suite, build and `npm audit --audit-level=high` passed. Audit: zero vulnerabilities. Build warns about chunks above 500 kB. Automated provider tests use injected transports.

## Issue register

| ID | Step | Expected | Actual / evidence | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| PE-04 | Submit an invalid source URL | Explain which URL rule failed so the recruiter can correct it | Source review: browser URL field accepts HTTP while SQL requires HTTPS; SQL additionally restricts LinkedIn URLs to profile paths. The edge function maps preparation errors to a generic 403, and the service only exposes the invocation error message. | Medium usability | Source-confirmed; live reproduction pending |

No new authenticated comparison or hiring decision has been submitted in this review.

## Simple pilot sequence

1. Sign in and open an authorised test candidate report with role criteria.
2. Find Public professional evidence. Check Compare is disabled until the confirmation box is checked.
3. Use a genuinely candidate-supplied/confirmed HTTPS link and a short, accurate job-related excerpt. Do not simulate real candidate confirmation. A fictional fixture requires explicit agreement that the confirmation is test-only.
4. Compare once. Record elapsed time and the exact success or error message.
5. Check each finding against the pasted excerpt and its named role criterion. Record unsupported claims, missing context or confusing instructions. Confirm human verification remains visible.
6. Reload the report: the saved comparison should remain. Open source and check it reaches the intended page. Verify the human decision is unchanged.

Before a real submission, identify the authorised record and source and confirm disclosure of its role criteria, existing CV evidence, source title and excerpt to the configured AI provider.

## New issue template

## Signed-in continuation

- Sign-in succeeded. The account initially landed on administrator access requests.
- Historical report HER-20260912-FE3381 displayed: “The requested report is not available in this company workspace.” This alone does not establish an access defect or cross-company isolation coverage.
- Following Jobs → Frontend Developer → Candidates opened accessible report HER-2026-0521-AL. Its criteria are React production experience and AWS deployment work.
- Public professional evidence form is present; Compare is disabled while candidate confirmation is unchecked. No comparison submitted.
- Baseline human decision is already “Hold for review”, with a prior browser-QA reason. Preserve this value during testing.
- Awaiting the user's choice of authorised real source or explicitly fictional test material before provider submission.

ID / step / expected / actual exact text / repeatable? / severity / status.

Keep passwords, tokens and candidate personal details out of this log. Cross-company isolation, real source authenticity and failure recovery remain unverified live.
