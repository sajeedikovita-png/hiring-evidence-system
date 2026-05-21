# API Spec

## API Principles

- APIs belong to the recruiter/company product only.
- Do not connect to the applicant ATS checker.
- Do not expose applicant-side ReResume data.
- Keep candidate submission endpoints scoped to a role application token.
- Require human-authenticated actions for review, notes, and decision status changes.
- Never provide an endpoint that automatically rejects or ranks candidates.

## Authentication

Recruiter-side:

- Session or bearer token authentication.
- Workspace membership required.
- Role-based authorization for admin, recruiter, reviewer.

Candidate-side:

- Tokenized role application link.
- Candidate submission token after starting an application.
- No access to recruiter workspace endpoints.

## Common Response Shape

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Workspace Endpoints

### GET /api/workspaces/current

Returns the current workspace and membership.

### PATCH /api/workspaces/current

Updates workspace settings.

Admin only.

### GET /api/workspaces/current/audit-events

Returns audit events.

Admin and recruiter access.

Query parameters:

- `entity_type`
- `entity_id`
- `event_type`
- `from`
- `to`

## Team Endpoints

### GET /api/team

Lists workspace members.

### POST /api/team/invitations

Invites a team member.

Admin only.

Body:

```json
{
  "email": "reviewer@example.com",
  "role": "reviewer"
}
```

### PATCH /api/team/members/:membershipId

Updates member role or status.

Admin only.

## Role Endpoints

### GET /api/roles

Lists roles in the current workspace.

Query parameters:

- `status`
- `search`

### POST /api/roles

Creates a role.

Recruiter and admin.

Body:

```json
{
  "title": "Product Manager",
  "department": "Product",
  "location": "Remote",
  "employment_type": "Full-time",
  "description": "Role description"
}
```

### GET /api/roles/:roleId

Returns role detail, criteria, and questionnaire.

### PATCH /api/roles/:roleId

Updates role metadata.

### POST /api/roles/:roleId/publish

Publishes role application link.

Returns:

```json
{
  "data": {
    "application_url": "https://example.com/apply/token"
  }
}
```

### POST /api/roles/:roleId/archive

Archives role.

## Criteria Endpoints

### POST /api/roles/:roleId/criteria

Creates a criterion.

### PATCH /api/roles/:roleId/criteria/:criterionId

Updates a criterion.

### DELETE /api/roles/:roleId/criteria/:criterionId

Removes a criterion if no submitted review depends on it. Otherwise archive it.

## Questionnaire Endpoints

### POST /api/roles/:roleId/questions

Creates a candidate-facing question.

### PATCH /api/roles/:roleId/questions/:questionId

Updates a question.

### POST /api/roles/:roleId/questions/reorder

Updates question order.

Body:

```json
{
  "question_ids": ["uuid-1", "uuid-2"]
}
```

## Candidate Application Endpoints

### GET /api/apply/:token

Returns public role application configuration.

Response must not include internal reviewer notes, AI outputs, or workspace user data.

### POST /api/apply/:token/applications

Starts a candidate application.

Body:

```json
{
  "full_name": "Candidate Name",
  "email": "candidate@example.com",
  "privacy_notice_version": "2026-05-21",
  "consent_accepted": true
}
```

### PATCH /api/apply/applications/:applicationToken

Saves candidate information and answers.

### POST /api/apply/applications/:applicationToken/evidence

Uploads or links evidence.

Supported types:

- resume
- file
- url

### POST /api/apply/applications/:applicationToken/submit

Submits the application.

Validation:

- Required candidate fields completed.
- Required questionnaire answers completed.
- Consent accepted.

## Candidate Review Endpoints

### GET /api/roles/:roleId/applications

Lists applications for a role.

Query parameters:

- `status`
- `reviewer`
- `missing_evidence`
- `search`

### GET /api/applications/:applicationId

Returns candidate profile, answers, evidence, scorecards, AI assistance records, fairness checks, and decision notes.

### PATCH /api/applications/:applicationId/status

Changes application status.

Rules:

- Requires recruiter or admin.
- Final statuses require a human decision note.
- Endpoint must reject requests that claim an AI-generated final decision.

Body:

```json
{
  "status": "not_moving_forward",
  "decision_note": "Human-authored rationale with evidence references.",
  "evidence_references": ["evidence_uuid"]
}
```

### POST /api/applications/:applicationId/evidence

Adds reviewer-created evidence.

### POST /api/applications/:applicationId/notes

Adds reviewer note.

## Review Endpoints

### POST /api/applications/:applicationId/review-assignments

Assigns a reviewer.

### POST /api/applications/:applicationId/scorecards

Creates or updates a scorecard.

Body:

```json
{
  "overall_note": "Review note",
  "items": [
    {
      "criterion_id": "uuid",
      "rating": 4,
      "evidence_summary": "Evidence considered",
      "reviewer_note": "Human reviewer note"
    }
  ]
}
```

### POST /api/applications/:applicationId/scorecards/:scorecardId/complete

Marks scorecard complete.

## AI Assistance Endpoints

### POST /api/applications/:applicationId/ai/evidence-summary

Creates a non-decisional evidence summary.

### POST /api/applications/:applicationId/ai/missing-evidence

Checks criteria without clear supporting evidence.

### POST /api/applications/:applicationId/ai/criteria-coverage

Maps available evidence to criteria.

### POST /api/applications/:applicationId/ai/bias-language-check

Checks reviewer notes and role text for potentially biased language.

### POST /api/applications/:applicationId/ai/unsupported-claim-check

Flags claims that lack evidence references.

### POST /api/applications/:applicationId/ai/follow-up-questions

Suggests human interview or follow-up questions based on missing evidence.

AI endpoint response rule:

```json
{
  "data": {
    "assistance_id": "uuid",
    "label": "AI assistance",
    "requires_human_review": true,
    "output": {}
  }
}
```

AI endpoints must not return:

- Final hiring status.
- Accept or reject instruction.
- Candidate ranking.
- Protected-class inference.
- External private data.

## File Upload Endpoints

### POST /api/uploads/sign

Creates signed upload URL.

Body:

```json
{
  "context": "candidate_evidence",
  "file_name": "resume.pdf",
  "content_type": "application/pdf"
}
```

Rules:

- Validate file type.
- Validate size.
- Scope upload to workspace and application.

## Error Codes

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `FINAL_STATUS_REQUIRES_NOTE`
- `AI_DECISION_NOT_ALLOWED`
- `APPLICATION_ALREADY_SUBMITTED`
- `FILE_TYPE_NOT_ALLOWED`
- `RATE_LIMITED`
