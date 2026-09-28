# Support live acceptance — 2026-09-16

Scope: first launch-check step only, authorised by the owner; synthetic data.

- PASS: Asked the live Hiring Evidence Guide how to report a problem and what to omit. It returned relevant steps (summary, priority, details, safe diagnostics) and told the user to omit candidate names/documents, passwords, tokens and confidential records.
- PASS: Submitted one low-priority synthetic problem titled `QA TEST 2026-09-16 - Support delivery verification`. UI confirmed recording for human review with reference `FA749B7D`.
- BLOCKED: Opening `/admin/support` as the current signed-in workspace account returned `Platform administrator access is required for this page.` No permissions were changed or bypassed.
- PENDING: Sign in with the existing platform-owner account, locate the test request, run advisory triage, and close the test request after verification. No work-order approval is authorised by this test.
- NOT VERIFIED: Owner notification/email delivery, live cross-company isolation, unknown-question escalation, or full support production readiness.

Required repository checks passed: typecheck, full tests (28 edge-function tests included), build and npm audit --audit-level=high (zero vulnerabilities). Existing PDF standard-font and build bundle-size warnings remain. No application code changed in this step.

## Owner retest later the same day

Owner signed in successfully. The matching FA749B7D request appeared in `/admin/support`. Advisory triage completed with status Draft and recommendation “Needs human support review before any developer recommendation.” The owner test note was saved and Close request succeeded; after a full reload the close control remained disabled. No work order was approved.

Site operations records the owner email as Sent (mailbox receipt not independently checked). It also exposes a follow-up defect: the closed issue still has a queued developer job. Queue/closure handling is under investigation; support is not yet marked fully complete.

## Queue defect fixed and retested

Applied migration `202609160001` after a linked-database rollback rehearsal. Closing an issue now closes nonterminal developer jobs, revokes leases, records closure events, and prevents requeueing or new/approved change requests for closed issues. Existing closed issues were reconciled. The rollback SQL behavior test passed again after application.

Published the closed-ticket UI safeguards to `hiring-evidence-system-5l2aoolwq-sajeewas-projects-b911d5d0.vercel.app`, aliased to hiringevidence.com. Live operations now shows FA749B7D developer work Closed. Live support inbox shows its approval button disabled. Core guide, ticket delivery, advisory triage, closure and queue cancellation are verified. Actual mailbox receipt, unknown-question escalation and approval-authority behavior are separate unverified live checks.
