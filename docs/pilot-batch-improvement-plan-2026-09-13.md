# Pilot batch improvements

User-approved scope: make candidate identification and batch evidence review useful, with lower-cost model implementation one task at a time. Existing report formatting and prior uncommitted work must be preserved.

## Priority and sequence

1. P1 - Accurate data: derive counts and review groups from individual role-criterion findings; replace anonymous-looking records with an honest CV filename label where a candidate name has not been captured. Do not invent or silently verify identity.
2. P1 - Useful list: searchable candidate/CV labels, explicit report and evidence-group filters, per-criterion status filter, visible found/verification/missing counts, readable responsive results and clear empty/reset states.
3. P1 - Verification: required typecheck, tests, build, audit; validate against the existing 20 completed company reports; deploy and demonstrate live examples.

Deferred: editable confirmed candidate names, side-by-side PDF highlighting, new batch AI processing, and changes to hiring decisions. These are separate product work.

## Live acceptance examples from the saved batch

- 21 existing applications: one original minimal CV without a report and 20 completed reports.
- Previously observed report statuses contain missing evidence in 7 of 20 reports.
- React missing-evidence filter should find 6 reports: Casey Brooks, Taylor Chen, Jamie Patel, Riley Quinn, Avery Stone and Cameron Blake, if the saved findings are unchanged.
- Amanda report contains 2 evidence-found and 1 needs-verification findings, with no missing finding.
- Cameron report contains 2 missing-evidence and 1 evidence-found findings.
- Indigo report contains 1 missing-evidence and 2 needs-verification findings.
- No report has all 3 criteria marked evidence found. Counts describe documented evidence, not hiring suitability.
- Report summary counts must agree with list counts; unprocessed records must not appear as successful evaluated reports.
- Search/filter actions must not call the AI provider or alter a hiring decision.

## Completed release and live acceptance

Implemented sequentially with gpt-5.6-luna, reviewed by the primary agent. Production alias verified through authenticated browser on 2026-09-13: https://hiringevidence.com. Deployment: hiring-evidence-system-7yfrlgwor-sajeewas-projects-b911d5d0.vercel.app.

- Accurate criterion counts and evidence groups shared by the list and reports.
- Honest filename fallback where no candidate name is recorded; parsed-name provenance in the list.
- Search, group/report/requirement/status filters, result count, reset and empty state.
- Reduced duplicate columns, readable filenames, red missing-evidence badges and amber verification badges.
- Stored source gaps and interview verification prompts preserved.
- Fixed regressions discovered in review: requirement/status matching different criteria; unprocessed records disappearing from default results; oldest parsed name overriding newest; duplicate verification prompts.
- Live browser verified 21 total, 7 missing-evidence results, 6 React-missing results, Amanda search 1 result, empty search 0 with reset, and manual-review filter 1 unprocessed CV.
- Amanda report: 2 found / 1 verification / 0 missing; original detail notes retained. Cameron report: 1 found / 0 verification / 2 missing.
- Typecheck, test, build and high-severity dependency audit passed; audit reports 0 vulnerabilities. Existing nonblocking build chunk-size warning remains.

No new AI provider calls or human hiring decisions were made for this release. Public professional evidence with candidate-confirmed real URLs remains a separate uncompleted live test. Filename fallback does not confirm identity. Side-by-side PDF highlighting and editable identity remain deferred.
