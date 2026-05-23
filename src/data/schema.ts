export type HiringSchemaColumn = {
  name: string;
  type: string;
  references?: string;
  nullable?: boolean;
};

export type HiringSchemaTable = {
  name: string;
  columns: HiringSchemaColumn[];
};

export const hiringSchemaTables: HiringSchemaTable[] = [
  {
    name: "organizations",
    columns: [
      { name: "id", type: "uuid" },
      { name: "name", type: "text" },
      { name: "status", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "users",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
      { name: "role", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "jobs",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "title", type: "text" },
      { name: "department", type: "text" },
      { name: "location", type: "text" },
      { name: "employment_type", type: "text" },
      { name: "status", type: "text" },
      { name: "created_by", type: "uuid", references: "users.id" },
      { name: "created_at", type: "timestamp" },
      { name: "updated_at", type: "timestamp" }
    ]
  },
  {
    name: "job_criteria",
    columns: [
      { name: "id", type: "uuid" },
      { name: "job_id", type: "uuid", references: "jobs.id" },
      { name: "label", type: "text" },
      { name: "description", type: "text" },
      { name: "priority", type: "text" },
      { name: "sort_order", type: "integer" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "candidates",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "name", type: "text" },
      { name: "email", type: "text", nullable: true },
      { name: "source", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "applications",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "job_id", type: "uuid", references: "jobs.id" },
      { name: "candidate_id", type: "uuid", references: "candidates.id" },
      { name: "status", type: "text" },
      { name: "applied_at", type: "timestamp" },
      { name: "consent_id", type: "uuid", references: "candidate_consents.id", nullable: true }
    ]
  },
  {
    name: "candidate_documents",
    columns: [
      { name: "id", type: "uuid" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "candidate_id", type: "uuid", references: "candidates.id" },
      { name: "file_name", type: "text" },
      { name: "file_url", type: "text" },
      { name: "file_type", type: "text" },
      { name: "upload_status", type: "text" },
      { name: "parsing_status", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "candidate_consents",
    columns: [
      { name: "id", type: "uuid" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "candidate_id", type: "uuid", references: "candidates.id" },
      { name: "consent_text", type: "text" },
      { name: "status", type: "text" },
      { name: "recorded_at", type: "timestamp", nullable: true }
    ]
  },
  {
    name: "questionnaire_questions",
    columns: [
      { name: "id", type: "uuid" },
      { name: "job_id", type: "uuid", references: "jobs.id" },
      { name: "prompt", type: "text" },
      { name: "sort_order", type: "integer" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "questionnaire_answers",
    columns: [
      { name: "id", type: "uuid" },
      { name: "question_id", type: "uuid", references: "questionnaire_questions.id" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "answer", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "evidence_items",
    columns: [
      { name: "id", type: "uuid" },
      { name: "report_id", type: "uuid", references: "candidate_reports.id" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "criteria_id", type: "uuid", references: "job_criteria.id" },
      { name: "requirement", type: "text" },
      { name: "evidence", type: "text" },
      { name: "source", type: "text" },
      { name: "confidence", type: "text" },
      { name: "verification_needed", type: "text" },
      { name: "status", type: "json" }
    ]
  },
  {
    name: "candidate_reports",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "job_id", type: "uuid", references: "jobs.id" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "candidate_id", type: "uuid", references: "candidates.id" },
      { name: "report_id", type: "text" },
      { name: "generated_at", type: "timestamp" },
      { name: "review_status", type: "json" },
      { name: "evidence_level", type: "text" },
      { name: "fairness", type: "json" },
      { name: "summary_cards", type: "json" },
      { name: "missing_evidence", type: "json" },
      { name: "interview_questions", type: "json" },
      { name: "recruiter_notes", type: "json" },
      { name: "decision_options", type: "json" }
    ]
  },
  {
    name: "review_decisions",
    columns: [
      { name: "id", type: "uuid" },
      { name: "report_id", type: "uuid", references: "candidate_reports.id" },
      { name: "application_id", type: "uuid", references: "applications.id" },
      { name: "recruiter_id", type: "uuid", references: "users.id" },
      { name: "decision", type: "text" },
      { name: "reason", type: "text" },
      { name: "status", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "audit_logs",
    columns: [
      { name: "id", type: "uuid" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "user_id", type: "uuid", references: "users.id" },
      { name: "entity_type", type: "text" },
      { name: "entity_id", type: "uuid" },
      { name: "action", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "bulk_upload_batches",
    columns: [
      { name: "id", type: "uuid" },
      { name: "job_id", type: "uuid", references: "jobs.id" },
      { name: "organization_id", type: "uuid", references: "organizations.id" },
      { name: "uploaded_by", type: "uuid", references: "users.id" },
      { name: "status", type: "text" },
      { name: "total_files", type: "integer" },
      { name: "processed_files", type: "integer" },
      { name: "failed_files", type: "integer" },
      { name: "created_at", type: "timestamp" }
    ]
  },
  {
    name: "bulk_upload_files",
    columns: [
      { name: "id", type: "uuid" },
      { name: "batch_id", type: "uuid", references: "bulk_upload_batches.id" },
      { name: "file_name", type: "text" },
      { name: "file_url", type: "text" },
      { name: "status", type: "text" },
      { name: "error_message", type: "text", nullable: true },
      { name: "candidate_id", type: "uuid", references: "candidates.id", nullable: true },
      { name: "application_id", type: "uuid", references: "applications.id", nullable: true },
      { name: "candidate_name", type: "text", nullable: true },
      { name: "parsing_status", type: "text" },
      { name: "evidence_report_status", type: "text" },
      { name: "created_at", type: "timestamp" }
    ]
  }
];
