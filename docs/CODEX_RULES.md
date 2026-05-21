# Codex Rules

## Product Boundary

This repository is for a new B2B recruiter/company web application. It is separate from the existing ReResume applicant-side website.

Codex must not:

- Connect this product to the applicant ATS checker.
- Reuse applicant ATS checker logic.
- Share applicant-side tables without explicit user approval.
- Build a recruitment agency or placement marketplace.
- Build an ATS replacement.
- Build AI decision-making features.

## Product Rule

Always preserve:

> AI assists. Human decides. Evidence explains.

When adding features, ask whether the change supports:

- Human-led evaluation.
- Job-related evidence.
- Structured questionnaire answers.
- Fairness checks.
- Human decision notes.

If not, keep it out of the MVP.

## MVP Rules

Do not build until planning docs are approved.

MVP is:

- Web app only.
- Recruiter side desktop-first.
- Candidate application pages mobile responsive.
- Human-led review workflow.

MVP is not:

- Payment system.
- Mobile app.
- Job board.
- Automatic rejection system.
- LinkedIn scraper.
- External private data enrichment tool.
- Applicant ATS checker.

## AI Implementation Rules

AI may:

- Summarize evidence.
- Identify missing evidence.
- Map evidence to criteria.
- Flag unsupported claims.
- Flag potentially biased language.
- Suggest follow-up questions.

AI may not:

- Decide.
- Rank.
- Reject.
- Accept.
- Score candidates as final truth.
- Infer protected characteristics.
- Write final decision notes without human confirmation.

All AI output must be labeled:

- AI assistance.
- Requires human review.
- Not a hiring decision.

## UX Rules

Use a minimal, professional, authentic, calm, trustworthy B2B design.

Avoid:

- Robots.
- Sparkles.
- Neon gradients.
- Futuristic cyber visuals.
- Magic language.
- Copy implying AI decides.

Prefer:

- Evidence.
- Criteria.
- Review.
- Human decision.
- Fairness check.
- Decision note.

## Data Rules

Every recruiter-side record should be scoped to a workspace.

Candidate application pages must:

- Use scoped tokens.
- Avoid recruiter workspace access.
- Include consent and privacy notice.
- Work on mobile.

Final status changes must:

- Be initiated by an authorized human user.
- Require a decision note.
- Reference evidence where possible.
- Be audited.

## Security Rules

Before claiming a feature is complete, verify:

- Workspace authorization.
- Candidate token isolation.
- File upload validation.
- Private file access.
- Audit event creation.
- Human-note enforcement for final statuses.

Never log sensitive candidate data unnecessarily.

## Development Rules

- Preserve these docs as the product contract.
- Update docs before changing product scope.
- Keep implementation aligned with existing docs.
- Add tests for authorization, AI boundaries, candidate submission, and final decision controls.
- Do not add broad abstractions before the MVP needs them.
- Do not create payment or job-board code unless the user explicitly changes scope.

## Review Checklist For Every Feature

Before coding or merging a feature, confirm:

- Does it support evidence-based human review?
- Does it avoid automatic hiring decisions?
- Does it preserve workspace data isolation?
- Does it avoid applicant ATS checker integration?
- Does it keep candidate pages mobile responsive?
- Does it use calm B2B design and copy?
- Does it create an audit trail where needed?
- Does it protect candidate privacy?

## Stop Conditions

Stop and ask the user before:

- Connecting to ReResume or applicant-side systems.
- Adding payments.
- Adding ATS replacement features.
- Adding job board features.
- Adding sourcing or scraping.
- Adding automatic rejection.
- Adding AI ranking.
- Adding mobile app work.
- Making legal compliance claims.
