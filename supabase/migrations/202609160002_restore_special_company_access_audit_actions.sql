-- Restore the two audit actions emitted by apply_special_company_access.
-- This migration only expands the existing allowlist; it does not weaken the
-- audit action constraint or change any rows.
alter table public.audit_log_entries
  drop constraint if exists audit_log_entries_action_check;

alter table public.audit_log_entries
  add constraint audit_log_entries_action_check check (
    action in (
      'dashboard_viewed',
      'job_role_read',
      'candidate_read',
      'evidence_report_read',
      'human_review_decision_saved',
      'upload_validated',
      'document_uploaded',
      'candidate_upload_recorded',
      'candidate_upload_failed',
      'evidence_report_generated',
      'demo_trial_activated',
      'demo_workspace_converted',
      'job_role_created',
      'access_request_approved',
      'access_request_rejected',
      'ongoing_access_requested',
      'ongoing_access_approved',
      'ongoing_access_started',
      'ongoing_access_rejected',
      'evidence_report_analysis_failed',
      'public_evidence_analyzed',
      'special_company_access_granted',
      'special_company_access_transferred'
    )
  );
