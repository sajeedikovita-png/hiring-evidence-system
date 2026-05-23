# Project State

## Product Name

Hiring Evidence System

## Product Type

B2B recruiter/company web app.

## Important Separation

This product is separate from the ReResume applicant-side ATS checker.

Do not mix the two products.

## Core Product Principle

AI assists.

Human decides.

Evidence explains.

## Current Phase

Production foundation over temporary seed data.

Mock data is development scaffolding only. The final goal is a real working B2B recruiter/company web app that can be marketed and used by real companies.

## Current Completed Work

- Planning docs created
- Design system started
- Routing foundation added
- Landing/login/dashboard/report pages in progress
- Structured typed mock data added
- Reusable page data selectors added
- Production model contracts started
- Repository/report/upload/compliance service seams added
- Tests/typecheck/build passing

## Current Next Goal

Replace temporary seed data behind the service layer with real database/API-backed data without rewriting the app pages.

Status: production-facing architecture is being prepared. The next pass should add real database/auth/upload pipeline decisions, then implement them behind the existing repository and service interfaces.

## Not Built Yet

- Real database
- Real authentication
- Real resume upload
- Real bulk CV upload processing
- Real AI analysis
- Real PDF export
- Payments
- Mobile app

## Safety/Product Rules

Do not use language like:

- AI selected
- AI rejected
- Best candidate
- Perfect match
- Bias-free
- Auto reject

Use language like:

- Evidence report ready
- Human review required
- Good evidence, verification needed
- Missing evidence
- Needs verification
- Job-related evidence
- Decision reason required

## Latest Commit Reference

Requested routing-foundation reference:

- `521a8f2` Add real MVP routing foundation

Current repository head before this document update:

- `acd30d6` Update project state document
