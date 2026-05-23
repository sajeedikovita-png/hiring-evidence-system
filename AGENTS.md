# AGENTS.md

## Product Identity

This is a real B2B product, not a demo.

Hiring Evidence System is a recruiter/company web app for evidence-led hiring review. It is separate from the ReResume applicant-side ATS checker. Do not mix the two products.

Mock data is only temporary seed/dev scaffolding.

Core principle:

AI assists. Human decides. Evidence explains.

## Permanent Engineering Rules

- Every task must investigate the repo first.
- Pages must use services/repositories, not direct mock imports.
- Mock data may support development, but production-facing shapes must be replaceable by real database/API data.
- Human hiring decisions require a human-entered reason.
- The system must never make the final hiring decision.
- Every task must end with typecheck, test, build, and audit.
- Keep commits small and production-focused.

## Required Verification

Run all of these before claiming work is complete:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
```

## Forbidden Hiring Phrases

Do not introduce these phrases into app UI or product copy:

- best candidate
- AI selected
- AI rejected
- AI decides
- auto reject
- automatic hiring decision
- bias-free
- guaranteed fair
- perfect match

## Safe Product Language

Prefer language such as:

- Evidence report ready
- Human review required
- Good evidence, verification needed
- Missing evidence
- Needs verification
- Job-related evidence
- Decision reason required
- Evidence found
- Evidence missing
- Decision pending
- Recruiter decision recorded

## Scope Guardrails

Do not add these unless the user explicitly asks and the architecture is ready:

- payments
- real production AI API
- real email sending
- real PDF export
- mobile app
- advanced analytics

Database, authentication, upload storage, and AI work must be added behind service/repository boundaries so the app can grow into a real B2B product without rewriting pages.
