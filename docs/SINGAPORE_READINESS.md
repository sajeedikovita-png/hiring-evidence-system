# Singapore readiness plan

Status date: 11 September 2026

Hiring Evidence System is designed to support evidence-led human review. This document is an internal implementation and validation plan. It is not a declaration of government approval, certification, or legal compliance.

## Safe market position

Use this claim only when the listed product controls remain enabled:

> Designed around published Singapore fair-hiring, data-protection, and responsible-AI guidance. Hiring Evidence helps teams apply job-related criteria, inspect source-linked evidence, identify verification needs, and record accountable human decisions.

Always pair it with:

> Hiring Evidence is not endorsed or certified by the Singapore Government. Customers remain responsible for their employment and data-protection obligations.

Do not use government logos, describe the service as government approved, promise PDPA compliance, or claim that the system removes bias.

## Current control mapping

| Published expectation | Current product evidence | Status |
| --- | --- | --- |
| Base hiring decisions on job-related merit | Roles require job-related criteria and reports organise evidence against those criteria | Supported |
| Keep a human responsible for consequential decisions | AI cannot save a final outcome; a recruiter must enter a reason | Supported |
| Make AI assistance transparent and explainable | Reports retain source references, missing evidence, verification questions, and an AI-assistance notice | Supported |
| Restrict company access | Individual accounts, one active company membership, row-level security, private storage, and audited special transfers | Supported |
| Keep interview and job-offer records | Decision reasons and related audit events are persisted | Partial: retention policy still required |
| Notify people why their data is processed | Public privacy notice and customer responsibility language exist | Partial: candidate-facing notice must be attached to each processing event |
| Provide access and correction handling | No complete candidate request workflow in the verified release | Required before broader launch |
| Stop retaining personal data when no longer needed | Pilot access expires, but complete document retention and deletion operations are not verified | Required before broader launch |
| Protect overseas transfers | Providers are described at category level | Required: name subprocessors, locations, safeguards, and contract terms |
| Assess and notify data breaches | Security controls exist | Required: incident register, assessment procedure, notification playbook, and customer terms |
| Demonstrate AI governance claims | Prompt and output validation prohibit decisions, ranking, protected-characteristic inference, and unsafe wording | Partial: record model/version and run repeatable assurance tests |

## Required launch evidence

1. A Singapore-qualified privacy and employment-law review of the final privacy notice, customer agreement, candidate notice, and retention schedule.
2. A published privacy contact and designated data-protection responsibility.
3. A signed data-processing agreement that defines the customer and service-provider roles.
4. A subprocessor register covering hosting, authentication, storage, and AI processing, including transfer safeguards.
5. Candidate access, correction, withdrawal, and deletion request handling with identity verification and an audit history.
6. Configurable retention with deletion execution, legal hold, failure handling, and deletion evidence.
7. A documented breach assessment and notification process.
8. AI assurance tests covering protected-characteristic leakage, unsupported evidence, prompt injection, source-reference accuracy, repeatability, and human override.
9. An AI Verify or Project Moonshot aligned assessment report. Such a report validates defined claims and does not guarantee that the product is risk-free or free from bias.
10. A controlled customer pilot with written acceptance results for invitation, company separation, upload, analysis, human decision, audit, expiry, privacy requests, and deletion.

## Official references

- MOM Fair Consideration Framework: https://www.mom.gov.sg/employment-practices/fair-consideration-framework
- MOM interview and job-offer record guidance: https://www.mom.gov.sg/faq/fair-consideration-framework/must-my-company-keep-a-record-of-interviews-and-job-offer-decisions
- MOM Workplace Fairness Act implementation update: https://www.mom.gov.sg/newsroom/speeches/2025/1104-second-reading-of-workplace-fairness-dispute-resolution-bill
- PDPC data-protection obligations: https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations
- PDPC guidance for AI recommendation and decision systems: https://www.pdpc.gov.sg/guidelines-and-consultation/2024/02/advisory-guidelines-on-use-of-personal-data-in-ai-recommendation-and-decision-systems
- IMDA AI Verify overview: https://www.imda.gov.sg/About-IMDA/Research-and-Statistics/SGDigital/tech-pillars/Artificial-Intelligence
- IMDA Project Moonshot: https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2024/sg-launches-project-moonshot
