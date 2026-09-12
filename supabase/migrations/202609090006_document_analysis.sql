-- Private browser extraction and server-finalized AI evidence reports. The browser
-- can request status, while only the Edge function's service role can claim or
-- finish a run after it authenticates the requesting user.

create table if not exists public.document_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null unique references public.uploaded_documents(id) on delete cascade,
  application_id uuid not null references public.candidate_applications(id) on delete cascade,
  actor_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  status text not null check (status in ('processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 2),
  lease_expires_at timestamptz,
  lease_token uuid,
  extraction_method text not null check (extraction_method in ('browser_pdf_text', 'browser_docx_raw_text')),
  extraction_text text not null check (length(extraction_text) between 1 and 24000),
  extraction_metadata jsonb not null default '{}'::jsonb,
  job_criteria_snapshot jsonb not null default '[]'::jsonb,
  job_criteria_hash text not null,
  report_id uuid references public.evidence_reports(id) on delete set null,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_document_analysis_runs_company_document on public.document_analysis_runs(company_id, document_id);
alter table public.document_analysis_runs enable row level security;
revoke all on public.document_analysis_runs from public, anon, authenticated;

alter table public.evidence_items add column if not exists source_reference text;

create or replace function public.claim_document_analysis_run(
  p_document_id uuid,
  p_actor_user_id uuid,
  p_extracted_text text,
  p_extraction_method text,
  p_extraction_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_company_count integer;
  v_document public.uploaded_documents;
  v_application public.candidate_applications;
  v_job public.job_roles;
  v_run public.document_analysis_runs;
  v_criteria jsonb;
  v_report_code text;
  v_lease_token uuid := gen_random_uuid();
  v_metadata jsonb;
begin
  select count(*) into v_company_count
  from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = p_actor_user_id and r.status = 'active'
    and r.role in ('admin', 'recruiter', 'hiring_manager') and c.status = 'active';
  if v_company_count <> 1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode = '42501'; end if;
  select r.company_id, r.id into v_company_id, v_profile_id
  from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = p_actor_user_id and r.status = 'active'
    and r.role in ('admin', 'recruiter', 'hiring_manager') and c.status = 'active';

  if p_extraction_method not in ('browser_pdf_text', 'browser_docx_raw_text') then raise exception 'EXTRACTION_METHOD_INVALID'; end if;
  if nullif(trim(coalesce(p_extracted_text, '')), '') is null or length(p_extracted_text) > 24000 then raise exception 'EXTRACTED_TEXT_INVALID'; end if;
  if jsonb_typeof(coalesce(p_extraction_metadata, '{}'::jsonb)) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_extraction_metadata) key where key not in ('pageCount','pageLabels','warnings'))
    or jsonb_typeof(coalesce(p_extraction_metadata->'pageLabels','[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_extraction_metadata->'warnings','[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_extraction_metadata->'pageLabels','[]'::jsonb)) > 25
    or jsonb_array_length(coalesce(p_extraction_metadata->'warnings','[]'::jsonb)) > 5
    or exists (select 1 from jsonb_array_elements(coalesce(p_extraction_metadata->'pageLabels','[]'::jsonb)) item where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 30 or item #>> '{}' !~ '^Page [1-9][0-9]?$')
    or exists (select 1 from jsonb_array_elements(coalesce(p_extraction_metadata->'warnings','[]'::jsonb)) item where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 300)
  then raise exception 'EXTRACTION_METADATA_INVALID'; end if;
  if p_extraction_method = 'browser_pdf_text' and (jsonb_typeof(p_extraction_metadata->'pageCount') <> 'number' or p_extraction_metadata->>'pageCount' !~ '^[1-9][0-9]?$' or (p_extraction_metadata->>'pageCount')::integer > 25) then raise exception 'EXTRACTION_METADATA_INVALID'; end if;
  if p_extraction_method = 'browser_docx_raw_text' and coalesce(p_extraction_metadata->>'pageCount','') <> '0' then raise exception 'EXTRACTION_METADATA_INVALID'; end if;
  v_metadata := jsonb_build_object('pageCount', (p_extraction_metadata->>'pageCount')::integer, 'pageLabels', coalesce(p_extraction_metadata->'pageLabels','[]'::jsonb), 'warnings', coalesce(p_extraction_metadata->'warnings','[]'::jsonb));

  select * into v_document from public.uploaded_documents
  where id = p_document_id and company_id = v_company_id for update;
  if v_document.id is null then raise exception 'DOCUMENT_NOT_IN_WORKSPACE'; end if;
  select * into v_application from public.candidate_applications
  where id = v_document.application_id and company_id = v_company_id
    and candidate_id = v_document.candidate_id for update;
  if v_application.id is null then raise exception 'DOCUMENT_APPLICATION_RELATION_INVALID'; end if;
  select * into v_job from public.job_roles where id = v_application.job_id and company_id = v_company_id;
  if v_job.id is null then raise exception 'DOCUMENT_JOB_RELATION_INVALID'; end if;
  if not public.demo_workspace_is_writable(v_company_id) then raise exception 'PILOT_EXPIRED'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'description', description, 'priority', priority, 'sortOrder', sort_order) order by sort_order, id), '[]'::jsonb)
  into v_criteria from public.job_requirements where company_id = v_company_id and job_id = v_job.id;
  if jsonb_array_length(v_criteria) = 0 or jsonb_array_length(v_criteria) > 12 then raise exception 'JOB_CRITERIA_INVALID'; end if;

  select * into v_run from public.document_analysis_runs where document_id = p_document_id for update;
  if v_run.id is not null and v_run.status = 'completed' then
    select public_report_code into v_report_code from public.evidence_reports where id = v_run.report_id and company_id = v_company_id;
    return jsonb_build_object('state', 'completed', 'run_id', v_run.id, 'report_code', v_report_code);
  end if;
  if v_run.id is not null and v_run.status = 'processing' and v_run.lease_expires_at > now() then
    return jsonb_build_object('state', 'processing', 'run_id', v_run.id);
  end if;
  if v_run.id is not null and v_run.attempt_count >= 2 then
    update public.document_analysis_runs set status = 'failed', failure_code = 'ATTEMPT_LIMIT', lease_expires_at = null, updated_at = now() where id = v_run.id;
    update public.uploaded_documents set parsing_status = 'manual_review_required', error_message = 'Analysis attempt limit reached. Use manual review.', updated_at = now() where id = p_document_id;
    update public.candidate_applications set status = 'needs_review', updated_at = now() where id = v_application.id;
    return jsonb_build_object('state', 'failed', 'run_id', v_run.id);
  end if;

  if v_run.id is null then
    insert into public.document_analysis_runs(company_id, document_id, application_id, actor_profile_id, status, attempt_count, lease_expires_at, lease_token, extraction_method, extraction_text, extraction_metadata, job_criteria_snapshot, job_criteria_hash)
    values (v_company_id, p_document_id, v_application.id, v_profile_id, 'processing', 1, now() + interval '90 seconds', v_lease_token, p_extraction_method, trim(p_extracted_text), v_metadata, v_criteria, encode(extensions.digest(v_criteria::text, 'sha256'), 'hex'))
    returning * into v_run;
  else
    update public.document_analysis_runs set actor_profile_id = v_profile_id, status = 'processing', attempt_count = v_run.attempt_count + 1,
      lease_expires_at = now() + interval '90 seconds', lease_token = v_lease_token, extraction_method = p_extraction_method, extraction_text = trim(p_extracted_text),
      extraction_metadata = v_metadata, job_criteria_snapshot = v_criteria, job_criteria_hash = encode(extensions.digest(v_criteria::text, 'sha256'), 'hex'),
      failure_code = null, updated_at = now() where id = v_run.id returning * into v_run;
  end if;
  update public.uploaded_documents set parsing_status = 'parsing', error_message = null, updated_at = now() where id = p_document_id;
  update public.candidate_applications set status = 'processing', updated_at = now() where id = v_application.id;
  return jsonb_build_object('state', 'claimed', 'run_id', v_run.id, 'lease_token', v_run.lease_token, 'job_title', v_job.title, 'criteria', v_criteria);
end;
$$;

create or replace function public.finalize_document_analysis_run(p_run_id uuid, p_actor_user_id uuid, p_lease_token uuid, p_analysis jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run public.document_analysis_runs;
  v_document public.uploaded_documents;
  v_application public.candidate_applications;
  v_profile public.recruiter_profiles;
  v_company_count integer;
  v_report_id uuid := gen_random_uuid();
  v_report_code text;
  v_item jsonb;
  v_requirement jsonb;
  v_position integer := 0;
  v_items jsonb;
  v_missing jsonb;
  v_questions jsonb;
  v_notes jsonb;
begin
  select count(*) into v_company_count from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = p_actor_user_id and r.status = 'active' and r.role in ('admin','recruiter','hiring_manager') and c.status = 'active';
  if v_company_count <> 1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode = '42501'; end if;
  select * into v_run from public.document_analysis_runs where id = p_run_id for update;
  if v_run.id is null or v_run.status <> 'processing' or v_run.lease_expires_at <= now() or v_run.lease_token is distinct from p_lease_token then raise exception 'ANALYSIS_RUN_NOT_FINALIZABLE'; end if;
  select * into v_profile from public.recruiter_profiles where id = v_run.actor_profile_id and user_id = p_actor_user_id and company_id = v_run.company_id and status = 'active';
  if v_profile.id is null then raise exception 'ANALYSIS_ACTOR_INVALID'; end if;
  if not public.demo_workspace_is_writable(v_run.company_id) then raise exception 'PILOT_EXPIRED'; end if;
  select * into v_document from public.uploaded_documents where id = v_run.document_id and company_id = v_run.company_id;
  select * into v_application from public.candidate_applications where id = v_run.application_id and company_id = v_run.company_id and candidate_id = v_document.candidate_id;
  if v_document.id is null or v_application.id is null then raise exception 'ANALYSIS_RELATION_INVALID'; end if;
  if jsonb_typeof(coalesce(p_analysis, 'null'::jsonb)) <> 'object' or jsonb_typeof(p_analysis->'requirementEvidence') <> 'array' then raise exception 'ANALYSIS_PAYLOAD_INVALID'; end if;
  v_items := p_analysis->'requirementEvidence';
  if jsonb_array_length(v_items) <> jsonb_array_length(v_run.job_criteria_snapshot) then raise exception 'ANALYSIS_CRITERIA_COUNT_INVALID'; end if;
  for v_requirement in select * from jsonb_array_elements(v_run.job_criteria_snapshot) loop
    v_item := v_items->v_position;
    if v_item->>'criteriaId' <> v_requirement->>'id'
      or nullif(trim(coalesce(v_item->>'evidence','')), '') is null or length(v_item->>'evidence') > 2000
      or nullif(trim(coalesce(v_item->>'sourceReference','')), '') is null or length(v_item->>'sourceReference') > 300
      or nullif(trim(coalesce(v_item->>'verificationNeeded','')), '') is null or length(v_item->>'verificationNeeded') > 600
      or v_item->>'confidence' not in ('High','Medium','Low','None')
      or v_item->>'statusLabel' not in ('Evidence found','Needs verification','Missing evidence')
    then raise exception 'ANALYSIS_ITEM_INVALID'; end if;
    v_position := v_position + 1;
  end loop;
  v_missing := coalesce(p_analysis->'missingEvidence', '[]'::jsonb);
  v_questions := coalesce(p_analysis->'suggestedInterviewQuestions', '[]'::jsonb);
  v_notes := coalesce(p_analysis->'recruiterNotes', '[]'::jsonb);
  if jsonb_typeof(v_missing) <> 'array' or jsonb_typeof(v_questions) <> 'array' or jsonb_typeof(v_notes) <> 'array'
    or jsonb_array_length(v_missing) > 12 or jsonb_array_length(v_questions) > 12 or jsonb_array_length(v_notes) > 12 then raise exception 'ANALYSIS_LIST_INVALID'; end if;
  v_report_code := 'HER-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_report_id::text, '-', ''), 1, 6));
  insert into public.evidence_reports(id, company_id, job_id, application_id, candidate_id, public_report_code, status, evidence_summary, missing_evidence, verification_needed, suggested_interview_questions, recruiter_notes, fairness_check)
  values (v_report_id, v_run.company_id, v_application.job_id, v_application.id, v_document.candidate_id, v_report_code, 'Human review required',
    jsonb_build_array(jsonb_build_object('label','Evidence report','value','Source-grounded draft','detail','Review each source reference before deciding.','tone','info'), jsonb_build_object('label','Human decision','value','Decision reason required','detail','Final decisions stay with the hiring team.','tone','info')),
    v_missing, (select coalesce(jsonb_agg(value->>'verificationNeeded'), '[]'::jsonb) from jsonb_array_elements(v_items) value), v_questions, v_notes,
    jsonb_build_object('status','Not checked','reminder','Human review is required. Verify job-related source evidence before recording a decision.'));
  v_position := 0;
  for v_requirement in select * from jsonb_array_elements(v_run.job_criteria_snapshot) loop
    v_item := v_items->v_position;
    insert into public.evidence_items(company_id, report_id, application_id, requirement_id, requirement, candidate_evidence, source, source_reference, confidence, verification_needed, status_label, status_tone)
    values (v_run.company_id, v_report_id, v_application.id, (v_requirement->>'id')::uuid, v_requirement->>'label', trim(v_item->>'evidence'), 'Resume', trim(v_item->>'sourceReference'), v_item->>'confidence', trim(v_item->>'verificationNeeded'), v_item->>'statusLabel', case v_item->>'statusLabel' when 'Evidence found' then 'info' when 'Missing evidence' then 'warning' else 'warning' end);
    v_position := v_position + 1;
  end loop;
  insert into public.parsed_cvs(company_id, document_id, application_id, status, parse_warnings) values (v_run.company_id, v_document.id, v_application.id, 'parsed', coalesce(v_run.extraction_metadata->'warnings','[]'::jsonb));
  update public.uploaded_documents set parsing_status = 'parsed', error_message = null, updated_at = now() where id = v_document.id;
  update public.candidate_applications set status = 'report_ready', updated_at = now() where id = v_application.id;
  update public.document_analysis_runs set status = 'completed', report_id = v_report_id, lease_expires_at = null, lease_token = null, completed_at = now(), updated_at = now() where id = v_run.id;
  insert into public.audit_log_entries(company_id, actor_profile_id, entity_type, entity_id, action, metadata) values (v_run.company_id, v_profile.id, 'evidence_report', v_report_id, 'evidence_report_generated', jsonb_build_object('document_id',v_document.id,'analysis_run_id',v_run.id,'extraction_method',v_run.extraction_method,'job_criteria_hash',v_run.job_criteria_hash));
  return jsonb_build_object('report_id',v_report_id,'public_report_code',v_report_code);
end;
$$;

create or replace function public.fail_document_analysis_run(p_run_id uuid, p_actor_user_id uuid, p_lease_token uuid, p_failure_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_run public.document_analysis_runs; v_profile public.recruiter_profiles;
begin
  select * into v_run from public.document_analysis_runs where id = p_run_id for update;
  if v_run.id is null or v_run.status <> 'processing' or v_run.lease_token is distinct from p_lease_token then return; end if;
  select * into v_profile from public.recruiter_profiles where id = v_run.actor_profile_id and user_id = p_actor_user_id and company_id = v_run.company_id and status = 'active';
  if v_profile.id is null then raise exception 'ANALYSIS_ACTOR_INVALID'; end if;
  update public.document_analysis_runs set status='failed', failure_code=left(coalesce(nullif(trim(p_failure_code),''),'ANALYSIS_FAILED'),80), lease_expires_at=null, lease_token=null, updated_at=now() where id=v_run.id;
  update public.uploaded_documents set parsing_status='manual_review_required', error_message='Analysis could not be completed. Use manual review.', updated_at=now() where id=v_run.document_id;
  update public.candidate_applications set status='needs_review', updated_at=now() where id=v_run.application_id;
  insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(v_run.company_id,v_profile.id,'document_analysis_run',v_run.id,'evidence_report_analysis_failed',jsonb_build_object('document_id',v_run.document_id,'failure_code',left(coalesce(nullif(trim(p_failure_code),''),'ANALYSIS_FAILED'),80)));
end;
$$;

create or replace function public.get_document_analysis_status(p_document_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_company_count integer; v_run public.document_analysis_runs; v_report_code text;
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  select * into v_run from public.document_analysis_runs where document_id=p_document_id and company_id in (select public.current_company_ids());
  if v_run.id is null then return jsonb_build_object('status','not_started'); end if;
  select public_report_code into v_report_code from public.evidence_reports where id=v_run.report_id and company_id=v_run.company_id;
  return jsonb_build_object('status',v_run.status,'attempt_count',v_run.attempt_count,'report_code',v_report_code);
end;
$$;

alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (action in (
  'dashboard_viewed','job_role_read','candidate_read','evidence_report_read','human_review_decision_saved','upload_validated','document_uploaded','candidate_upload_recorded','candidate_upload_failed','evidence_report_generated','demo_trial_activated','demo_workspace_converted','job_role_created','access_request_approved','access_request_rejected','ongoing_access_requested','ongoing_access_approved','ongoing_access_started','ongoing_access_rejected','evidence_report_analysis_failed'
));

revoke all on function public.claim_document_analysis_run(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.finalize_document_analysis_run(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.fail_document_analysis_run(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.get_document_analysis_status(uuid) from public, anon;
grant execute on function public.claim_document_analysis_run(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.finalize_document_analysis_run(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.fail_document_analysis_run(uuid,uuid,uuid,text) to service_role;
grant execute on function public.get_document_analysis_status(uuid) to authenticated;
;
