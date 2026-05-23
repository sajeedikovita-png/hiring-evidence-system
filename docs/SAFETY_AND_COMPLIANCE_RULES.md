# Safety and Compliance Rules

## Product Boundary

Hiring Evidence System is a B2B recruiter/company web app. It is separate from the ReResume applicant-side ATS checker.

The product organizes evidence for human review. It is not an automatic hiring decision system.

## Core Principle

AI assists. Human decides. Evidence explains.

## Safe Hiring Language

Do not use:

- best candidate
- AI selected
- AI rejected
- AI decides
- auto reject
- automatic hiring decision
- bias-free
- guaranteed fair
- perfect match

Use:

- Evidence found
- Evidence missing
- Needs verification
- Human review required
- Decision pending
- Recruiter decision recorded
- Evidence report ready
- Good evidence, verification needed
- Job-related evidence
- Decision reason required

## Human Review Rule

Every candidate outcome must be reviewed and recorded by a human recruiter or hiring team member.

Every saved decision must include:

- selected decision option
- human-entered reason
- job-related evidence reference where possible
- authenticated reviewer
- timestamp

Allowed decision options:

- Shortlist for interview
- Hold for review
- Not proceeding
- Request more information

## Protected Characteristics

The system must not use protected characteristics to generate evidence reports or decisions.

Protected characteristics include:

- Age
- Gender
- Race
- Religion
- Marital status
- Pregnancy or caregiving status
- Disability or mental health status
- Photo
- Nationality unless job-relevant

## Security and Privacy Requirements

Candidate data must be treated as private hiring data.

Production requirements:

- company-scoped data access
- role-based permissions
- private document storage
- signed upload URLs
- file type and size limits
- consent record before processing where required
- audit logs for sensitive actions
- deletion and retention controls
- no unnecessary logging of raw candidate data
- no exposure of internal analysis to unauthorized users

## Upload Safety

Accept only:

- PDF
- DOCX

Safe error messages:

- Unsupported file type
- File too large
- Unable to parse document
- Manual review required

## AI Integration Safety

Future AI features may assist with evidence organization only.

AI may:

- summarize evidence
- map evidence to requirements
- identify missing evidence
- suggest interview questions
- warn about unsafe decision wording

AI may not:

- make the final hiring decision
- auto reject candidates
- claim guaranteed fairness
- present a candidate as a perfect fit
- rank candidates as final truth

All AI-assisted outputs must remain editable, explainable, and subject to human review.
