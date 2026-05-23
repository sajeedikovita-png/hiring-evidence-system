create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'recruiter', 'hiring_manager')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  title text not null,
  department text,
  location text,
  employment_type text,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.job_roles(id) on delete cascade,
  label text not null,
  description text not null,
  priority text not null check (priority in ('required', 'preferred')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  source text not null check (source in ('bulk_upload', 'application_link', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.job_roles(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'processing', 'report_ready', 'needs_review', 'failed')),
  consent_status text not null default 'missing' check (consent_status in ('recorded', 'missing')),
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table if not exists public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  uploaded_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  upload_status text not null check (upload_status in ('accepted', 'failed', 'manual_review_required')),
  parsing_status text not null check (parsing_status in ('queued', 'parsing', 'parsed', 'failed', 'manual_review_required')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parsed_cvs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.uploaded_documents(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  status text not null check (status in ('queued', 'parsing', 'parsed', 'failed', 'manual_review_required')),
  extracted_name text,
  extracted_email text,
  extracted_skills jsonb not null default '[]'::jsonb,
  extracted_experience jsonb not null default '[]'::jsonb,
  parse_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.job_roles(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  public_report_code text not null,
  status text not null check (status in ('Evidence report ready', 'Human review required', 'Decision pending', 'Recruiter decision recorded')),
  evidence_summary jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  verification_needed jsonb not null default '[]'::jsonb,
  suggested_interview_questions jsonb not null default '[]'::jsonb,
  recruiter_notes jsonb not null default '[]'::jsonb,
  fairness_check jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, public_report_code)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid not null references public.evidence_reports(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  requirement_id uuid references public.job_requirements(id) on delete set null,
  requirement text not null,
  candidate_evidence text not null,
  source text not null check (source in ('Resume', 'Questionnaire', 'Recruiter note', 'System')),
  confidence text not null check (confidence in ('High', 'Medium', 'Low', 'None')),
  verification_needed text not null,
  status_label text not null,
  status_tone text not null check (status_tone in ('neutral', 'success', 'warning', 'danger', 'info')),
  created_at timestamptz not null default now()
);

create table if not exists public.human_review_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid not null references public.evidence_reports(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  recruiter_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  decision text not null check (decision in ('Shortlist for interview', 'Hold for review', 'Not proceeding', 'Request more information')),
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'saved' check (status in ('draft', 'saved')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (
    action in (
      'dashboard_viewed',
      'job_role_read',
      'candidate_read',
      'evidence_report_read',
      'human_review_decision_saved',
      'upload_validated'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_recruiter_profiles_company_id on public.recruiter_profiles(company_id);
create index if not exists idx_recruiter_profiles_user_id on public.recruiter_profiles(user_id);

create index if not exists idx_job_roles_company_id on public.job_roles(company_id);
create index if not exists idx_job_requirements_company_id on public.job_requirements(company_id);
create index if not exists idx_job_requirements_job_id on public.job_requirements(job_id);

create index if not exists idx_candidates_company_id on public.candidates(company_id);
create index if not exists idx_candidate_applications_company_id on public.candidate_applications(company_id);
create index if not exists idx_candidate_applications_job_id on public.candidate_applications(job_id);
create index if not exists idx_candidate_applications_candidate_id on public.candidate_applications(candidate_id);

create index if not exists idx_uploaded_documents_company_id on public.uploaded_documents(company_id);
create index if not exists idx_uploaded_documents_application_id on public.uploaded_documents(application_id);
create index if not exists idx_uploaded_documents_candidate_id on public.uploaded_documents(candidate_id);

create index if not exists idx_parsed_cvs_company_id on public.parsed_cvs(company_id);
create index if not exists idx_parsed_cvs_application_id on public.parsed_cvs(application_id);
create index if not exists idx_parsed_cvs_document_id on public.parsed_cvs(document_id);

create index if not exists idx_evidence_reports_company_id on public.evidence_reports(company_id);
create index if not exists idx_evidence_reports_job_id on public.evidence_reports(job_id);
create index if not exists idx_evidence_reports_application_id on public.evidence_reports(application_id);
create index if not exists idx_evidence_reports_candidate_id on public.evidence_reports(candidate_id);

create index if not exists idx_evidence_items_company_id on public.evidence_items(company_id);
create index if not exists idx_evidence_items_report_id on public.evidence_items(report_id);
create index if not exists idx_evidence_items_application_id on public.evidence_items(application_id);

create index if not exists idx_human_review_decisions_company_id on public.human_review_decisions(company_id);
create index if not exists idx_human_review_decisions_report_id on public.human_review_decisions(report_id);
create index if not exists idx_human_review_decisions_application_id on public.human_review_decisions(application_id);

create index if not exists idx_audit_log_entries_company_id on public.audit_log_entries(company_id);
create index if not exists idx_audit_log_entries_entity_id on public.audit_log_entries(entity_id);

create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select recruiter_profiles.company_id
  from public.recruiter_profiles
  where recruiter_profiles.user_id = auth.uid()
    and recruiter_profiles.status = 'active'
$$;

alter table public.companies enable row level security;
alter table public.recruiter_profiles enable row level security;
alter table public.job_roles enable row level security;
alter table public.job_requirements enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_applications enable row level security;
alter table public.uploaded_documents enable row level security;
alter table public.parsed_cvs enable row level security;
alter table public.evidence_reports enable row level security;
alter table public.evidence_items enable row level security;
alter table public.human_review_decisions enable row level security;
alter table public.audit_log_entries enable row level security;

create policy companies_select_by_membership
  on public.companies for select
  using (id in (select public.current_company_ids()));

create policy recruiter_profiles_company_access
  on public.recruiter_profiles for select
  using (company_id in (select public.current_company_ids()));

create policy recruiter_profiles_company_update
  on public.recruiter_profiles for update
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy job_roles_company_access
  on public.job_roles for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy job_requirements_company_access
  on public.job_requirements for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy candidates_company_access
  on public.candidates for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy candidate_applications_company_access
  on public.candidate_applications for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy uploaded_documents_company_access
  on public.uploaded_documents for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy parsed_cvs_company_access
  on public.parsed_cvs for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy evidence_reports_company_access
  on public.evidence_reports for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy evidence_items_company_access
  on public.evidence_items for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy human_review_decisions_company_access
  on public.human_review_decisions for all
  using (company_id in (select public.current_company_ids()))
  with check (company_id in (select public.current_company_ids()));

create policy audit_log_entries_company_insert
  on public.audit_log_entries for insert
  with check (company_id in (select public.current_company_ids()));

create policy audit_log_entries_company_select
  on public.audit_log_entries for select
  using (company_id in (select public.current_company_ids()));
