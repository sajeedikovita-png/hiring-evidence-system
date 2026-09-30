# Pilot release and publication record — 30 September 2026

## Release target

- Branch: `codex/premium-pilot-foundation`
- Review preview: https://hiring-evidence-system-preview-sajeewa.vercel.app
- Production domain: https://hiringevidence.com
- Preview deployment: https://hiring-evidence-system-15pk6sn13-sajeewas-projects-b911d5d0.vercel.app
- Production deployment: https://hiring-evidence-system-3qhs56bu7-sajeewas-projects-b911d5d0.vercel.app
- Vercel production record: https://vercel.com/sajeewas-projects-b911d5d0/hiring-evidence-system/HoHaKLhs5Qu9UGi16giCCPqdUcRZ
- Published commit: `6d2d1a3`
- Owner authorization: publication was authorized after preview acceptance. The verified release candidate was published and aliased to the production domain.

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

## Automated and database verification

- `npm run typecheck` passed.
- `npm run test` passed, including 28 Edge Function tests.
- `npm run build` passed.
- `npm audit --audit-level=high` reported zero vulnerabilities.
- PostgreSQL behavior suites passed for candidate workflow, notes, interviews, company configuration, client sharing, and agency clients.
- Local and linked migration lists agree through `202609200001`.
- The Vercel preview built successfully from commit `6d2d1a3` and is available through the stable preview alias above.
- Public preview checks passed for the landing page, product explanation, signed-out route protection, pilot-testing access boundary, invalid shared-report handling, and a 390 × 844 mobile layout.
- The detailed walkthrough video, overview video, poster, and fictional company logo load from real static assets. The candidate examples remain fictional.

The test suite still reports the known PDF standard-font warning and the build still reports the existing JavaScript chunk-size advisory. Neither stopped the verified build.

## Authenticated preview acceptance

The owner signed in to the stable preview as `sachimdk`. The authenticated browser then verified:

- Dashboard loaded the ABC pilot workspace with one active role, 22 candidate documents, two users and 21 evidence reports.
- Workflow hub and the Frontend Developer candidate workflow loaded all 22 candidates, stage counts, reviewer ownership, next actions, due dates, internal-note links and interview links.
- Pilot testing loaded the live access state and platform QA evidence. Its email status now records the completed recovery-inbox test while keeping invitation-provider and expired-link tests open.
- Company settings loaded the persisted company display name, versioned templates, custom labels and controlled package boundaries.
- Clients loaded two explicitly fictional agency-client records and the role-assignment control without creating external access.
- Privacy, Support and the fictional Avery Tan report loaded without configuration or workspace-access errors.
- The report showed candidate identity history, internal notes, interview work, client handoff, public professional evidence, evidence gaps, suggested interview questions, authority state and the recorded human decision reason.
- The Guide opened with page-aware Dashboard guidance, privacy instructions and problem/feature reporting controls. No live provider message was sent during this release pass.
- No browser warning or error was recorded across the authenticated checks.

## Production publication and live acceptance

Vercel built the same release candidate successfully and aliased it to https://hiringevidence.com. The live homepage, product navigation, synthetic report path and S$149 commercial copy loaded without configuration errors.

An existing authenticated production owner session then verified Dashboard, Workflow, the production Frontend Developer workflow, Pilot testing, Company settings, Clients and the Amanda Lee evidence report. The published Pilot testing page contained the corrected recovery-email status. The production workflow loaded the candidate record, management controls and the explicit statement that workflow stages do not change hiring decisions. The production browser recorded no warnings or errors.

The first preview upload attempt was stopped before deployment because Vercel was scanning archived iCloud dependency folders and a cloud-only database seed file. `.vercelignore` now excludes archived dependencies and non-runtime repository material; the replacement preview and production deployments uploaded only the required frontend release inputs and completed successfully.

## Honest product boundaries and follow-up work

- External report links currently use revocable, expiring bearer tokens. They are not recipient-authenticated links.
- Privacy requests are recorded and tracked; complete export, correction, deletion, withdrawal, retention, and legal-hold operations still require an authorized operating procedure.
- Password recovery reached the controlled Gmail inbox and the reset/login path worked. Fresh invitation delivery across customer mail providers, repeat spam placement and expired-link behavior remain follow-up tests.
- The maintenance workflow is owner-triggered and preview-limited. It does not make unattended production changes.
- A pilot-ready technical release still needs observation with three to five real recruiter users before broader sales claims.
- No customer message, payment, production hiring decision, or external report share was created during this release pass.
