# Product Roadmap

## Product Goal

Hiring Evidence System is a real B2B recruiter/company web app. It is not a demo and it is separate from the ReResume applicant-side ATS checker.

The product helps hiring teams organize job-related candidate evidence, identify missing proof, prepare verification questions, run fairness and wording checks, and record a human decision reason.

Core principle:

AI assists. Human decides. Evidence explains.

## Current State

The current app is a front-end MVP foundation with typed seed data. Mock data is temporary development scaffolding only.

Built:

- Landing page
- Login shell
- Recruiter dashboard
- Candidate Evidence Report page
- Job-scoped candidate upload UI
- Candidate list view
- Typed seed data
- Repository/service layer over seed data
- Tests, typecheck, and build workflow

Still mock:

- Company, user, job, candidate, application, document, evidence, report, and decision records
- Upload outcomes
- CV parsing outputs
- Evidence report generation
- Audit trail events
- Human decision persistence

## Roadmap

### Phase 1: Production Foundation

- Keep pages behind repository/service interfaces
- Define production data models
- Keep seed data compatible with future database records
- Add upload, report, and compliance service seams
- Add tests for safe language and human decision controls

### Phase 2: Database and Auth Foundation

- Add real company and recruiter accounts
- Add role-based access controls
- Store jobs, candidates, applications, documents, reports, decisions, and audit logs
- Keep all access scoped to a company workspace

### Phase 3: Real Upload Pipeline

- Add signed document upload
- Store PDF/DOCX files securely
- Validate file type and size before upload
- Track upload, parsing, report generation, manual review, and failed states

### Phase 4: CV Parsing Pipeline

- Extract structured candidate information from uploaded documents
- Track parse warnings and failures
- Route low-confidence or unreadable documents to manual review
- Store parsed content separately from final evidence reports

### Phase 5: Evidence Report Pipeline

- Map parsed CV and questionnaire data to job requirements
- Generate requirement-by-requirement evidence records
- Identify missing evidence and verification needed
- Generate suggested interview questions
- Keep final decisions outside the automated pipeline

### Phase 6: Human Review Workflow

- Require a recruiter decision
- Require a human-entered decision reason
- Store decision reason and evidence references
- Write an audit log entry for each review action

### Phase 7: Pilot Readiness

- Add real pilot company setup
- Add privacy, consent, deletion, and retention controls
- Add exportable reports only after real data and audit records are reliable

## Not In Current Scope

- Payments
- Public marketing claims beyond conservative product description
- Real production AI API
- Real email sending
- Real PDF export
- Mobile app
- Advanced analytics
