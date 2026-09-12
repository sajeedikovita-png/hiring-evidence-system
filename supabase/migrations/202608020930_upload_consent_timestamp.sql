-- Record WHEN lawful basis was confirmed for each uploaded CV, not just that it was.
--
-- `docs/SECURITY_PRIVACY_RULES.md` requires: "Consent must be stored with timestamp."
-- The upload path set `consent_status = 'recorded'` with no time attached, so the
-- record could not answer "confirmed when?" — which is the question that matters if a
-- candidate or a regulator ever asks.
--
-- IMPORTANT SCOPE NOTE — do not let this be described as more than it is:
-- this records the *recruiter's attestation* that they have lawful authority to upload
-- and process this CV. It is NOT the candidate's own consent, which would have to be
-- captured in a candidate-facing application flow that does not exist yet. Wording in
-- the product must keep that distinction honest.

alter table public.candidate_applications
  add column if not exists consent_recorded_at timestamptz;
-- Seeded and pre-existing rows predate the column, so the constraint is added NOT
-- VALID: it binds every new and updated row without failing the migration on history.
alter table public.candidate_applications
  drop constraint if exists candidate_applications_consent_timestamped;
alter table public.candidate_applications
  add constraint candidate_applications_consent_timestamped
  check (consent_status <> 'recorded' or consent_recorded_at is not null) not valid;
-- The signature gains a parameter, so this must DROP rather than CREATE OR REPLACE.
-- Replacing with a different argument list would leave the old consent-free function
-- in place as an overload and still callable — the exact bypass this is meant to close.
drop function if exists public.record_candidate_upload(uuid, text, text, text, bigint);
create or replace function public.record_candidate_upload(
  p_job_id uuid,
  p_candidate_name text,
  p_file_name text,
  p_file_type text,
  p_file_size_bytes bigint,
  p_consent_confirmed boolean
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
  v_consent_at timestamptz := now();
begin
  -- Refused before anything is created, so a refusal leaves no partial record.
  if p_consent_confirmed is not true then
    raise exception 'CONSENT_REQUIRED';
  end if;

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

  insert into public.candidate_applications (
    id, company_id, job_id, candidate_id, status, consent_status, consent_recorded_at
  )
  values (
    v_application_id, v_company_id, p_job_id, v_candidate_id, 'processing', 'recorded', v_consent_at
  );

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

  -- The audit row carries the confirmation time too, so the evidence of consent does
  -- not depend on the application row surviving.
  insert into public.audit_log_entries (
    company_id, actor_profile_id, entity_type, entity_id, action, metadata
  )
  values (
    v_company_id, v_profile_id, 'uploaded_document', v_document_id, 'candidate_upload_recorded',
    jsonb_build_object(
      'consent_recorded_at', v_consent_at,
      'application_id', v_application_id,
      'file_type', p_file_type
    )
  );

  return jsonb_build_object(
    'company_id', v_company_id,
    'candidate_id', v_candidate_id,
    'application_id', v_application_id,
    'document_id', v_document_id,
    'storage_path', v_storage_path,
    'consent_recorded_at', v_consent_at
  );
end;
$$;
-- A new signature carries no grants from the old one, and Postgres would otherwise
-- default it to PUBLIC — undoing 202608020900 for this function.
revoke execute on function public.record_candidate_upload(uuid, text, text, text, bigint, boolean)
  from public, anon;
grant execute on function public.record_candidate_upload(uuid, text, text, text, bigint, boolean)
  to authenticated;
