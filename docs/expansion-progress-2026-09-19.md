# Hiring Evidence expansion — execution record

The September 19 product-expansion plan and detailed build backlog are the working roadmap. Customer acceptance testing accompanies development; a pilot sign-in is not a prerequisite for local implementation. Preserve S$149 pricing, accepted agreements, existing customer records, and human-entered hiring decisions.

## Whole-plan checklist

| Workstream | State | Next acceptance milestone |
| --- | --- | --- |
| R0 dependable foundation | Partial historical proof; live gaps remain | Fresh inbox/recovery/support delivery, two-company journey, actual privacy operations |
| PIPE-01 / TASK-01 | Implemented; database migrations deployed; signed-in single-user read path verified; frontend preview pending final acceptance | Authenticated save/reload with a second reviewer; cross-role dashboard rollup remains later work |
| NOTE-01 | Implemented; database migrations deployed; signed-in empty-state read verified; no customer note created | Owner acceptance plus two-user create/edit/conflict and shared-snapshot leakage checks |
| INT-01 / INT-02 | Implemented; database migrations and frontend preview deployed; signed-in deployed save/reload/edit/history and client-summary exclusion checks passed | Second-reviewer conflict check |
| CFG-01 / CFG-02 / CFG-03 | Implemented; migrations and stable preview deployed; signed-in admin save/reload/reset and real workflow/report application passed | Live platform-owner enable/disable and second-company browser acceptance |
| CLIENT-01 / SHARE-02 / IMPORT-01 | CLIENT-01 implemented, migrated and accepted in stable preview; SHARE-02 and IMPORT-01 planned | Second-role/client acceptance, then recipient-authenticated summaries and CSV preview/duplicate review |
| Website depth and design | Five pages and responsive navigation implemented and checked locally; not deployed | Add industry-specific validated examples, actual workflow screenshots and remaining feature pages after release |
| Narration and demos | Existing videos; sharing insert pending | Capture completed workflows, then update narration/captions/transcript |
| Integrations | Demand-led later work | Select one repeatedly requested integration and define authorization/retry behavior |
| Singapore sales and regional expansion | Draft materials exist | Recruiter observation, validated offer and authorized outreach; regional representatives later |

## Current implementation slice

Candidate workflow is application-scoped. New, Evidence review, Interview, Client review and Closed organize work; they do not change a hiring decision. A reviewer can assign an active company member, record a next action and due date, filter their work and inspect activity. Dates are stored as UTC and displayed in the browser's local timezone. In-app due dates do not send reminders.

The database must authorize every read/write, reject invalid assignees and expired writes, and reject stale versions. Existing applications read as New/version 0 until their first explicit save. Closing a role or moving a candidate stage must not rewrite decisions or erase evidence. Historical disabled assignees must remain visible for reassignment.

## Evidence and release boundaries

- Implementation, automated verification, browser fixture verification, deployed behavior, and owner acceptance are separate statuses.
- No production migration or deployment is implied by local implementation.
- Existing substantial uncommitted work predates this slice and is preserved.
- Customer testing continuation remains in customer-testing-continuation-2026-09-19.md.

## Completed implementation and verification in this session

- Candidate stages/assigned reviewer/next action/due date/history integrated into the job candidate list and authenticated report. Missing server applications show an unavailable count rather than fabricated editable defaults. My work and Overdue filters operate within the displayed job/candidate scope. This is not a company-wide dashboard rollup or a drag-and-drop board.
- Version-checked update RPC, company-scoped read/history RPCs, immutable-to-customers event records, active-assignee checks and fail-closed write entitlement checks added in migration 202609190004. Reads remain available in an active company with expired write access. Workflow and human decision state remain separate.
- Guide knowledge migration 202609190005 describes the implemented workflow, conflict recovery and boundaries. It follows the existing active-platform-owner approval seed pattern.
- Native date browser test exposed a filled value not reaching the save. Fixed by reading the submitted native date and synchronizing input/change events. Sydney DST-gap inputs now fail explicitly instead of silently shifting an hour.
- New /product, /product/evidence-review, /solutions/recruitment-agencies, /solutions/hiring-teams and /resources pages share an editorial template, existing human illustration, worked fictional example, practical steps, FAQs and CTAs. Navigation now exposes Product, Solutions, Demo, Pricing and Resources, with a mobile menu and visible sign-in. Pricing links existing terms; commercial terms were not changed. Pipeline/interview/customization features are not advertised as deployed.
- Required final checks PASS: npm run typecheck; npm run test (including new service/render/page route tests and 28 existing edge-function tests); npm run build; npm audit --audit-level=high (zero vulnerabilities). git diff --check also passes. Existing PDF standard-font and >500 kB bundle warnings remain.
- npm run test:workflow-db PASS using isolated PGlite: actual current_company_ids membership function, company isolation, direct-write denial, anonymous denial, inactive members/assignees, admin/recruiter/hiring-manager access, stale saves, no-op activity, history attribution after profile deletion, unchanged decisions, role-closure preservation and knowledge seed approval/idempotency. The entitlement helper is a fixture stub; this does not prove the deployed entitlement lifecycle.
- Browser component fixture PASS: stage/owner/action save, visible acknowledgement, native due-date save and reload, failed-save draft retention/retry, concurrent-save rejection, My work + Overdue filtering, former-reviewer warning, read-only form/no save action, 390px layout without horizontal overflow. The fixture persists only fictional records in browser local storage, not Supabase. Browser and SQL tests are separate evidence, not a complete deployed end-to-end test.
- Public browser checks PASS: product desktop layout, Solutions → agency route, 390px menu → Resources with automatic menu close, visible sign-in, native dropdown Escape dismissal, and no horizontal overflow at 390/768/1440px. Product illustration and readable editorial layout visually inspected.

Local previews while the development server runs: http://127.0.0.1:3012/product and http://127.0.0.1:3012/output/qa/candidate-workflow/index.html. The workflow fixture is explicitly labelled fictional and excluded from production build/deployment; no account or production candidate was changed.

To repeat isolated SQL checks, install the optional test runtime with `npm install --prefix /tmp/hiring-pricing-db-test @electric-sql/pglite --no-audit --no-fund`, then `npm run test:workflow-db`. Alternatively set PGLITE_MODULE_PATH to its installed dist/index.js. No database URL or production credentials are used.

## Next development steps

1. Add a second company reviewer before testing assignment and stale-update conflict behavior. Production frontend publication is still outstanding.
2. Complete the NOTE-01 owner save/reload/edit/history check, then repeat NOTE-01 and INT-01/02 collaborative stale-update checks with a second reviewer. Keep both internal notes and interview records out of client summaries unless a later reviewed feature explicitly approves selected fields.
3. Continue to Release 4 recipient-bound collaboration and import after a platform-owner feature-control check. Website industry depth and demonstration updates follow the documented roadmap order. R0 customer/email/privacy proof remains parallel work, not a replacement for the expansion.

## Release/recovery procedure for this slice

1. Verify the new migration in isolated PostgreSQL with two companies, multiple roles, inactive/expired access and stale writes.
2. Run typecheck, full tests, production build and high audit; inspect the integrated list/report interface in a browser.
3. Review the migration and frontend together in a preview before production publication.
4. Deploy the migration before the new frontend. If workflow loading fails, the evidence list remains available and workflow controls show an error rather than fabricated saved state.
5. Roll back the frontend to recover from UI issues; retain workflow tables/history. Do not drop populated tables to roll back a release. Correct backend issues through a reviewed forward migration.
6. Before real-data rollout, include workflow next actions and event snapshots in the documented export/deletion/retention process.

## Signed-in placement follow-up

Added a dedicated authenticated **Workflow board** page beside each role's Candidates action in Jobs. It uses the company's real candidates and provides the complete stage, reviewer, next-action, due-date, filtering and activity experience that was previously visible only in the fictional QA fixture. Added **Manage stage and next action** beside the evidence-review shortcut on private reports. The workflow remains inside authenticated company routes and is absent from the public sample. These navigation changes are local; production frontend publication remains outstanding.

On September 19, migrations 202609190004 and 202609190005 were applied to the configured Supabase project after the isolated database test passed. The signed-in `sachimdk` company workspace then loaded workflow state for all 21 candidates and loaded the workflow panel on Amanda Lee's private report. Existing candidates correctly began at New and Unassigned because no workflow update had been saved. No candidate workflow record or hiring decision was changed during this verification. The production frontend remains unpublished.

The Jobs page now shows an explicit loading state and an indeterminate role count while company roles load, preventing the temporary and misleading “No jobs yet” message observed during signed-in testing.

Workflow is now a primary signed-in navigation item rather than a feature discoverable only inside a role. The `/workflow` hub explains team responsibility and lists every company role with a prominent workflow-board action. The dashboard also presents ownership, next action, due date and change history as a major team task. Each role board still provides the detailed assignee and attributed activity record.

Use `https://hiring-evidence-system-preview-sajeewa.vercel.app` as the stable owner-review preview. Point this alias to each accepted preview deployment and reopen it in the Codex browser after changes so the owner does not remain on an obsolete deployment URL. The first sign-in on this origin is required once; production remains separate.

## Internal recruiter notes follow-up

NOTE-01 now uses application-scoped `candidate_internal_notes` and immutable note events. Notes distinguish candidate explanations, reviewer observations and verification records; a verification label does not itself prove a claim. Text is trimmed plain text limited to 4,000 characters. Author display-name snapshots, timestamps, versions, idempotent creation, author-only editing and stale-edit rejection are enforced server-side. Company membership and writable access are checked by RPCs; direct authenticated mutations are denied. Deleting an application cascades its private notes and revisions while leaving human decisions outside that cascade.

The Workflow board exposes **Internal notes** beside every candidate, and authenticated private evidence reports provide a prominent Internal notes shortcut and panel. The panel explicitly states that notes remain company-private and excluded from client summaries and shared reports. Public synthetic and shared-report routes do not mount or request the notes panel. Migrations 202609190006 and 202609190007 are deployed. The signed-in `sachimdk` workspace successfully loaded Amanda Lee's empty notes composer after deployment; no real note was saved during verification.

## Interview and verification follow-up

INT-01/02 now uses a versioned application-level interview plan plus criterion-linked interview items. Each item stores the criterion wording that applied when it was created, the job-related question, candidate answer, reviewer observation, source/reference and one of four verification states. Candidate explained remains an outstanding check. Supporting evidence added requires a source/reference but does not assert that the source is reliable or the claim is proven. Item creation is idempotent; plan and item edits reject stale versions; schedule and item history preserve attributable display-name snapshots. Company, active-role and writable-access checks run in security-definer RPCs while direct authenticated mutations are denied. Application deletion cascades interview records and history without touching the separate human decision.

The real Workflow page exposes **Interview & verification** as the primary action beside every candidate. The workspace shows the planned date, unresolved checks, criterion-linked question/answer fields, verification state, saved records and edit history. It states that scheduling sends no invitation or reminder and that these records remain private and excluded from shared/client summaries. Migrations 202609190008 and 202609190009 are deployed.

Signed-in owner acceptance passed first in the local frontend connected to the configured Supabase project and then on the stable deployed preview. For Amanda Lee, `sachimdk` saved a September 24 interview plan and a fictional React criterion record, reloaded the full Workflow page, then edited the record from **Candidate explained** to **Still unresolved**. On the deployed preview, the saved plan and both versions loaded after a full reload; a further reviewer-observation edit was saved through the deployed interface, survived another reload, and appeared as a third attributable history version. Amanda's deployed client-summary preview did not contain the unique private question, candidate answer, reviewer observation or source/reference. The separate human hiring decision was not changed. This proves the single-owner deployed flow; it does not prove simultaneous second-reviewer conflict handling in a real browser or cross-company access with two live accounts. Reusable company-wide templates and AI-generated question drafts remain future enhancements.

## Company configuration and controlled access follow-up

CFG-01/02/03 is implemented in migrations 202609190010–202609190012 and the authenticated Company tab. Company administrators can edit a typed, validated display name, secure logo URL, readable accent, workflow stage labels and display order, review defaults, report branding, up to five job-related field definitions, and immutable review/report template versions. The page provides a live preview, safe reset, optimistic version checks and attributed history. Saved stage labels/order drive the real candidate workflow. Saved report branding and the selected report-template footer drive the private client-summary preview; new expiring links freeze that branding into their immutable snapshot.

Platform company controls are a separate route and API. Only a platform administrator can record feature entitlements or advance custom-work requests. Each entitlement stores a written reason, optional dates and versioned history; disabling retains earlier records. Company custom-work requests follow request, clarification, feasibility, written scope/quote, preview, acceptance, enabled, maintenance and closed stages. Direct authenticated table writes are denied, and all customer reads remain company-scoped.

Signed-in deployed acceptance with `sachimdk` passed on the stable preview: defaults loaded for ABC; a temporary `Received` stage label and ABC client-summary heading/footer saved as version 1; reload retained them; the live workflow showed `Received`; Amanda Lee's client-summary preview used the saved heading/footer; reset restored defaults as version 2 while preserving both history entries. A second acceptance run moved Evidence review ahead of New, saved audited version 3, confirmed that order in the real Workflow screen, and restored defaults as version 4. Direct navigation to platform controls correctly returned `Platform administrator access is required` for this company-admin account. No custom-work request or feature entitlement was created. Isolated PostgreSQL tests passed for two-company isolation, role checks, stale writes, audit history, expiry and deletion. A live platform-owner entitlement mutation and a second-company browser check remain unverified.

After each completed implementation slice, deploy a Vercel preview, repoint `https://hiring-evidence-system-preview-sajeewa.vercel.app`, and open the exact changed preview screen in the Codex browser. Do not leave the owner on a local QA fixture or an obsolete immutable deployment URL.

## Candidate sharing authority and controlled-link acceptance

Migration 202609190014 adds one versioned sharing-authority record per company/application plus immutable record, update and revocation events. Authority bases are candidate confirmation, documented recruitment process or other documented authority, each with a required source/reference. Company-scoped security-definer RPCs enforce active membership, allowed reviewer roles, writable access and optimistic versions; direct authenticated writes remain denied. This record is deliberately separate from CV upload authority and the interface states that Hiring Evidence does not decide whether sharing is legally permitted.

Client-link creation now requires an active authority record. Public reads recheck active authority, and migration 202609190015 permanently revokes every active link when authority is revoked. A later authority record cannot revive an earlier bearer URL. The stable deployed preview completed the fictional `HER-20260919-8002EE` lifecycle: record authority, create seven-day link, read branded public snapshot, revoke authority, reload the same link to `Summary unavailable`. The test authority remains revoked. Embedded PostgreSQL coverage repeats this lifecycle and also confirms that missing authority blocks creation and re-recording authority does not revive a revoked link.

Frontend deployment: `https://hiring-evidence-system-jg6kgz6uc-sajeewas-projects-b911d5d0.vercel.app`, assigned to the stable preview alias. The production website was not redeployed.

## Candidate identity and complete fictional report follow-up

Migration 202609190016 adds a versioned, company-scoped candidate-name record and immutable attributed history. The authenticated report now asks a reviewer to check and record the name with a reason. It explains that this changes the report label only and does not verify identity, qualifications, consent or sharing permission. Unknown names display `Name not recorded`; uploaded filenames are not silently presented as candidate names. New immutable client-summary snapshots use the recorded name, while older snapshots remain unchanged.

On the stable deployed preview, `sachimdk` recorded `Avery Tan (fictional)` for report `HER-20260919-8002EE` and confirmed the same name after reload and in a newly created public snapshot. The configured AI provider analysed candidate-confirmed fictional GitHub text against all three criteria, retained the successful result after reload, and accurately asked for authorship and production-deployment verification. A private verification note, workflow assignment, due date, planned interview, criterion-linked question, fictional answer, reviewer observation and unresolved state were then saved and reloaded. The separate human decision remained `Request more information` with its human-entered reason. A decision-inclusive client link was opened successfully and then made unavailable by revoking sharing authority.

## Guide latest-feature follow-up

The deployed Guide initially escalated the greeting `Hi`, creating an unnecessary unresolved support item. The frontend now handles short greetings directly with one sentence and no support conversation or issue; a focused regression test covers that boundary. Migration 202609190017 adds approved product knowledge for candidate identity, public professional evidence and controlled client sharing. Deployed testing showed the typing indicator, a four-step sharing-authority answer with an example, and the correct statement that public professional evidence analyses pasted text without opening the URL, searching the web or scraping a profile.

Current frontend deployment: `https://hiring-evidence-system-ah980w4tq-sajeewas-projects-b911d5d0.vercel.app`, assigned to the stable owner-review alias. Production was not redeployed.

## Agency clients and role context follow-up

CLIENT-01 is implemented in migration 202609190018 and the prominent authenticated **Clients** navigation item. Client organisations belong to the agency’s existing company workspace. They do not create or merge a platform company, add an internal user, create a portal, grant report access or send an invitation. Administrators and recruiters can manage the name, private contact fields, internal notes and active/archived status. Hiring managers receive only the client identity and status. Archiving preserves existing role context and history while blocking new assignment.

Each job can have one optional client context with an attributed version history. Company consistency is enforced by a composite foreign key and every RPC derives company and role from the authenticated session. Direct authenticated table reads/writes are denied, stale saves fail, creation is idempotent, linked records cannot be physically deleted, and the isolated PostgreSQL test covers cross-company access, restricted contacts, archive behavior, history and entitlement failure.

Deployed acceptance created `Northstar Logistics Singapore (fictional)`, saved fictional contact details and an explicit no-sharing note, assigned it to the Frontend Developer role, then reloaded and confirmed both the record and attributed assignment history. The Guide correctly explained that this creates no portal, account, invitation, seat, report access or separate company. Migration 202609190019 supplies the approved Guide facts.

Current frontend deployment: `https://hiring-evidence-system-f0wm1ueff-sajeewas-projects-b911d5d0.vercel.app`, assigned to the stable preview alias. Production was not redeployed.

## Support and maintenance boundary review

The support queue remains a controlled preparation workflow. The callable Edge Function requires a private worker token, claims one job with an expiring lease, and accepts heartbeats only for that claim. Database guards permit prepared/preview status only for allowlisted low-risk bug categories and safe changed files. A preview-ready result requires typecheck, tests, build and high audit to pass plus a Vercel preview URL and deployment evidence. The worker update path cannot record a production release. Owner operations reports customer requests, notification state, triage, developer status, checks, preview and audit history.

No recurring scheduler or deployment configuration for that worker was found in this repository. Therefore the code and tests establish bounded capability, not an active unattended maintenance service. The September 16 synthetic support record establishes owner-inbox visibility, triage, closure and queue cancellation. The operations row marked the owner email Sent, but actual mailbox receipt and a fresh authorised customer reply remain unverified.

## Real fictional-data acceptance — company configuration

The stable deployed preview now contains database-backed fictional company data for **ABC Recruitment Singapore**. Settings version 8 stores a same-site fictional SVG logo, plum accent, five workflow labels, review/report wording, five job-related custom-field definitions, one immutable review template and one immutable report template. A fictional custom-work request is stored at the request stage with its event history. These are persisted Supabase records, not the local QA fixture.

A new `synthetic-pilot-candidate.pdf` application was uploaded through the deployed private-upload flow, its selectable text was reviewed, and the configured real AI provider generated report `HER-20260919-8002EE`. The real Workflow displayed all five configured labels. The private client-summary preview displayed the saved company name, same-site logo, plum accent, report heading and active report-template footer. Reload checks passed for settings, fields, templates, request and audit versions.

Acceptance exposed two issues. First, a general text sanitizer removed the approved HTTPS logo URL from client summaries. The frontend was corrected and migration 202609190013 now preserves only a validated HTTPS logo URL in new shared-summary snapshots; other report text still removes links and email addresses. Second, expiring links remain correctly blocked because both the older batch and newly uploaded applications have `consent_status = missing`. The upload checkbox records the organisation's lawful-basis attestation and explicitly does not represent candidate consent. Do not bypass this boundary or claim shared-link completion: a separate, honest candidate confirmation/authority capture flow is required before browser acceptance of create/read/revoke.
