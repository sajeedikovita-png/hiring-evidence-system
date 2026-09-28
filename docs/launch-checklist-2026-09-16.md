# Launch checklist — 16 September 2026

This checklist records the current launch evidence. Live observations are separated from repository checks and from work that still needs an authorized live account or environment.

## Verified today

- Live batch review showed 20 fictional completed reports and one unprocessed record.
- Live candidate filtering showed six React/missing-evidence results and one Amanda search result. The empty decision form kept **Save decision** disabled.
- A fictional public-professional-evidence comparison was saved and remained visible after reopening the report.
- The Hiring Evidence Guide answered the support question about reporting a problem and safe diagnostics.
- One synthetic low-priority support issue was recorded for human review with reference `FA749B7D`.
- Public pages disclose the S$500 one-time pilot, S$800 for each of the first three ongoing terms, and S$1,400 from term four. They state that access requires manual agreement and that there is no automatic charge or renewal.

## Repository verification

- `npm run typecheck` passed.
- `npm run test` passed, including the candidate-list filter test and 28 Deno edge-function tests.
- `npm run build` passed. Existing large-chunk and PDF standard-font advisories remain.
- `npm audit --audit-level=high` passed with zero vulnerabilities.

## Pending live validation

- Owner sign-in, inbox receipt of FA749B7D, advisory triage, closure persistence, and queue cancellation are now verified. Owner notification is recorded Sent; mailbox receipt is not independently verified.
- Linked-database rollback suites passed 62 assertions: workspace hardening 15, workspace behavior 21, approval finalization 9, company-access policy 17. Migration 202609160002 fixed two missing audit actions; the policy suite passed again after application. This validates database controls, not a complete two-customer browser journey.
- Actual invitation/recovery mailbox delivery, including spam placement and hosted template rendering, still needs a controlled address check.

## Commercial and privacy limits

- Cancellation, refunds, payment method, taxes, paid-workspace retention, and deletion are currently reserved for the written customer agreement. No public cancellation or refund policy is published.
- A direct public support/privacy contact is not exposed; the privacy page refers to the pilot representative or the request form.
- Broader legal and privacy readiness still requires customer-facing processing notices, retention/deletion execution, subprocessor and transfer details, breach procedures, a DPA, and legal review. Pricing disclosure and technical access controls do not establish legal compliance or customer willingness to pay.

## Fixes published today

- Migration 202609160001 cancels closed-ticket developer work and prevents requeueing/new approvals. Its five-assertion rollback behavior test passed after application.
- Closed-ticket triage/approval UI guards deployed to hiringevidence.com (5l2aoolwq deployment).
- Migration 202609160002 preserves the existing audit allowlist and adds the two required special-company-access events. No customer membership was changed by these migrations.
- sachimdk@gmail.com is an existing sample customer, not a fresh registration; do not create a duplicate workspace to claim fresh onboarding.
