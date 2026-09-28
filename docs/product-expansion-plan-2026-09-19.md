# Hiring Evidence — product depth and website plan

Prepared 19 September 2026. Status: proposed expansion; not implemented by this planning task.

## Direction and honest baseline

Build a focused recruitment workspace for small specialist agencies and hiring teams. Make the client brief, candidate evidence, interview follow-up and human decision one connected workflow. B2B buyers still need proven value, dependable data handling and a reason to adopt another tool.

Available foundation: company accounts, job criteria, CV upload/text review, evidence reports, gaps/questions, human decision reasons, support, role closure/reopening, summary preview/print, and expiring bearer links. Recent release smoke checks cover selected paths, not every end-to-end journey.

Not implemented: full candidate pipeline, interview-answer workspace, company feature switches, CSV migration, recipient-authenticated client collaboration, sourcing, job-board distribution, calendar sync or full HR management. Existing job open/closed status is not a candidate pipeline. Company-specific development is currently a separately scoped service, not a settings feature.

Keep S$149 per 30-day term and existing agreements unchanged during this work. Measure provider cost, storage and support effort before promising more capacity. New functionality alone does not prove a higher price is justified.

## Product roadmap: build in this order

P0 — Prove the customer foundation. Test fresh invitation receipt, first login, password recovery, support delivery and two-company isolation. Rehearse access/export, correction, withdrawal, deletion and stored-file removal with fictional data. Record what actually happened. Resolve failures before expanding real-data use.

P1 — Candidate pipeline and ownership. Add New, Reviewing, Interview, Client review and Closed stages; assigned reviewer; next action; due date; filters; and an attributable activity timeline. Persist by application and company. Keep pipeline movement separate from the recorded hiring decision. A final decision remains human-entered with a reason. Start with list/status controls; add a board only when the same behavior is solid and keyboard accessible.
Acceptance: assignments and stage changes survive reload, concurrent edits do not silently overwrite, another company cannot read or change them, and late tasks are visible without automatically changing a candidate outcome.

P2 — Interview and verification workspace. Link questions to job criteria; save candidate answers, reviewer observations and verification outcomes with author/date. Distinguish candidate claims from independently checked evidence. Add draft/save/edit history and criterion-based team feedback, without a composite person ranking.
Acceptance: a recruiter can prepare an interview, record answers, identify unresolved evidence, and update a reasoned human decision; shared summaries never silently include internal notes.

P3 — Company customization foundation. Company admins configure permitted stage names/order, review templates, report branding and approved job-related custom fields. Platform admins enable separately agreed feature packages per company. Use a validated settings schema, versioned templates, tenant-scoped repositories/RPCs, server-side permissions, audit history and safe defaults. Preserve old records when templates change. Avoid a separate code fork per customer.
Acceptance: two companies can use different settings; disabling or changing settings does not erase records; direct API calls cannot enable unpurchased or unauthorized features. Configuration within supported settings and bespoke development are priced/described separately.

P4 — Client collaboration and migration. Replace the identity limitation of bearer links with named recipient access, scoped comments, expiry/revocation and an approved immutable summary. Keep owner approval before sending invitations. Add CSV mapping/preview, row errors, duplicate review, safe export and import rollback. Do not overwrite existing candidates automatically.
Acceptance: an unintended recipient cannot access another recipient’s report; revoked access fails; comments are attributable; duplicate rows do not silently create or merge records.

P5 — Demand-led integrations. Pick one email/calendar or ATS connection requested repeatedly by early customers. Define OAuth permissions, revocation, retry behavior and delivery observability before implementation. Calendar links are not calendar synchronization. Delay sourcing databases, mass job-board posting, payroll, native video interviews, advanced analytics and mobile apps until demand and economics justify them.

## Website navigation and page depth

Replace the crowded one-page navigation with a compact desktop menu and accessible mobile menu: Product · Solutions · Demo · Pricing · Resources, plus Sign in and Book a walkthrough. Keep real links, keyboard access and clear focus states. Footer holds Support, Privacy, Terms and responsible-use information.

Product: a useful overview plus detailed pages for evidence review, pipeline/team tasks, interview verification and client handoff. Publish a feature page only when the feature works; otherwise clearly label it Planned and do not place it among available features. Every page explains the problem, 3–4 real steps, a current screenshot, a fictional example, boundaries, FAQs and one next action.

Solutions: start with Small recruitment agencies and Small hiring teams. Within this area, add Technology hiring and Professional-services hiring only after building and testing a distinct fictional role example. Agencies are an audience, not an industry. Avoid ten shallow industry pages.

Technology example: developer role, project contribution, deployment responsibility, evidence source and questions to verify. Professional-services example: client-delivery responsibilities, project scope and documented work. Do not imply that a mentioned qualification was externally verified unless it was.

Demo: short overview, detailed walkthrough, chapter controls, transcript and a clickable fictional report. Show one consistent example across the site.

Pricing: S$149 scope, limits, manual renewal, what is included, separately quoted work and questions buyers ask. Avoid a grid of invented plans simply to resemble a larger vendor.

Resources: practical role-criteria checklist, interview-question guide, sample submission and support instructions. Add a factual data-handling page with confirmed hosting/processing/retention details; unresolved policy decisions remain internal until resolved.

Customer stories: publish only with permission and evidence. Until then, use clearly labeled fictional walkthroughs, never invented logos, testimonials or time-saving percentages.

## Colour, audio, motion and demonstration

Retain the recognizable green identity. Use brighter neutral surfaces, restrained teal/blue/gold accents and consistent headings, spacing and card styles. Colour should reinforce labeled workflow states, not rank people; always include text/icons as well. Review the whole page at mobile, tablet and desktop widths and at increased text size.

Short narrated feature clips: 30–60 seconds per finished workflow, using the already approved voice. User presses Play; offer Pause/Resume, mute, captions and transcript. Do not autoplay sound. Reuse existing narration where accurate to reduce credits and editing costs; new generation spending should be visible.

Show a real cursor click, data entry, saved result and next action. Use fictional data. Use subtle transitions and brief highlights, not continuous distracting animation. Honor reduced-motion preferences and keep the page usable without animation or audio.

Add interactive examples for role criterion → source evidence → verification question → human reason. These demonstrate behavior; they must not impersonate a working feature if the backend is missing. Keep a visible sample label.

If “audio feature” means recording recruiter interviews rather than marketing narration, treat that as a separate future feature requiring consent, access controls, retention/deletion and transcription-cost design. It is not part of the first build.

Video update rule: change the product first, verify it, then capture its screen and align narration. The new client-sharing controls still need a recorded insert. Workable’s reviewed pages support the case for illustrations and detailed content; this review did not establish a specific Workable audio feature.

## Execution, release gates and commercial validation

First implementation slice: candidate pipeline + assigned owner + next action/date + audit history. Inspect candidate_applications and existing access policies before writing migrations; use services/repositories rather than direct page data access. Build the list controls and persist them before a decorative board. Interview records follow on that foundation.

Alongside product work, design one reusable feature/industry page template and a coherent visual system in a preview. Write fuller content for currently available evidence review immediately. Add the pipeline/interview marketing pages only after those workflows pass acceptance.

For every release: migration and rollback/recovery plan; typecheck, tests, build and high-severity audit; two-company access checks; save/reload and failure/retry tests; keyboard/mobile/contrast checks; matching screenshots/narration; preview review, production deployment and focused live checks. Existing agreements and candidate records remain intact. Operational tests must prove actual file/data actions rather than merely changing request statuses.

Delivery checkpoints: (1) reliable customer journey, (2) usable pipeline, (3) linked interview evidence, (4) company customization, (5) client collaboration/import, (6) one validated integration. Do not promise full Workable parity or a same-day completion for this expansion. Estimate calendar dates after each slice’s schema and external dependencies are inspected.

Commercial validation runs alongside development: observe 3–5 target recruiters using a fictional client brief and a small candidate set. Record completion, confusion, current-tool comparison, repeat-use intention and willingness to pay. Do not invent results. Prioritize the problems that prevent repeated use; do not build every requested feature automatically.

Keep outreach as drafts until explicitly authorized to send. Additional paid tools, subscriptions and new voice generation are not purchased merely because they appear in this plan. This document is a plan, not a claim the expansion has shipped.

## What the Workable review supports

Reviewed 19 September 2026: the pricing-page Industries menu links to Construction & Engineering, Healthcare Services, Real Estate & Property Services, Technology, and Professional Services.

The Technology and Professional Services pages combine audience-specific needs, feature sections, illustrations, customer examples, FAQs and demo/trial paths. That is useful information architecture to learn from; copying their claims would be inaccurate.

Their feature catalog also describes pipeline configuration, interview tools, collaboration and integrations. These are broader than our current release. We should use the comparison to identify useful gaps rather than claim parity from similar page styling.

Primary sources:
https://www.workable.com/features
https://www.workable.com/pricing
https://www.workable.com/industry-technology
https://www.workable.com/industry-professional-services

Local baseline: docs/release-checkpoint-2026-09-19.md, docs/launch-plan-149-2026-09-19.md, src/App.tsx and src/components/layout/PublicHeader.tsx. The earlier S$149 offer remains the commercial baseline; this plan extends the feature roadmap.