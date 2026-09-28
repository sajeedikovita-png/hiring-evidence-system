# Hiring Evidence — detailed implementation backlog

Prepared 19 September 2026. This extends product-expansion-plan-2026-09-19.md. Planning only: none of the proposed features below should be represented as shipped. Preserve the existing S$149 offer and accepted agreements.

## Outcome and first customer

Target small specialist recruitment agencies first, with small internal hiring teams as a secondary audience. Complete one useful journey: receive a client brief → define criteria → import CVs → review evidence → assign follow-up → record interview verification → prepare an approved client submission → record the human decision.

Sell a demonstrated improvement to that journey, not a promise to replace every Workable feature. Feature quantity, colourful pages and B2B positioning do not establish willingness to pay. Use customer observation to decide which later modules deserve investment.

## Release 0: dependable foundation — blocking gate

- Fresh account: request, approved invitation received in a controlled inbox, password setup, login, logout, recovery and expired-link behavior. Do not count an existing account as a fresh test.
- Support: customer creates an issue, sees acknowledgement and status, owner receives it, customer receives an authorized reply. Confirm the actual support mailbox and delivery.
- Data operations: rehearse access/export, correction, withdrawal and deletion with fictional data. Verify database records, uploaded files, report snapshots and shared access. Explain any backup retention accurately; never claim immediate backup erasure without evidence.
- Access: two distinct companies, admin/recruiter/hiring-manager roles, disabled users and expired terms. Test direct API calls as well as hidden buttons.
- Reliability: pending/failed/retry states, duplicate submit protection, request identifiers, safe logs without candidate text, error recovery and restore procedure.
- Delivery evidence: small acceptance log with date, environment, expected/observed result and remaining defect. No customer payment or bulk real-data onboarding based solely on passing unit tests.

## Release 1: daily recruiter workspace

### PIPE-01 — candidate stages

Extend each job application with a workflow stage. Default stages: New, Evidence review, Interview, Client review, Closed. A stage is workflow organization, not an AI assessment or hiring outcome. Keep the existing human decision record separate. Closing a job must not close or reject all candidates automatically.

Screens: Jobs → candidate list, candidate report header and Dashboard. Start with an accessible stage dropdown, filters and stage counts. Add a board view after the list works; every drag action must have a keyboard alternative. Include empty, loading, expired-access and failed-save states.

Data proposal: application_workflow records keyed by application/company; stage ID, assigned profile ID, next action, due_at, version and timestamps. Application/company consistency and assigned-user membership checked server-side. Reuse existing application IDs; do not create a competing candidate database. Add an immutable workflow_events record or use the existing audit boundary.

Acceptance: state persists on reload; concurrent stale edits report a conflict; historical applications get a safe default; another company cannot read/update; a role being closed does not erase application progress. Recorded hiring decisions still require a human-entered reason.

### TASK-01 — ownership and next action

Assign an active company recruiter, enter one clear next action and due date/time, show overdue items and My work. Store times in UTC and display the company/user timezone. When a reviewer is disabled, retain history and show reassignment needed. Do not silently assign a different person.

First version uses in-app task visibility. Email/calendar reminders are a later integration, not implied by a due-date field. Acceptance: filters work, late tasks remain visible, permission checks cover assignments, and no candidate changes are made automatically because a date passes.

### NOTE-01 — team notes and activity

Attributed internal notes with author/date, edits marked and access checked. Treat candidate answers, reviewer opinion and verified evidence as different kinds of information. Internal notes are excluded from client reports by default. Limit lengths and render as escaped text; do not permit arbitrary HTML.

Acceptance: no cross-company access, internal text never leaks into a shared snapshot, and removed accounts remain attributable in history without exposing unnecessary identifiers.

## Release 2: interview and verification

### INT-01 — interview preparation

From a report, select questions associated with missing or uncertain criteria. Add recruiter-authored job-related questions and a planned interview date. Offer reusable templates with versioning, reviewer and role information. AI suggestions remain editable drafts; no automatic interview outcome.

### INT-02 — answers and evidence follow-up

For each criterion record the question, candidate answer, reviewer note, source/reference, verification state, author and date. Suggested states: Not checked, Candidate explained, Supporting evidence added, Still unresolved. Distinguish an explanation from independent verification. Avoid converting those labels into a universal person score.

Screens: candidate workspace tabs Overview · Evidence · Interview · Activity · Client summary. Preserve source-document links in authorized internal views. Summarize unresolved questions for the next reviewer.

Acceptance: draft/save/reopen works; a changed criterion does not rewrite past answers; missing answers are not fabricated; only explicitly approved fields enter a new client summary; final decisions remain human-controlled.

## Release 3: company customization that actually works

### CFG-01 — supported company settings

Company admins can change display name/logo/accent, allowed stage names/order, job-related field labels and reusable review/report templates. Provide a preview and reset to defaults. Validate logos, colours and contrast; a branding change must not make reports unreadable. Preserve template versions referenced by existing records. Start with a small typed schema, not unrestricted form-building.

### CFG-02 — separately enabled features

Platform admins enable named capabilities per company under an agreed scope, with reason, dates and audit history. Enforce entitlements on the server and in service APIs; hiding a button is insufficient. No arbitrary JavaScript, SQL or customer code. Disabling a capability blocks new edits without silently deleting old data; define read/export behavior.

### CFG-03 — custom-work request process

Request → clarification → feasibility → written scope/quote → preview → acceptance → enabled for that company → maintenance record. Describe supported configuration separately from bespoke development. Scope includes acceptance, delivery, data impacts and ongoing costs. Avoid a separate repository/code fork for every company.

Acceptance: Company A can use its configuration without affecting Company B; unapproved users and direct calls cannot change or enable it; configuration changes are auditable and reversible without losing existing records.

## Release 4: agency client collaboration and moving existing data

### CLIENT-01 — client and role context

An agency may have client organizations within its own workspace. These are agency-owned client records, not a way to bypass tenant boundaries. Attach each job to an optional client record and restrict contact visibility. Do not merge clients with independent platform companies automatically.

### SHARE-02 — named-recipient portal

Existing links are bearer links: anyone holding the token may view the approved summary. Add recipient-bound authenticated access with expiry/revocation, approved immutable snapshots and attributable feedback. Design external recipients separately from paid internal user seats and state limits before offering them.

Allow client comments and requests for further evidence; keep internal recruiter notes private. Reissuing a corrected report creates a new version and offers revocation of the old one. Downloads already saved cannot be recalled. No invitation is sent without an authorized action.

### IMPORT-01 — CSV import and export

Template download → choose file → map columns → preview valid/error rows → inspect duplicates → confirm import → result summary. Require a chosen job and documented processing basis. Enforce term quotas and size/type limits server-side. Detect exact and likely duplicates for human review; never merge on name alone. Importing a CSV row does not count as receiving a CV or generating an evidence report.

Exports are scoped to the requesting company and role permissions; neutralize spreadsheet formula injection. Provide batch undo only for newly created unused records, or explicit safe reversal rules if downstream activity exists. Test malformed files, partial failures and repeated submissions.

## Release 5: integrations after demand is demonstrated

Choose one recurring need: Google/Microsoft calendar and email OR one ATS import connection. Scope authorization, token storage/revocation, least permissions, sync direction, retries, idempotency, delivery errors and disconnection. Never claim a manual file upload is an integration.

Later candidates: careers/application form with consent notice, interview scheduling, approved message templates, talent search within the company's authorized records, and simple operational reporting. Each needs a specific customer problem, acceptance tests and cost review. Broad sourcing, job-board distribution, payroll, native video interviewing and a mobile app are not the first expansion.

## Public website: detailed information architecture

Header: Product · Solutions · Demo · Pricing · Resources. Sign in and Book a walkthrough stay obvious. Footer: Support, Contact, Privacy, Terms and responsible-use/data handling. Desktop dropdowns must work with keyboard; mobile gets a readable menu rather than simply hiding navigation.

| Proposed page | Content and proof | Publication condition |
|---|---|---|
| Home | One concise promise, actual report preview, three outcomes, short demo, S$149 scope, next action | Existing features only |
| Product overview | Visual workflow from brief to client handoff; links to deeper pages | Each card labelled accurately |
| Evidence review | Criteria, source references, gaps, questions, human reason; fictional report | Can expand now |
| Pipeline and teamwork | Stages, owners, tasks, activity with real screenshots | After Release 1 passes |
| Interview verification | Questions, recorded answers and outstanding checks | After Release 2 passes |
| Company settings | Actual configurable fields and separate custom-work process | After Release 3 passes |
| Client collaboration | Precisely explain recipient access, versions and privacy boundary | Match shipped sharing version |
| Small recruitment agencies | Client brief → evidence-backed submission, separate client contexts | No unbuilt client-portal claim |
| Small hiring teams | Shared requirements, reviewer ownership and clear next steps | Show working team workflow |
| Technology hiring | Fictional developer/project/deployment example | Validate full example first |
| Professional-services hiring | Fictional client-delivery/project-scope example | Validate full example first |
| Demo | Short video, chaptered detailed tour, transcript and interactive sample | Media matches current UI/pricing |
| Pricing | One actual plan, limits, inclusions, renewal and bespoke-work FAQ | Existing offer preserved |
| Resources | Criteria checklist, interview preparation and sample submission guides | Original useful material |
| Data handling | Confirmed access, retention, deletion, support and processing details | Facts and operations verified |

Every deep page should answer: who is this for, what problem does it solve, what are the steps, what does the output look like, what is excluded, and what should the visitor do next? Industry pages need distinct examples, not the same paragraphs with an industry name replaced. Healthcare and other specialist regulated sectors wait for relevant workflow and domain review.

## Visual and audio specification

Keep dark green identity; introduce restrained teal, blue and warm gold accents on brighter neutral backgrounds. Set a shared spacing/type scale, sensible text widths, consistent cards and one primary action per section. Use labelled colours/icons, not colour alone. Review entire sections at 390, 768, 1280 and 1440 CSS pixels and with enlarged text; do not solve one gap by creating another.

Use original illustrations and genuine screenshots. Show one coherent fictional dataset. Add short action demonstrations only for working features: pointer, click/type, saved acknowledgement, result. New pages may use 30–60 second narrated explainers. Reuse the approved voice and existing clips where accurate; avoid unnecessary credit spending.

Audio starts only after user action. Provide play/pause/resume, replay, seek, volume, captions and transcript; stop the previous clip when changing chapters. Include mute, reduced-motion behavior and no dependence on animation for understanding. Interview recording/transcription is a separate future product feature, not implied by narrated marketing media.

Customer logos, testimonials and performance statistics require permission and evidence. Until available, label examples fictional. Never promise that AI makes hiring decisions or guarantees hiring outcomes.

## Implementation order, ownership and verification

Sequence: R0 verification runs alongside schema design → PIPE-01 → TASK-01/NOTE-01 → INT-01/02 → CFG-01/02/03 → CLIENT-01/SHARE-02 and IMPORT-01 → selected integration. Website design and pages about existing functions can progress alongside this sequence; newly advertised features depend on their acceptance gates.

Use small production-focused changes and migrations. Pages call services/repositories. Reuse existing auth and company access boundaries, application/report IDs and audit conventions. Each schema change needs backfill, permission tests and recovery notes. A preview alone is not a verified production release.

For every slice run npm run typecheck, npm run test, npm run build and npm audit --audit-level=high. Also test cross-company direct API access, human-decision reason requirements, save/reload, expired access, failed/repeated requests and the actual browser journey. Include relevant deletion/export consequences for every new data table. Verify rollback/recovery without erasing customer records.

No calendar promise is made for the full expansion. First inspect schema/dependencies, then estimate each slice and re-estimate after its first working preview. A first pipeline slice is a limited milestone, not a complete ATS. Workable-level breadth requires sustained development and operations, not five minutes or a single afternoon.

## Sales and cost checkpoint

Keep S$149 unchanged while testing the present package. Track analysis cost, documents/storage, support minutes, active use and renewal feedback. Supported settings may be included only after scope/cost is decided; bespoke work requires a written quote. Do not silently change existing paid agreements or use invented plan tiers.

Observe 3–5 target recruiters performing the same realistic task. Record where they struggle, how their current tool handles it, whether they would repeat it and willingness to pay. Those are research targets, not achieved results. Progress to broader investment when repeated use or paid demand supports it. Draft outreach only; no messages or purchases are authorized just by this plan.

## Exact next work session

1. Read this backlog, current release checkpoint and relevant AGENTS.md; inspect git status without discarding existing work.
2. Review candidate_applications, recruiter_profiles, current decision/audit tables and tenant policies. Choose minimal workflow schema and permissions.
3. Implement PIPE-01 migration/service and candidate-list stage control with audit history and stale-write protection.
4. Add owner/next-action/date using the same application boundary; verify two companies and two users.
5. Demonstrate with fictional records in preview; capture actual completed behavior and remaining defects.
6. Do not advertise pipeline/interview features, change the commercial offer or publish an unfinished slice.

Reference research: https://www.workable.com/features ; https://www.workable.com/industry-technology ; https://www.workable.com/industry-professional-services . These show competitor capabilities and content structure, not proof that our proposed features are unique or commercially validated.
