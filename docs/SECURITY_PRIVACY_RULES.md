# Security and Privacy Rules

## Data Sensitivity

This app handles sensitive hiring and candidate data.

Treat all candidate data as private.

## Candidate Consent

Before submission, candidate must consent to:

- Resume use
- Questionnaire answer use
- Uploaded document use
- Candidate-provided link review
- Data retention period

Consent must be stored with timestamp.

## Data Use Rule

Candidate information must be used only for the specific job application unless separate consent is given.

## External Links

Do not scrape LinkedIn or private sites.

Only store candidate-provided links.

If link content is used, it must be based on candidate permission.

## File Upload Security

Allowed file types:

- PDF
- DOCX

Reject:

- EXE
- ZIP
- Unknown file types

Use virus scanning if available.

Limit upload size.

## Access Control

Company users can only view applications for their organization.

Candidates can only access their own application submission flow.

## Audit Logs

Log important actions:

- Job created
- Criteria analyzed
- Criteria edited
- Candidate submitted application
- Report generated
- Recruiter viewed report
- Decision saved
- PDF exported

## AI Logging

Log:

- Module name
- Model used
- Token usage
- Estimated cost
- Timestamp

Do not expose raw hidden AI reasoning to users.

Show only concise AI-assisted summaries.

## Data Retention

Add configurable data retention later.

MVP should include clear privacy text and manual deletion support.

## Legal Note

This product is not legal advice.

Before public launch, privacy policy, terms, candidate consent copy, and employer responsibilities should be reviewed professionally.
