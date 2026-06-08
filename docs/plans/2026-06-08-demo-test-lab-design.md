# Demo Test Lab Design

## Goal

Create an internal demo test system that explains how Hiring Evidence System evaluates a controlled resume set without making hiring decisions.

## Product Positioning

The page is a pilot demonstration tool, not a production AI pipeline. It should show test evidence outcomes using safe product language:

- Evidence found
- Evidence missing
- Good evidence, verification needed
- Human review required
- Decision reason required

It must not claim that the system selects candidates, rejects candidates, guarantees fairness, or finds the best person.

## Demo Dataset

Use Northstar Digital and the existing Frontend Developer role. Generate 60 synthetic resume profiles across eight categories:

- Strong frontend evidence
- Good evidence, verification needed
- Missing key evidence
- Needs human review
- Failed or unreadable resume
- Wrong role
- Incomplete resume
- Over-claiming, needs verification

Each synthetic profile records a resume category, expected evidence level, actual evidence level, report status, evidence found, evidence missing, verification notes, and recommended recruiter action.

## Demo Page

Add `/demo-test-lab` as an internal public route for now. The page should include:

- A clear explanation of the test setup
- Summary metrics for total resumes, report-ready records, human-review records, missing-evidence records, and expected-outcome matches
- Category breakdown
- Candidate evidence table
- A small explanation of what the demo proves and what it does not prove

## Architecture

Keep all demo data in `demoTestLabService` so the page does not import raw mock data. This keeps the production-facing shape replaceable by real database/API data later.

## Verification

Add tests for:

- 60 generated synthetic resumes
- all required categories present
- summary totals matching the generated records
- demo page route renders the key explanation and table content
- safe copy avoids forbidden hiring language
