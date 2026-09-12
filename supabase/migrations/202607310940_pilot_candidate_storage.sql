-- Persistent, private CV processing for approved demo workspaces.
--
-- The login-free sales demo keeps its browser-local scripted reports. A signed-in
-- customer workspace stores the real file in a private bucket and writes real
-- candidate/application/document/report rows, so the work survives a refresh, a
-- different device, and a different recruiter in the same company.

-- 1. Quotas live with the entitlement so Postgres, not the browser, is the limit.
alter table public.demo_entitlements
  add column if not exists max_users integer not null default 2 check (max_users > 0),
  add column if not exists max_jobs integer not null default 2 check (max_jobs > 0),
  add column if not exists max_candidates integer not null default 50 check (max_candidates > 0);
-- 2. Private bucket. Never public: files are read through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;
-- Object keys are <company>/<job>/<application>/<document>.<ext>, so the first
-- folder segment is the tenant boundary. Compare as text and cast defensively:
-- a malformed key must be denied, not raise.
create or replace function public.current_company_ids_text()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select company_id::text
  from public.recruiter_profiles
  where user_id = auth.uid()
    and status = 'active'
$$;
create or replace function public.demo_folder_is_writable(p_company text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  begin
    v_company_id := p_company::uuid;
  exception
    when others then
      return false;
  end;

  return public.demo_workspace_is_writable(v_company_id);
end;
$$;
drop policy if exists candidate_documents_company_select on storage.objects;
create policy candidate_documents_company_select
  on storage.objects for select
  using (
    bucket_id = 'candidate-documents'
    and (storage.foldername(name))[1] in (select public.current_company_ids_text())
  );
drop policy if exists candidate_documents_company_insert on storage.objects;
create policy candidate_documents_company_insert
  on storage.objects for insert
  with check (
    bucket_id = 'candidate-documents'
    and (storage.foldername(name))[1] in (select public.current_company_ids_text())
    and public.demo_folder_is_writable((storage.foldername(name))[1])
  );
drop policy if exists candidate_documents_company_update on storage.objects;
create policy candidate_documents_company_update
  on storage.objects for update
  using (
    bucket_id = 'candidate-documents'
    and (storage.foldername(name))[1] in (select public.current_company_ids_text())
    and public.demo_folder_is_writable((storage.foldername(name))[1])
  );
drop policy if exists candidate_documents_company_delete on storage.objects;
create policy candidate_documents_company_delete
  on storage.objects for delete
  using (
    bucket_id = 'candidate-documents'
    and (storage.foldername(name))[1] in (select public.current_company_ids_text())
    and public.demo_folder_is_writable((storage.foldername(name))[1])
  );
-- 3. One transaction per upload: candidate + application + document, or nothing.
-- The company is derived from the job and the signed-in user; the browser never
-- supplies a company id.
create or replace function public.record_candidate_upload(
  p_job_id uuid,
  p_candidate_name text,
  p_file_name text,
  p_file_type text,
  p_file_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_candidate_id uuid;
  v_application_id uuid := gen_random_uuid();
  v_document_id uuid := gen_random_uuid();
  v_storage_path text;
  v_max_candidates integer;
  v_used_candidates integer;
begin
  select company_id into v_company_id
  from public.job_roles
  where id = p_job_id
    and company_id in (select public.current_company_ids());
  if v_company_id is null then
    raise exception 'JOB_NOT_IN_WORKSPACE';
  end if;

  if not public.demo_workspace_is_writable(v_company_id) then
    raise exception 'PILOT_EXPIRED';
  end if;

  if p_file_type not in ('pdf', 'docx') then
    raise exception 'UNSUPPORTED_FILE_TYPE';
  end if;

  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 10485760 then
    raise exception 'FILE_TOO_LARGE';
  end if;

  -- Serialize quota checks per company so two concurrent uploads cannot both
  -- pass the count and overshoot the limit.
  perform pg_advisory_xact_lock(hashtext(v_company_id::text));

  select max_candidates into v_max_candidates
  from public.demo_entitlements
  where company_id = v_company_id;

  if v_max_candidates is not null then
    select count(*) into v_used_candidates
    from public.candidates
    where company_id = v_company_id;

    if v_used_candidates >= v_max_candidates then
      raise exception 'PILOT_CANDIDATE_LIMIT';
    end if;
  end if;

  select id into v_profile_id
  from public.recruiter_profiles
  where user_id = auth.uid()
    and company_id = v_company_id
    and status = 'active';

  insert into public.candidates (company_id, name, source)
  values (
    v_company_id,
    coalesce(nullif(trim(p_candidate_name), ''), 'Candidate pending name detection'),
    'bulk_upload'
  )
  returning id into v_candidate_id;

  insert into public.candidate_applications (id, company_id, job_id, candidate_id, status, consent_status)
  values (v_application_id, v_company_id, p_job_id, v_candidate_id, 'processing', 'recorded');

  v_storage_path :=
    v_company_id::text || '/' || p_job_id::text || '/' ||
    v_application_id::text || '/' || v_document_id::text || '.' || p_file_type;

  insert into public.uploaded_documents (
    id, company_id, application_id, candidate_id, uploaded_by_profile_id,
    file_name, storage_path, file_type, file_size_bytes, upload_status, parsing_status
  )
  values (
    v_document_id, v_company_id, v_application_id, v_candidate_id, v_profile_id,
    p_file_name, v_storage_path, p_file_type, p_file_size_bytes, 'accepted', 'queued'
  );

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action)
  values (v_company_id, v_profile_id, 'uploaded_document', v_document_id, 'candidate_upload_recorded');

  return jsonb_build_object(
    'company_id', v_company_id,
    'candidate_id', v_candidate_id,
    'application_id', v_application_id,
    'document_id', v_document_id,
    'storage_path', v_storage_path
  );
end;
$$;
-- 4. Persist the model's evidence output against the customer's own criteria.
create or replace function public.record_evidence_report(
  p_document_id uuid,
  p_status text,
  p_candidate_name text,
  p_evidence_summary jsonb,
  p_missing_evidence jsonb,
  p_verification_needed jsonb,
  p_suggested_questions jsonb,
  p_recruiter_notes jsonb,
  p_fairness_check jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.uploaded_documents;
  v_company_id uuid;
  v_job_id uuid;
  v_profile_id uuid;
  v_report_id uuid := gen_random_uuid();
  v_report_code text;
  v_item jsonb;
begin
  select * into v_document
  from public.uploaded_documents
  where id = p_document_id
    and company_id in (select public.current_company_ids());
  if v_document.id is null then
    raise exception 'DOCUMENT_NOT_IN_WORKSPACE';
  end if;

  v_company_id := v_document.company_id;

  if not public.demo_workspace_is_writable(v_company_id) then
    raise exception 'PILOT_EXPIRED';
  end if;

  select job_id into v_job_id
  from public.candidate_applications
  where id = v_document.application_id
    and company_id = v_company_id;

  select id into v_profile_id
  from public.recruiter_profiles
  where user_id = auth.uid()
    and company_id = v_company_id
    and status = 'active';

  v_report_code := 'HER-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(v_report_id::text, '-', ''), 1, 6));

  insert into public.evidence_reports (
    id, company_id, job_id, application_id, candidate_id, public_report_code, status,
    evidence_summary, missing_evidence, verification_needed,
    suggested_interview_questions, recruiter_notes, fairness_check
  )
  values (
    v_report_id, v_company_id, v_job_id, v_document.application_id, v_document.candidate_id,
    v_report_code, p_status,
    coalesce(p_evidence_summary, '[]'::jsonb),
    coalesce(p_missing_evidence, '[]'::jsonb),
    coalesce(p_verification_needed, '[]'::jsonb),
    coalesce(p_suggested_questions, '[]'::jsonb),
    coalesce(p_recruiter_notes, '[]'::jsonb),
    coalesce(p_fairness_check, '{}'::jsonb)
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.evidence_items (
      company_id, report_id, application_id, requirement_id, requirement,
      candidate_evidence, source, confidence, verification_needed, status_label, status_tone
    )
    values (
      v_company_id,
      v_report_id,
      v_document.application_id,
      -- Only accept a requirement id that belongs to this company's job.
      (select jr.id from public.job_requirements jr
        where jr.company_id = v_company_id
          and jr.job_id = v_job_id
          and jr.id::text = v_item ->> 'requirement_id'),
      coalesce(v_item ->> 'requirement', 'Job requirement'),
      coalesce(v_item ->> 'candidate_evidence', 'No clear evidence found'),
      coalesce(v_item ->> 'source', 'Resume'),
      coalesce(v_item ->> 'confidence', 'None'),
      coalesce(v_item ->> 'verification_needed', 'Verify in interview'),
      coalesce(v_item ->> 'status_label', 'Needs verification'),
      coalesce(v_item ->> 'status_tone', 'warning')
    );
  end loop;

  insert into public.parsed_cvs (company_id, document_id, application_id, status, extracted_name)
  values (v_company_id, p_document_id, v_document.application_id, 'parsed', nullif(trim(p_candidate_name), ''));

  update public.uploaded_documents
  set parsing_status = 'parsed', error_message = null, updated_at = now()
  where id = p_document_id;

  update public.candidate_applications
  set status = 'report_ready', updated_at = now()
  where id = v_document.application_id;

  if nullif(trim(p_candidate_name), '') is not null then
    update public.candidates
    set name = trim(p_candidate_name), updated_at = now()
    where id = v_document.candidate_id;
  end if;

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action)
  values (v_company_id, v_profile_id, 'evidence_report', v_report_id, 'evidence_report_generated');

  return jsonb_build_object('report_id', v_report_id, 'public_report_code', v_report_code);
end;
$$;
-- 5. Honest failure. A customer upload that cannot be analyzed is marked for
-- manual review; it never falls back to a scripted preview report.
create or replace function public.mark_candidate_upload_failed(
  p_document_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.uploaded_documents;
  v_profile_id uuid;
begin
  select * into v_document
  from public.uploaded_documents
  where id = p_document_id
    and company_id in (select public.current_company_ids());
  if v_document.id is null then
    raise exception 'DOCUMENT_NOT_IN_WORKSPACE';
  end if;

  select id into v_profile_id
  from public.recruiter_profiles
  where user_id = auth.uid()
    and company_id = v_document.company_id
    and status = 'active';

  update public.uploaded_documents
  set upload_status = 'manual_review_required',
      parsing_status = 'manual_review_required',
      error_message = left(coalesce(p_reason, 'Analysis could not be completed'), 300),
      updated_at = now()
  where id = p_document_id;

  update public.candidate_applications
  set status = 'needs_review', updated_at = now()
  where id = v_document.application_id;

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action)
  values (v_document.company_id, v_profile_id, 'uploaded_document', p_document_id, 'candidate_upload_failed');
end;
$$;
-- 6. Server-enforced job quota: the browser shows remaining jobs, Postgres decides.
create or replace function public.enforce_demo_job_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_jobs integer;
  v_used_jobs integer;
begin
  select max_jobs into v_max_jobs
  from public.demo_entitlements
  where company_id = new.company_id;

  if v_max_jobs is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.company_id::text));

  select count(*) into v_used_jobs
  from public.job_roles
  where company_id = new.company_id;

  if v_used_jobs >= v_max_jobs then
    raise exception 'PILOT_JOB_LIMIT';
  end if;

  return new;
end;
$$;
drop trigger if exists job_roles_demo_quota on public.job_roles;
create trigger job_roles_demo_quota
  before insert on public.job_roles
  for each row execute function public.enforce_demo_job_quota();
create or replace function public.enforce_demo_user_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_users integer;
  v_used_users integer;
begin
  select max_users into v_max_users
  from public.demo_entitlements
  where company_id = new.company_id;

  if v_max_users is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.company_id::text));

  select count(*) into v_used_users
  from public.recruiter_profiles
  where company_id = new.company_id
    and status <> 'disabled';

  if v_used_users >= v_max_users then
    raise exception 'PILOT_USER_LIMIT';
  end if;

  return new;
end;
$$;
drop trigger if exists recruiter_profiles_demo_quota on public.recruiter_profiles;
create trigger recruiter_profiles_demo_quota
  before insert on public.recruiter_profiles
  for each row execute function public.enforce_demo_user_quota();
