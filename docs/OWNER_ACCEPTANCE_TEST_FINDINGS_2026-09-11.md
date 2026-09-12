# Owner acceptance-test findings — 11 September 2026

This file records issues discovered while the owner tests the live customer journey. Do not mark an item complete until the change is deployed and the same live step is retested.

## Test position

- Current flow: first pilot request approved; invitation accepted; company user signed in; 30-day pilot started; first Frontend Developer job created.
- Test data rule: use synthetic company, role, and candidate information until the workflow passes.

## Findings

### AT-001 — First role field is unclear

- **Observed:** The pilot form label `First role to review` can sound like an exact-title search or matching rule. Similar jobs often have different titles.
- **Actual behavior:** The field is request context for the platform administrator. Candidate evidence is reviewed later against company-defined job criteria, not an exact job-title match.
- **Required change:** Rename the field to `First job opening you want to review` and add: `Use the title your company normally uses. You can define the responsibilities and criteria after access is approved.`
- **Status:** Open.
- **Retest:** Submit a fresh controlled request and confirm a first-time user understands the field without explanation.

### AT-002 — Invitation delivered to Gmail Spam

- **Observed:** The approved pilot invitation reached Gmail Spam.
- **Work completed:** Existing SPF and DKIM records were confirmed. A DMARC monitoring record was added and publicly verified on 11 September 2026: `v=DMARC1; p=none; adkim=r; aspf=r`.
- **Required change:** Review Resend deliverability signals, confirm the authenticated sender and link domains remain aligned, and build sending reputation using genuine requested transactional mail only.
- **Status:** Partially fixed; live inbox retest required.
- **Retest:** After the invitation template is updated, invite one additional controlled address. Record Inbox/Promotions/Spam placement and verify SPF, DKIM, and DMARC results in the received message headers.

### AT-003 — Invitation email is too plain and generic

- **Observed:** The invitation email does not look like a professional Hiring Evidence communication and provides too little context.
- **Required change:** Update the Supabase invitation template with:
  - `Hiring Evidence` identity and `hiringevidence.com` website reference;
  - a clear subject that identifies the requested company-workspace invitation;
  - a short explanation that a platform administrator approved the request;
  - one clear `Set up your account` action;
  - the link-expiry/security warning and an instruction to ignore an unexpected invitation;
  - a support or privacy contact once the official mailbox is selected;
  - restrained transactional styling consistent with the light editorial website;
  - useful plain-text fallback and no marketing claims.
- **Work completed:** Professional subject and HTML were drafted and versioned in `docs/TRANSACTIONAL_EMAIL_COPY.md` and `supabase/templates/invite.html`.
- **Status:** Draft complete; Supabase dashboard access is required to update the hosted Auth template.
- **Retest:** Send one controlled invitation and inspect desktop/mobile rendering, link destination, sender identity, message headers, and Spam placement.

### AT-004 — Pilot limits are not visible beside the Start pilot action

- **Observed:** Before starting the pilot, the owner saw only the `Start pilot access` button and did not see the 30-day duration, one-role limit, 50-document limit, or two-user limit near the action.
- **Current layout:** Usage-limit cards exist farther down the page, but the important scope is not clear at the point where the customer starts the countdown.
- **Required change:** Add a concise `Your approved pilot` scope summary immediately beside or above the start button: 30 days, one role, 50 candidate documents, and two company users. Keep the detailed usage cards below for post-start tracking.
- **Work completed:** The approved pilot summary was added to the main status card using the live lifecycle limits. It remains visible after activation so the current tester can verify it.
- **Deployment:** Vercel production deployment `dpl_46x4AD75x9WqbyqtvxJZ4ZVrEzwH` reports Ready and is aliased to `https://hiringevidence.com`.
- **Live retest:** The owner refreshed the active Pilot access page and confirmed the duration, role, document, and user details are visible.
- **Status:** Complete for the laptop flow. A mobile-view check remains part of the broader responsive test.

### AT-005 — Role criterion fields require product knowledge

- **Observed:** `Criterion` and `Description` do not tell a first-time customer what information to enter. This can cause vague criteria, poor evidence reports, and avoidable support requests.
- **Required change:** Explain that each item should be one job-related skill, responsibility, qualification, or experience; distinguish the short requirement name from observable evidence; explain Required versus Preferred; and show a completed example on the page.
- **Work completed:** The job form now uses `What should this person be able to do?`, `Requirement name`, and `Evidence to look for`; includes short guidance with every field; and provides an expandable completed example.
- **Deployment:** Vercel production deployment `dpl_Eqzb8x59y3YP1mKvAMXY4KwA63sX` reports Ready and is aliased to `https://hiringevidence.com`.
- **Status:** Deployed; live owner retest required.
- **Retest:** Ask a first-time user to create a role without external explanation and review whether the entered requirements are specific, observable, and job-related.

### AT-006 — Solo-founder customer support and maintenance load

- **Observed:** Customers need friendly, contextual help without depending on the founder for routine questions. Product problems and feature requests also need to become structured, reviewable work rather than informal messages.
- **Required change:** Add an approved-knowledge support assistant, problem and feature reporting, safe diagnostics, controlled AI triage, a cross-company platform-owner inbox, and a separate developer work-order approval record. Customer content must never execute code or deploy changes.
- **Work completed:** Added company-scoped support conversations and issues, page-aware Help UI, approved-knowledge AI responses with honest escalation, rate limits and redaction, platform-admin triage, a server-only event ledger, separate change-owner authority, recommendation-hash binding, risk/scope/test-plan review, and expiring work-order approval.
- **Backend deployment:** Supabase migration `202609110001_controlled_ai_support.sql` is recorded remotely. `support-assistant` and `support-triage` are Active at version 1.
- **Website deployment:** Vercel production deployment `dpl_91b7TA6gN1zXLWbgJTJt2kZg6fTu` reports Ready and is aliased to `https://hiringevidence.com`.
- **Status:** Deployed; live customer question, issue submission, owner triage, and approval-boundary retests required.
- **Retest:** Ask a Jobs-page question, submit one synthetic problem, confirm it appears in `/admin/support`, run triage, and confirm approval records a work order without changing or deploying the website.

## Completion rule

For every new issue, record what the owner observed, the expected behavior, the change made, deployment evidence, and the live retest result. A code change or dashboard setting alone does not close an item.
