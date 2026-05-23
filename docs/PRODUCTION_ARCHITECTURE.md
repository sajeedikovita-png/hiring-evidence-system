# Production Architecture

## Architecture Goal

The front end must be able to switch from seed data to real API/database data without rewriting pages. Pages should call services and repositories, not import mock records directly.

Current data source:

- `src/data/mockHiringData.ts`

Current service seams:

- `src/services/hiringRepository.ts`
- `src/services/reportService.ts`
- `src/services/uploadService.ts`
- `src/services/compliance.ts`

## What Is Currently Mock

- Company records
- Recruiter users and profiles
- Jobs and job requirements
- Candidates and applications
- Uploaded documents
- Parsed CV output
- Evidence items
- Evidence reports
- Human review decisions
- Audit logs
- Upload and parsing status changes

## What Must Become Real

- Database-backed company workspaces
- Real recruiter authentication and authorization
- Real PDF/DOCX upload storage
- Real parsing jobs and error handling
- Real evidence report generation jobs
- Real human review decisions
- Real audit logs
- Real privacy and retention controls

## Production Entities

- Company
- User
- RecruiterProfile
- JobRole
- JobRequirement
- Candidate
- CandidateApplication
- UploadedDocument
- ParsedCV
- EvidenceItem
- EvidenceReport
- HumanReviewDecision
- AuditLogEntry

## Upload Pipeline

1. Recruiter selects PDF or DOCX files for a specific job role.
2. Front end validates file type and size.
3. Backend creates signed upload targets.
4. Files upload to private storage.
5. Each file receives an `UploadedDocument` record.
6. Documents enter parsing queue.
7. Failed, oversized, unsupported, or unreadable files move to safe error states.

Upload states:

- waiting for upload
- validating file
- upload accepted
- parsing queued
- parsing in progress
- evidence report generating
- report ready
- manual review required
- upload failed

Safe upload errors:

- Unsupported file type
- File too large
- Unable to parse document
- Manual review required

## CV Parsing Pipeline

1. Worker receives an `UploadedDocument`.
2. Parser extracts text and structured candidate details.
3. Parser stores a `ParsedCV` record with status, extracted fields, warnings, and timestamps.
4. Low-confidence parse or unreadable documents move to manual review.
5. Parsed data becomes source material for evidence mapping, not a final hiring decision.

## Evidence Report Pipeline

1. Read `JobRequirement` records for a job role.
2. Read parsed CV, questionnaire answers, and recruiter-entered evidence.
3. Create requirement-by-requirement `EvidenceItem` records.
4. Identify evidence found, evidence missing, and needs verification.
5. Build an `EvidenceReport` record.
6. Run fairness and decision wording checks.
7. Present report to a recruiter for human review.

The report must include:

- candidate identity
- job role
- report status
- evidence summary
- requirement-by-requirement evidence
- missing evidence
- verification needed
- document sources
- human decision area
- decision reason field
- audit trail preview

## Human Decision Workflow

Allowed decision options:

- Shortlist for interview
- Hold for review
- Not proceeding
- Request more information

Every decision requires:

- authenticated recruiter user
- selected decision
- human-entered reason
- timestamp
- audit log entry

The system must never make the final hiring decision.

## Audit Log Requirements

Audit logs must record:

- job creation and requirement changes
- application creation
- document upload
- parsing status changes
- evidence report generation
- report view or review actions where useful
- human decision save
- decision reason changes
- export events when PDF export exists

Audit records must include:

- company/workspace id
- user id or system actor
- entity type
- entity id
- action
- timestamp

## Future AI Integration Rules

AI may:

- summarize job-related evidence
- identify missing evidence
- map evidence to job requirements
- suggest verification questions
- flag decision wording risks

AI must not:

- select candidates
- reject candidates
- rank candidates as final truth
- claim fairness is guaranteed
- make automatic hiring decisions

All AI output must be labeled as assistance and reviewed by a human.
