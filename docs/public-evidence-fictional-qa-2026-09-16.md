# Fictional public evidence live test — 2026-09-16

User authorised fictional material to test the comparison and persistence flow.

- Existing fictional CV: `01 - Amanda Lee - Frontend Test CV.pdf`.
- Live report: https://hiringevidence.com/reports/HER-20260912-FE3381
- Source title: `FICTIONAL QA ONLY - Amanda portfolio - 2026-09-16`.
- Placeholder URL: `https://example.com/fictional-qa/amanda-portfolio`. This is not a published portfolio and was not tested as a source of evidence.
- Confirmation checkbox was simulated for this explicitly authorised fictional fixture; no real candidate confirmation is claimed.
- Submitted invented React/TypeScript dashboard claims consistent with the existing CV, a specific filtering trade-off communication example, and unsupported manual accessibility testing claims. Input explicitly stated every claim was fictional QA material.

## Observed result

Normal authenticated UI submission completed with “Public evidence comparison saved”. One portfolio result appeared with “Evidence report ready”. The summary explicitly recognised fabricated QA material. All three role criteria were marked “Needs verification”; the communication example was identified as additional detail, and verification questions were generated. The result remained visible after a full report reload. No hiring decision was entered or saved.

Typecheck, full test suite (including 28 edge-function tests), build and high-severity audit passed. Audit: zero vulnerabilities. Existing PDF standard-font and bundle-size warnings remain.

## Limits and follow-up

This verifies live comparison and UI persistence with fictional text, not real source authenticity or candidate consent. The placeholder link does not host the supplied text. Real candidate-confirmed source testing, live cross-company isolation and complete production readiness are not established by this test.

On initial navigation the report briefly displayed an unavailable-workspace message before report data finished loading. The page source renders that error while its initial asynchronous load is pending. A distinct loading state remains a UX follow-up; it did not prevent this test after reload.
