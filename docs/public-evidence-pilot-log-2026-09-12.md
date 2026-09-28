# Public professional evidence pilot log

Release inspected: c662979. Date: 2026-09-12. Target: https://hiringevidence.com.

AI provides job-related evidence. The recruiter verifies it and makes the decision.

## Verified so far

- Read AGENTS.md; starting working tree clean and HEAD matches release.
- Live homepage displays candidate-confirmed public evidence; company sign-in opens.
- Fresh typecheck, test, build and high-level security audit passed; audit reports zero vulnerabilities. Non-failing warnings: PDF standardFontDataUrl and build chunks above 500 kB.
- Feature tests use stubbed provider and database clients. They do not establish authenticated live provider success or deployed database isolation.

## Issues found in source review

PE-01, PE-02 and PE-03 are deployed. Authenticated live verification remains pending. Failed rows now show failure and manual-review guidance; results show criterion labels from the report evidence matrix; list errors remain visible separately from saved-comparison status, with a Reload results action that does not invoke AI.

| ID | Issue | Expected behavior | Evidence |
| --- | --- | --- | --- |
| PE-01 | Failed rows with empty analysis map to “Analysis is being prepared.” The component never renders source.status. | Failed comparisons visibly show failure and a recovery step, including after reload. | src/services/publicEvidenceService.ts mapPublicEvidence; src/components/report/PublicProfessionalEvidenceSection.tsx result rendering |
| PE-02 | Findings carry criteriaId but cards display no criterion name. | Each finding identifies the role criterion it addresses. | PublicProfessionalEvidenceSection.tsx requirementLinks rendering |
| PE-03 | refresh catches a list failure, then submit overwrites that message with success. | Distinguish successful analysis from failure to load the saved result. | PublicProfessionalEvidenceSection.tsx refresh and submit |

## Guided live test — pending sign-in

1. Sign in to a pilot workspace and open a test candidate report with role criteria.
2. Locate Public professional evidence. Confirm Compare is disabled before candidate confirmation.
3. Use a candidate-supplied or confirmed HTTPS link and accurate job-related excerpt. Use an authorised test record; do not invent confirmation for an unrelated person's profile.
4. Compare once. Record time, visible response, and any exact error. The provider receives role criteria, existing resume evidence, source title and excerpt; it does not fetch the URL.
5. Inspect findings against the pasted text and role criteria. Check uncertainty and verification questions; no ranking or hiring recommendation.
6. Reload the report and verify the result persists and Open source reaches the intended page.
7. Verify the human decision remains unchanged. The pilot user owns any actual hiring decision and reason.

Authenticated real-provider comparison, persistence, failure recovery and company isolation are not yet verified.

## New issue template

ID / step / expected / actual exact text / reproducibility / severity / status.
Avoid credentials and candidate personal details in this log.

## Fix verification

Fresh typecheck, full test suite (including new status rendering, criterion label and load recovery checks), build and npm audit --audit-level=high all passed after the fixes. Audit: zero vulnerabilities. Existing non-failing PDF font and bundle-size warnings remain. No production deployment or authenticated provider test performed in this fix pass.

## Production deployment

On 2026-09-12, reran typecheck, tests, build and high-level audit successfully (zero vulnerabilities), then deployed the working-tree fixes with Vercel CLI. Deployment completed successfully and was aliased to https://hiringevidence.com. Deployment: https://hiring-evidence-system-macrk63gr-sajeewas-projects-b911d5d0.vercel.app. Authenticated real-provider pilot testing remains pending.

## Guided workflow improvements

Pilot user could not find the upload action or understand the next step. Added next-step guidance across dashboard, jobs, candidates, upload, report preparation and report review. Added selected filenames before upload, a four-stage progress indicator, clearer action labels, and collapsed optional manual review. Replaced inert dashboard actions with working job links.

Typecheck, full tests, build and high-level audit passed (zero vulnerabilities). Deployed to https://hiring-evidence-system-92kq44m9i-sajeewas-projects-b911d5d0.vercel.app and aliased to hiringevidence.com. Authenticated browser inspection confirmed the new Prepare evidence report screen, highlighted Check text stage, prominent Review resume text action and collapsed manual review; desktop screenshot inspected successfully.

The fictional PDF upload succeeded: one file uploaded and zero failures. Browser text extraction previously displayed the expected fictional SQL experience. File chooser selections had failed to attach in the embedded browser; cause is not established. Real-provider generation and public-evidence comparison remain pending.

## Twenty-CV company batch (2026-09-12)

Created 20 fictional two-page PDFs in Downloads/Hiring Evidence - Company Pilot Batch/CVs, with a tester guide and ZIP. Validated text extraction for all files and rendered all 40 pages for layout review. Existing pilot allowance: 50 documents, initially 1 used. Batch upload succeeded with 21 total records including the earlier minimal fixture, 21 uploaded successfully, and 0 failures.

First authenticated real-provider resume report succeeded for newly authored Amanda Lee fixture: HER-20260912-FE3381. React and TypeScript evidence found; stakeholder communication needs verification. The company report uses the same report component as the public sample, but actual job criteria and evidence differ. Public sample includes prepared questionnaire evidence and an AWS requirement; neither is supplied by this pilot CV/job.

New issue BATCH-01: completed reports still show Name not recorded although names are present in the CV. Candidate identification must be made clear for batch review.

Public professional evidence is still a separate, uncompleted provider test. Fictional CVs do not establish that public links are candidate-confirmed.

# Completed company pilot batch

2026-09-12. All 20 fictional CVs uploaded and produced authenticated AI-assisted reports via the normal UI. All three role criteria present in every report; decisions remain pending. The earlier one-line fixture remains as a separate unprocessed record (21 total documents).

Amanda report reopened and verified persisted. Public demo and company report share the evidence matrix, gaps, prompts, source and human-decision components. They do not have identical summary content.

| Fixture | Company report | JavaScript / TypeScript | React | Communication |
|---|---|---|---|---|
| HE-BATCH-01 Amanda Lee | [Open report](https://hiringevidence.com/reports/HER-20260912-FE3381) | Evidence found | Evidence found | Needs verification |
| HE-BATCH-02 Alex Morgan | [Open report](https://hiringevidence.com/reports/HER-20260912-F51C16) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-03 Jordan Ellis | [Open report](https://hiringevidence.com/reports/HER-20260912-32DB99) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-04 Sam Rivera | [Open report](https://hiringevidence.com/reports/HER-20260912-B80763) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-05 Casey Brooks | [Open report](https://hiringevidence.com/reports/HER-20260912-3CA0F4) | Needs verification | Missing evidence | Evidence found |
| HE-BATCH-06 Taylor Chen | [Open report](https://hiringevidence.com/reports/HER-20260912-2444C2) | Needs verification | Missing evidence | Needs verification |
| HE-BATCH-07 Morgan Reed | [Open report](https://hiringevidence.com/reports/HER-20260912-C25219) | Needs verification | Evidence found | Needs verification |
| HE-BATCH-08 Jamie Patel | [Open report](https://hiringevidence.com/reports/HER-20260912-FD5604) | Needs verification | Missing evidence | Needs verification |
| HE-BATCH-09 Riley Quinn | [Open report](https://hiringevidence.com/reports/HER-20260912-336046) | Needs verification | Missing evidence | Evidence found |
| HE-BATCH-10 Avery Stone | [Open report](https://hiringevidence.com/reports/HER-20260912-756601) | Needs verification | Missing evidence | Evidence found |
| HE-BATCH-11 Cameron Blake | [Open report](https://hiringevidence.com/reports/HER-20260912-AE7EC7) | Missing evidence | Missing evidence | Evidence found |
| HE-BATCH-12 Drew Parker | [Open report](https://hiringevidence.com/reports/HER-20260912-292088) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-13 Emerson Lane | [Open report](https://hiringevidence.com/reports/HER-20260912-001C57) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-14 Finley Ross | [Open report](https://hiringevidence.com/reports/HER-20260912-6BA363) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-15 Harper Vale | [Open report](https://hiringevidence.com/reports/HER-20260912-21614C) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-16 Indigo West | [Open report](https://hiringevidence.com/reports/HER-20260912-CF6AAB) | Needs verification | Needs verification | Missing evidence |
| HE-BATCH-17 Kai Rowan | [Open report](https://hiringevidence.com/reports/HER-20260912-FFBD5E) | Needs verification | Needs verification | Needs verification |
| HE-BATCH-18 Logan Hart | [Open report](https://hiringevidence.com/reports/HER-20260912-4FACB2) | Needs verification | Needs verification | Evidence found |
| HE-BATCH-19 Peyton Gray | [Open report](https://hiringevidence.com/reports/HER-20260912-094CB2) | Needs verification | Evidence found | Evidence found |
| HE-BATCH-20 Robin Hayes | [Open report](https://hiringevidence.com/reports/HER-20260912-0C73D8) | Needs verification | Needs verification | Evidence found |

## Issues found

- BATCH-01: all candidate names remain Name not recorded, despite names in the CVs. Filenames are currently the only useful identifiers in the batch list.
- BATCH-02: company reports show two generic summary cards (Source-grounded draft and Decision reason required); the demo shows richer evidence and verification summary cards. Shared layout does not mean equal completeness.
- BATCH-03: every completed CV is labelled Good evidence, verification needed in the candidate list, including the design-only CV with two missing technical criteria. Group labels do not reflect the actual report evidence sufficiently for useful batch triage.
- BATCH-04: long evidence text creates tall, narrow table cells and horizontal page scrolling; the evidence anchor can leave content under the sticky header. Visual report layout needs review with realistic content.

No hiring decisions saved. No API model configuration changed. No claim of 100-CV load testing, production readiness, cross-company isolation coverage or completed public-professional-source analysis is made.

Repository checks passed: typecheck, full test suite, build and npm audit --audit-level=high (0 vulnerabilities). Existing PDF font and large-bundle warnings remain.

## Evidence readability update

Replaced the cramped seven-column evidence table with requirement cards in the shared public/company renderer. Added larger requirement titles, full-width evidence text, labelled green/amber/red status markers, source/reference/confidence metadata, and highlighted human verification actions. No evidence wording or decisions changed. Adjusted anchor offset so the fixed header does not obscure the evidence section.

Typecheck, full tests, build and high-level audit passed (0 vulnerabilities). Deployed via Vercel: https://hiring-evidence-system-ag2u10x1f-sajeewas-projects-b911d5d0.vercel.app, aliased to hiringevidence.com. Authenticated desktop screenshot of HER-20260912-FE3381 confirms readable cards and no horizontal scrolling in that view. Name capture, summary-card parity and evidence grouping issues remain open.
