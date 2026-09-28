# Pilot release checkpoint — 28 September 2026

## Release target

- Branch: `codex/premium-pilot-foundation`
- Review preview: https://hiring-evidence-system-preview-sajeewa.vercel.app
- Production domain: https://hiringevidence.com
- Owner authorization: publish the verified build after preview acceptance. Do not publish if the signed-in customer journey exposes a release blocker.

This checkpoint covers the consolidated recruiter workflow, client handoff, company configuration, candidate identity and authority records, interview and internal-note workspaces, pilot-test reporting, and the current product walkthrough media. It does not claim that every roadmap item is implemented.

## Implemented in the release candidate

- A prominent per-role workflow board with candidate stage, responsible reviewer, next action, due date, immutable activity history, and optimistic version checks.
- Candidate identity and duplicate-review controls, including explicit merge review rather than automatic consolidation.
- Candidate-confirmed public professional evidence with recruiter-supplied public text. The product does not independently search the web, scrape profiles, or treat a URL as verified evidence.
- Interview preparation, captured answers, internal notes, and client-handoff preparation kept behind company and role access boundaries.
- Company branding, controlled workflow labels, job-related custom fields, versioned review/report templates, and company-specific work requests.
- Candidate authority records used to control external handoff eligibility. A lawful-basis attestation for document upload is not presented as candidate consent.
- A visible pilot-testing page that reports the current company-access and lifecycle checks without exposing the local QA artifact pages to customers.
- Product guidance updated for the current workflows, with AI assistance disclosed and human hiring decisions kept separate.

## Verification completed before signed-in acceptance

- `npm run typecheck` passed.
- `npm run test` passed, including 28 Edge Function tests.
- `npm run build` passed.
- `npm audit --audit-level=high` reported zero vulnerabilities.
- PostgreSQL behavior suites passed for candidate workflow, notes, interviews, company configuration, client sharing, and agency clients.
- Local and linked migration lists agree through `202609200001`.
- The Vercel preview built successfully from commit `b8362dd` and is available through the stable preview alias above.
- Public preview checks passed for the landing page, product explanation, signed-out route protection, pilot-testing access boundary, invalid shared-report handling, and a 390 × 844 mobile layout.
- The detailed walkthrough video, overview video, poster, and fictional company logo load from real static assets. The candidate examples remain fictional.

The test suite still reports the known PDF standard-font warning and the build still reports the existing JavaScript chunk-size advisory. Neither stopped the verified build.

## Signed-in acceptance and publication

Pending the owner's private sign-in to the preview. After that handoff, verify the real company workspace, role workflow board, candidate/report path, pilot-testing page, company configuration, clients, and guide behavior in the authenticated browser. Record any browser errors and publish only if no release blocker is found.

Production deployment details and the final live smoke result must be added here after publication. A successful build or preview deployment alone is not proof that the signed-in customer journey works.

## Honest product boundaries and follow-up work

- External report links currently use revocable, expiring bearer tokens. They are not recipient-authenticated links.
- Privacy requests are recorded and tracked; complete export, correction, deletion, withdrawal, retention, and legal-hold operations still require an authorized operating procedure.
- Natural access expiry, fresh invitation/recovery delivery across customer mailboxes, CSV migration, ATS/calendar integrations, and country expansion remain follow-up work.
- The maintenance workflow is owner-triggered and preview-limited. It does not make unattended production changes.
- A pilot-ready technical release still needs observation with three to five real recruiter users before broader sales claims.
- No customer message, payment, production hiring decision, or external report share was created during this release pass.
