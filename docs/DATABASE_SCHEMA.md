# Database Schema

Use PostgreSQL.

## Tables

## organizations

Stores company accounts.

Fields:

- id
- name
- website
- industry
- country
- created_at
- updated_at

## users

Stores login users.

Fields:

- id
- email
- full_name
- role
- created_at
- updated_at

Roles:

- company_admin
- recruiter
- hiring_manager

## organization_members

Connects users to organizations.

Fields:

- id
- organization_id
- user_id
- role
- created_at

## jobs

Stores jobs created by companies.

Fields:

- id
- organization_id
- title
- department
- location
- work_arrangement
- seniority_level
- salary_min
- salary_max
- job_description
- status
- application_public_id
- created_by
- created_at
- updated_at

Status values:

- draft
- active
- closed
- archived

## job_criteria

Stores extracted and edited job requirements.

Fields:

- id
- job_id
- criterion_text
- criterion_type
- weight
- evidence_needed
- is_required
- created_at
- updated_at

Criterion types:

- must_have
- nice_to_have
- soft_skill
- experience
- education
- certification

## candidates

Stores candidate identity.

Fields:

- id
- full_name
- email
- phone
- country
- created_at
- updated_at

## applications

Stores candidate applications for jobs.

Fields:

- id
- job_id
- candidate_id
- status
- submitted_at
- created_at
- updated_at

Status values:

- started
- submitted
- report_generating
- report_ready
- under_review
- shortlisted
- interview
- hold
- rejected
- withdrawn

## candidate_documents

Stores uploaded documents.

Fields:

- id
- application_id
- document_type
- file_url
- file_name
- file_size
- extracted_text
- created_at

Document types:

- resume
- certificate
- portfolio_document
- other

## candidate_links

Stores optional candidate-provided links.

Fields:

- id
- application_id
- link_type
- url
- candidate_permission
- created_at

Link types:

- linkedin
- github
- portfolio
- personal_website
- certificate
- other

## candidate_consents

Stores candidate consent.

Fields:

- id
- application_id
- consent_resume_use
- consent_questionnaire_use
- consent_profile_links_use
- consent_document_use
- consent_data_retention
- consent_text_version
- consented_at
- ip_address

## questionnaire_questions

Stores job-specific questions.

Fields:

- id
- job_id
- question_text
- question_type
- related_criterion_id
- created_at

## questionnaire_answers

Stores candidate answers.

Fields:

- id
- application_id
- question_id
- answer_text
- created_at

## parsed_candidate_profiles

Stores structured resume parsing result.

Fields:

- id
- application_id
- parsed_json
- created_at
- updated_at

## evidence_items

Stores evidence matched to job criteria.

Fields:

- id
- application_id
- criterion_id
- evidence_source
- evidence_text
- confidence_level
- verification_needed
- source_reference
- ai_summary
- created_at

Evidence sources:

- resume
- questionnaire
- portfolio
- github
- certificate
- recruiter_note

Confidence levels:

- high
- medium
- low
- none

## candidate_reports

Stores generated evidence report.

Fields:

- id
- application_id
- overall_evidence_level
- summary
- missing_evidence_summary
- suggested_interview_questions_json
- report_json
- created_at
- updated_at

Evidence levels:

- strong_evidence
- good_evidence_needs_verification
- insufficient_evidence
- needs_human_review

## fairness_checks

Stores fairness review result.

Fields:

- id
- application_id
- protected_characteristics_excluded_json
- warnings_json
- decision_wording_warnings_json
- created_at

## review_decisions

Stores final human review decision.

Fields:

- id
- application_id
- reviewer_id
- decision
- decision_reason
- created_at

Decision values:

- shortlist
- invite_to_interview
- hold
- needs_more_evidence
- reject

## audit_logs

Stores important actions.

Fields:

- id
- organization_id
- user_id
- entity_type
- entity_id
- action
- metadata_json
- created_at

## bulk_upload_batches

Stores one job-based bulk resume upload run.

Fields:

- id
- job_id
- organization_id
- uploaded_by
- status
- total_files
- processed_files
- failed_files
- created_at

Status values:

- uploaded
- parsing
- parsed
- report_generating
- report_ready
- failed
- needs_manual_review

## bulk_upload_files

Stores each resume file inside a bulk upload batch.

Fields:

- id
- batch_id
- file_name
- file_url
- status
- error_message
- candidate_id
- application_id
- created_at

File rules:

- allow PDF and DOCX resumes
- reject unsupported file types before processing
- create one application record per accepted resume under the selected job
- keep failed files visible for human review

## ai_usage_logs

Stores AI usage for cost tracking.

Fields:

- id
- organization_id
- application_id
- module_name
- model_name
- input_tokens
- output_tokens
- estimated_cost
- created_at
