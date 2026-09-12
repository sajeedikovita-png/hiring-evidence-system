# AI support and maintenance plan

Status date: 11 September 2026

## Purpose

Hiring Evidence is operated by a solo founder who must protect time for music and marketing. The support system should answer routine product questions, capture useful problem reports, organise requests, and prepare reviewable developer recommendations without giving customer messages authority over code or production systems.

The first release is tested alongside the owner acceptance test. It does not replace the product's pilot-readiness gates.

## Agent responsibilities

### Customer help agent

- Gives friendly, concise, page-aware product guidance.
- Uses only approved, versioned Hiring Evidence instructions.
- States when it is uncertain and creates an escalation instead of inventing an answer.
- Never reads candidate documents, report contents, secrets, other-company records, raw stack traces, or signed URLs.
- Has no access to code, Git, shell commands, deployment, email sending, database mutation tools, or external browsing.

### Issue triage agent

- Classifies a support message as a question, bug, feature request, access issue, privacy issue, or other request.
- Produces a redacted summary, severity suggestion, reproduction information, customer impact, and next investigation step.
- Cannot approve work, alter customer access, edit code, or deploy.

### Developer recommendation agent

- Converts an eligible issue into a bounded proposed work order.
- Records the suspected area, acceptance criteria, test plan, risk, rollback consideration, and information still needed.
- Cannot run code or change production from the customer-facing system.

### Platform owner

- Reviews the exact recommendation and its content hash.
- May approve or reject preparation of an implementation task.
- Approval expires and becomes invalid if the recommendation changes.
- Approval does not itself create code, a commit, a pull request, a migration, a configuration change, or a deployment.

### Coding task

- Runs separately from the customer-facing support system after valid owner approval.
- Reproduces the issue, prepares a small change, runs repository checks, and creates a reviewable preview or diff.
- Production release remains governed by the normal deployment workflow and recorded verification.

## Customer flow

1. An authenticated workspace user opens `Help` from the current page.
2. The panel explains that responses are AI-assisted and asks the user not to paste candidate or confidential information.
3. The user asks a product question.
4. The help agent answers from the approved knowledge base or says it cannot confirm the answer.
5. The user may report a problem or request a feature.
6. The system captures only the page path, product area, browser category, message, and safe error reference selected for support.
7. The triage agent creates a structured owner-inbox item.
8. The customer receives a reference code and can continue working.

## Owner flow

1. The platform owner opens the support inbox.
2. Items show company, requester, category, affected page, severity, redacted summary, and status.
3. The owner can mark routine questions resolved or request more information.
4. Eligible bugs and feature requests may receive a developer recommendation.
5. The owner reviews the precise recommendation, risk, test plan, scope, and expiry.
6. Approval creates one immutable authorisation event for a separate human-reviewed implementation task.
7. The eventual implementation links back to the support reference and records its verification and release state.

## Non-negotiable security boundaries

- Derive user and company identity from the authenticated session on the server. Never accept a customer-supplied company ID as authority.
- Treat every customer message and knowledge document as untrusted data.
- Use only an allowlisted and versioned support knowledge base.
- Remove tokens, keys, signed URLs, connection strings, stack traces, and candidate identifiers from model input and stored summaries.
- Do not send candidate documents or evidence-report contents to the support model.
- Enforce message length, submission frequency, open-ticket, and model-call limits per user and company.
- Keep provider credentials in Edge Function secrets.
- Validate every model output against a strict schema and safe-language rules.
- Store approvals and events in separate append-only, server-written records. Browser roles receive no direct write authority.
- Bind approval to the recommendation content hash, owner, affected scope, risk, timestamp, and expiry.
- Editing a recommendation invalidates its approval.
- `Approved` means approved for implementation preparation. It never triggers production changes.

## Initial operating decisions

- Candidate information is prohibited from support context.
- Support is available only to authenticated, active workspace users.
- Platform support owners are maintained separately from company administrators.
- Routine support records use a 90-day default retention target, subject to the final privacy and legal-retention review.
- Privacy, security, suspected data exposure, and account-isolation issues are always high priority and require platform-owner review.
- Provider failures produce a safe fallback and escalation reference; they never expose internal errors.

## Acceptance test

The first release is ready for controlled testing only when all of these pass:

1. A signed-in pilot user opens Help from Jobs and receives page-specific guidance.
2. A normal question is answered from approved knowledge.
3. An unknown question produces an honest escalation rather than invented instructions.
4. A problem report creates one company-scoped reference.
5. The platform owner sees the redacted item in the support inbox.
6. The triage output separates a bug from a feature request and contains no candidate data or secrets.
7. A non-owner cannot read the platform inbox or approve a recommendation.
8. Company A cannot infer or read Company B support records.
9. A prompt-injection message cannot change agent instructions or cause an external action.
10. Invalid provider output and repeated/concurrent requests fail safely without duplicate recommendations.
11. Owner approval creates one immutable event and causes no code or deployment side effect.
12. Rejection and expiry are visible and auditable.

## Later automation gate

Connecting approved work orders to an automated coding environment is a later phase. It requires an isolated repository worker, least-privilege GitHub access, a branch-only change policy, secret scanning, dependency and migration controls, mandatory tests, reviewable diffs, preview deployment, rollback, and a separate production-release authorisation. Customer text must remain data throughout that workflow, never executable instructions.
