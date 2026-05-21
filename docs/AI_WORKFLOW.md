# AI Workflow

## Important AI Rule

AI must never make the final hiring decision.

AI should:

- Extract job criteria
- Parse resumes
- Match evidence
- Identify missing proof
- Suggest interview questions
- Check fairness risk
- Summarize evidence

AI must not:

- Auto reject candidates
- Claim someone is the best candidate
- Use protected characteristics
- Scrape private data
- Make final decisions
- Use vague culture fit scoring

## AI Modules

## Module 1: Job Analyzer

Input:

- Job title
- Job description
- Seniority level
- Work arrangement

Output:

- Must-have criteria
- Nice-to-have criteria
- Experience requirements
- Education requirements
- Certification requirements
- Soft skills
- Risky wording
- Suggested questionnaire questions

Output must be valid JSON.

## Module 2: Question Generator

Input:

- Job criteria

Output:

- 5 to 8 job-specific questions
- Each question must connect to one or more job criteria
- Questions must ask for evidence, examples, or real experience

Avoid personality questions.

## Module 3: Resume Parser

Input:

- Extracted resume text

Output:

- Candidate summary
- Work history
- Skills
- Education
- Projects
- Certifications
- Evidence snippets

Do not infer protected characteristics.

## Module 4: Evidence Matcher

Input:

- Job criteria
- Parsed resume profile
- Questionnaire answers
- Candidate-provided links

Output:

- Evidence matrix
- Confidence levels
- Missing evidence
- Verification questions

Confidence values:

- high
- medium
- low
- none

## Module 5: Fairness Checker

Input:

- Job criteria
- Evidence report
- Recruiter decision reason

Output:

- Protected characteristics excluded
- Risk warnings
- Suggested safer wording

## Module 6: Report Generator

Input:

- Evidence matrix
- Fairness check
- Missing evidence
- Questionnaire analysis

Output:

- Candidate Evidence Report

The report must clearly say:

"AI-assisted analysis. Human review required."

## Protected Characteristics Rule

Do not use or score candidates based on:

- Age
- Race
- Religion
- Gender
- Marital status
- Pregnancy
- Caregiving responsibility
- Disability
- Mental health condition
- Photo
- Nationality unless legally job-relevant
- Language ability unless genuinely job-relevant

## AI Output Style

Use factual language.

Good:

"The candidate provides resume evidence of React work in two projects."

Bad:

"This candidate is perfect."

Good:

"No clear evidence of AWS deployment was found."

Bad:

"This candidate is weak."

Good:

"Human review is required before final decision."

Bad:

"AI recommends rejection."
