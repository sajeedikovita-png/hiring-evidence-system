-- Initial pilot and ongoing-access lifecycle. Existing 14-day demo rows retain
-- their dates and quotas; newly provisioned workspaces receive the 30-day pilot.

alter table public.demo_entitlements
  drop constraint if exists demo_entitlements_trial_days_check,
  drop constraint if exists demo_entitlements_view_only_days_check,
  drop constraint if exists demo_entitlements_check;
alter table public.demo_entitlements
  alter column trial_days set default 30,
  alter column max_jobs set default 1,
  alter column max_users set default 2,
  alter column max_candidates set default 50;
alter table public.demo_entitlements
  add constraint demo_entitlements_trial_days_check check (trial_days in (14, 30)),
  add constraint demo_entitlements_view_only_days_check check (view_only_days = 7),
  add constraint demo_entitlements_activation_window_check check (
    (activated_at is null and active_until is null and purge_at is null)
    or
    (activated_at is not null
      and active_until = activated_at + make_interval(days => trial_days)
      and purge_at = active_until + make_interval(days => view_only_days))
  );

create table if not exists public.ongoing_access_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  requested_by_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved_pending_start', 'active', 'expired', 'rejected')),
  terms_version text not null default 'ongoing-access-2026-09-09',
  ongoing_monthly_price_sgd integer not null default 1400 check (ongoing_monthly_price_sgd = 1400),
  terms_accepted_at timestamptz not null,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by_platform_user_id uuid references auth.users(id) on delete set null,
  payment_agreement_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and review_note is null and reviewed_at is null
      and reviewed_by_platform_user_id is null and payment_agreement_confirmed_at is null)
    or
    (status = 'rejected' and length(trim(coalesce(review_note, ''))) > 0
      and reviewed_at is not null and reviewed_by_platform_user_id is not null)
    or
    (status in ('approved_pending_start', 'active', 'expired') and length(trim(coalesce(review_note, ''))) > 0
      and reviewed_at is not null and reviewed_by_platform_user_id is not null
      and payment_agreement_confirmed_at is not null)
  )
);

create unique index if not exists ongoing_access_requests_one_open_company
  on public.ongoing_access_requests(company_id)
  where status in ('pending', 'approved_pending_start', 'active');
create index if not exists idx_ongoing_access_requests_status_created_at
  on public.ongoing_access_requests(status, created_at desc);

create table if not exists public.ongoing_access_terms (
  company_id uuid primary key references public.companies(id) on delete cascade,
  request_id uuid not null unique references public.ongoing_access_requests(id) on delete restrict,
  state text not null default 'approved_pending_start'
    check (state in ('approved_pending_start', 'active', 'expired')),
  duration_days integer not null default 30 check (duration_days = 30),
  max_job_roles integer not null default 10 check (max_job_roles = 10),
  max_candidate_documents integer not null default 500 check (max_candidate_documents = 500),
  max_users integer not null default 5 check (max_users = 5),
  activated_at timestamptz,
  active_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (state = 'approved_pending_start' and activated_at is null and active_until is null)
    or
    (state in ('active', 'expired') and activated_at is not null
      and active_until = activated_at + make_interval(days => duration_days))
  )
);

alter table public.ongoing_access_requests enable row level security;
alter table public.ongoing_access_terms enable row level security;
revoke all on public.ongoing_access_requests from public, anon, authenticated;
revoke all on public.ongoing_access_terms from public, anon, authenticated;

-- Keep the legacy trial duration data intact, but use its stored durations when
-- the existing customer deliberately starts its trial.
create or replace function public.activate_demo_trial(p_company_id uuid)
returns public.demo_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement public.demo_entitlements;
  v_profile_id uuid;
begin
  if not exists (
    select 1
    from public.current_company_ids() as workspace_company(id)
    where workspace_company.id = p_company_id
  ) then
    raise exception 'WORKSPACE_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  select * into entitlement
  from public.demo_entitlements
  where company_id = p_company_id
  for update;

  if entitlement.company_id is null then
    raise exception 'Demo entitlement not found';
  end if;

  if entitlement.state = 'pending_activation' then
    update public.demo_entitlements
    set state = 'active',
        activated_at = now(),
        active_until = now() + make_interval(days => entitlement.trial_days),
        purge_at = now() + make_interval(days => entitlement.trial_days + entitlement.view_only_days),
        updated_at = now()
    where company_id = p_company_id
    returning * into entitlement;
    select id into v_profile_id from public.recruiter_profiles
    where user_id = auth.uid() and company_id = p_company_id and status = 'active';
    insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
    values (p_company_id, v_profile_id, 'demo_entitlement', p_company_id, 'demo_trial_activated',
      jsonb_build_object('trial_days', entitlement.trial_days, 'active_until', entitlement.active_until));
  end if;

  return entitlement;
end;
$$;

-- An ongoing term supersedes pilot expiry only while it is active. An approved term
-- that has not been intentionally started still follows the existing demo rules.
create or replace function public.demo_workspace_is_writable(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.ongoing_access_terms p
      where p.company_id = p_company_id and p.state = 'active'
    ) then exists (
      select 1 from public.ongoing_access_terms p
      where p.company_id = p_company_id
        and p.state = 'active'
        and now() < p.active_until
    )
    else not exists (
      select 1 from public.demo_entitlements e
      where e.company_id = p_company_id
        and e.state <> 'converted'
        and (e.active_until is null or now() >= e.active_until)
    )
  end;
$$;

create or replace function public.pilot_job_role_limit(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max_job_roles from public.ongoing_access_terms
      where company_id = p_company_id and state = 'active'),
    (select max_jobs from public.demo_entitlements where company_id = p_company_id)
  );
$$;

create or replace function public.pilot_candidate_document_limit(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max_candidate_documents from public.ongoing_access_terms
      where company_id = p_company_id and state = 'active'),
    (select max_candidates from public.demo_entitlements where company_id = p_company_id)
  );
$$;

create or replace function public.pilot_user_limit(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max_users from public.ongoing_access_terms
      where company_id = p_company_id and state = 'active'),
    (select max_users from public.demo_entitlements where company_id = p_company_id)
  );
$$;

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
  v_max_jobs := public.pilot_job_role_limit(new.company_id);
  if v_max_jobs is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.company_id::text));
  select count(*) into v_used_jobs from public.job_roles where company_id = new.company_id;
  if v_used_jobs >= v_max_jobs then raise exception 'PILOT_JOB_LIMIT'; end if;
  return new;
end;
$$;

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
  v_max_users := public.pilot_user_limit(new.company_id);
  if v_max_users is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.company_id::text));
  select count(*) into v_used_users
  from public.recruiter_profiles
  where company_id = new.company_id and status <> 'disabled';
  if v_used_users >= v_max_users then raise exception 'PILOT_USER_LIMIT'; end if;
  return new;
end;
$$;

create or replace function public.enforce_pilot_candidate_document_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
  v_period_started_at timestamptz;
begin
  v_limit := public.pilot_candidate_document_limit(new.company_id);
  if v_limit is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.company_id::text));
  select activated_at into v_period_started_at from public.ongoing_access_terms
  where company_id = new.company_id and state = 'active';
  select count(*) into v_used from public.uploaded_documents
  where company_id = new.company_id
    and (v_period_started_at is null or created_at >= v_period_started_at);
  if v_used >= v_limit then raise exception 'PILOT_CANDIDATE_DOCUMENT_LIMIT'; end if;
  return new;
end;
$$;

drop trigger if exists uploaded_documents_pilot_document_quota on public.uploaded_documents;
create trigger uploaded_documents_pilot_document_quota
  before insert on public.uploaded_documents
  for each row execute function public.enforce_pilot_candidate_document_quota();

-- The deployed upload RPC also performs a quota check before creating rows.
-- Use the effective term limit there as well; the trigger above remains the
-- final document-count boundary for every write path.
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
  v_limit integer;
  v_used_candidates integer;
  v_consent_at timestamptz := now();
  v_period_started_at timestamptz;
begin
  if p_consent_confirmed is not true then raise exception 'UPLOAD_ATTESTATION_REQUIRED'; end if;
  select company_id into v_company_id from public.job_roles
  where id = p_job_id and company_id in (select public.current_company_ids());
  if v_company_id is null then raise exception 'JOB_NOT_IN_WORKSPACE'; end if;
  if not public.demo_workspace_is_writable(v_company_id) then raise exception 'PILOT_EXPIRED'; end if;
  if p_file_type not in ('pdf', 'docx') then raise exception 'UNSUPPORTED_FILE_TYPE'; end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 10485760 then raise exception 'FILE_TOO_LARGE'; end if;

  perform pg_advisory_xact_lock(hashtext(v_company_id::text));
  v_limit := public.pilot_candidate_document_limit(v_company_id);
  if v_limit is not null then
    select activated_at into v_period_started_at from public.ongoing_access_terms
    where company_id = v_company_id and state = 'active';
    select count(*) into v_used_candidates from public.candidates
    where company_id = v_company_id
      and (v_period_started_at is null or created_at >= v_period_started_at);
    if v_used_candidates >= v_limit then raise exception 'PILOT_CANDIDATE_LIMIT'; end if;
  end if;

  select id into v_profile_id from public.recruiter_profiles
  where user_id = auth.uid() and company_id = v_company_id and status = 'active';
  insert into public.candidates (company_id, name, source)
  values (v_company_id, coalesce(nullif(trim(p_candidate_name), ''), 'Candidate pending name detection'), 'bulk_upload')
  returning id into v_candidate_id;
  insert into public.candidate_applications (id, company_id, job_id, candidate_id, status, consent_status, consent_recorded_at)
  values (v_application_id, v_company_id, p_job_id, v_candidate_id, 'processing', 'missing', null);
  v_storage_path := v_company_id::text || '/' || p_job_id::text || '/' || v_application_id::text || '/' || v_document_id::text || '.' || p_file_type;
  insert into public.uploaded_documents (
    id, company_id, application_id, candidate_id, uploaded_by_profile_id,
    file_name, storage_path, file_type, file_size_bytes, upload_status, parsing_status
  ) values (
    v_document_id, v_company_id, v_application_id, v_candidate_id, v_profile_id,
    p_file_name, v_storage_path, p_file_type, p_file_size_bytes, 'accepted', 'queued'
  );
  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_company_id, v_profile_id, 'uploaded_document', v_document_id, 'candidate_upload_recorded',
    jsonb_build_object('uploader_attested', true, 'application_id', v_application_id, 'file_type', p_file_type));
  return jsonb_build_object(
    'company_id', v_company_id, 'candidate_id', v_candidate_id, 'application_id', v_application_id,
    'document_id', v_document_id, 'storage_path', v_storage_path, 'consent_recorded_at', v_consent_at
  );
end;
$$;

create or replace function public.current_pilot_lifecycle_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_company_count integer;
  v_lifecycle public.ongoing_access_terms;
  v_demo public.demo_entitlements;
  v_request public.ongoing_access_requests;
  v_state text;
  v_is_writable boolean;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_roles integer;
  v_documents integer;
  v_users integer;
  v_period_started_at timestamptz;
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then raise exception 'PILOT_WORKSPACE_REQUIRED' using errcode = '42501'; end if;
  select workspace.company_id into v_company_id
  from public.current_company_ids() as workspace(company_id);

  select * into v_lifecycle from public.ongoing_access_terms where company_id = v_company_id;
  select * into v_demo from public.demo_entitlements where company_id = v_company_id;
  select * into v_request from public.ongoing_access_requests
  where company_id = v_company_id order by created_at desc limit 1;

  if v_lifecycle.company_id is not null then
    v_state := case when v_lifecycle.state = 'active' and now() >= v_lifecycle.active_until then 'expired' else v_lifecycle.state end;
    v_starts_at := v_lifecycle.activated_at;
    v_ends_at := v_lifecycle.active_until;
  elsif v_demo.company_id is not null then
    v_state := case when v_demo.state = 'active' and now() >= v_demo.active_until then 'expired' else v_demo.state end;
    v_starts_at := v_demo.activated_at;
    v_ends_at := v_demo.active_until;
  else
    v_state := 'pending_activation';
  end if;

  v_is_writable := public.demo_workspace_is_writable(v_company_id);
  v_period_started_at := case when v_lifecycle.state = 'active' then v_lifecycle.activated_at else null end;
  select count(*) into v_roles from public.job_roles where company_id = v_company_id;
  select count(*) into v_documents from public.uploaded_documents
  where company_id = v_company_id and (v_period_started_at is null or created_at >= v_period_started_at);
  select count(*) into v_users from public.recruiter_profiles
  where company_id = v_company_id and status <> 'disabled';

  return jsonb_build_object(
    'companyId', v_company_id,
    'plan', case when v_lifecycle.company_id is null then 'pilot' else 'ongoing' end,
    'state', v_state,
    'startsAt', v_starts_at,
    'endsAt', v_ends_at,
    'remainingDays', case when v_ends_at is null then null else greatest(0, ceil(extract(epoch from (v_ends_at - now())) / 86400.0)::integer) end,
    'canStart', coalesce(v_lifecycle.state = 'approved_pending_start', false)
      or (v_lifecycle.company_id is null and coalesce(v_demo.state = 'pending_activation', false)),
    'isWritable', v_is_writable,
    'pricing', jsonb_build_object('initialPilotSgd', 500, 'ongoingMonthlySgd', 1400),
    'limits', jsonb_build_object(
      'roles', public.pilot_job_role_limit(v_company_id),
      'candidateDocuments', public.pilot_candidate_document_limit(v_company_id),
      'users', public.pilot_user_limit(v_company_id)
    ),
    'usage', jsonb_build_object('roles', v_roles, 'candidateDocuments', v_documents, 'users', v_users),
    'paidRequest', case when v_request.id is null then null else jsonb_build_object(
      'id', v_request.id, 'status', v_request.status, 'requestedAt', v_request.created_at,
      'termsAcceptedAt', v_request.terms_accepted_at, 'reviewNote', v_request.review_note
    ) end
  );
end;
$$;

create or replace function public.create_ongoing_access_request(p_terms_accepted boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.recruiter_profiles;
  v_request public.ongoing_access_requests;
  v_term public.ongoing_access_terms;
  v_demo public.demo_entitlements;
  v_admin_count integer;
begin
  if p_terms_accepted is not true then raise exception 'PILOT_TERMS_REQUIRED' using errcode = '23514'; end if;
  select count(*) into v_admin_count
  from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';
  if v_admin_count <> 1 then raise exception 'PILOT_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select r.* into v_profile from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';
  select * into v_demo from public.demo_entitlements where company_id = v_profile.company_id;
  if v_demo.company_id is null or v_demo.activated_at is null then
    raise exception 'ONGOING_ACCESS_REQUIRES_INITIAL_PILOT' using errcode = '23514';
  end if;

  select * into v_term from public.ongoing_access_terms
  where company_id = v_profile.company_id for update;
  if v_term.company_id is not null and v_term.state = 'active' and now() >= v_term.active_until then
    update public.ongoing_access_terms set state = 'expired', updated_at = now()
    where company_id = v_profile.company_id;
    update public.ongoing_access_requests set status = 'expired', updated_at = now()
    where id = v_term.request_id;
  end if;

  select * into v_request from public.ongoing_access_requests
  where company_id = v_profile.company_id and status in ('pending', 'approved_pending_start', 'active')
  for update;
  if v_request.id is not null then raise exception 'ONGOING_ACCESS_REQUEST_EXISTS' using errcode = '23505'; end if;

  insert into public.ongoing_access_requests (
    company_id, requested_by_user_id, requested_by_profile_id, terms_accepted_at
  ) values (v_profile.company_id, auth.uid(), v_profile.id, now()) returning * into v_request;

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_profile.company_id, v_profile.id, 'ongoing_access_request', v_request.id, 'ongoing_access_requested',
    jsonb_build_object('terms_version', v_request.terms_version, 'ongoing_monthly_price_sgd', 1400));
  return jsonb_build_object('id', v_request.id, 'status', v_request.status, 'termsAcceptedAt', v_request.terms_accepted_at);
end;
$$;

create or replace function public.start_ongoing_access_term()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.recruiter_profiles;
  v_lifecycle public.ongoing_access_terms;
  v_admin_count integer;
begin
  select count(*) into v_admin_count
  from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';
  if v_admin_count <> 1 then raise exception 'PILOT_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select r.* into v_profile from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';

  select * into v_lifecycle from public.ongoing_access_terms
  where company_id = v_profile.company_id for update;
  if v_lifecycle.company_id is null or v_lifecycle.state <> 'approved_pending_start' then
    raise exception 'PILOT_NOT_APPROVED' using errcode = '23514';
  end if;

  update public.ongoing_access_terms
  set state = 'active', activated_at = now(), active_until = now() + make_interval(days => v_lifecycle.duration_days), updated_at = now()
  where company_id = v_profile.company_id returning * into v_lifecycle;
  update public.ongoing_access_requests set status = 'active', updated_at = now() where id = v_lifecycle.request_id;
  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_profile.company_id, v_profile.id, 'ongoing_access_term', v_lifecycle.request_id, 'ongoing_access_started',
    jsonb_build_object('duration_days', v_lifecycle.duration_days, 'active_until', v_lifecycle.active_until));
  return public.current_pilot_lifecycle_status();
end;
$$;

-- The same customer action starts whichever approved term is current. Initial
-- pilots use the entitlement's stored duration; ongoing access needs the prior
-- platform review and payment/agreement confirmation.
create or replace function public.start_current_pilot_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_count integer;
  v_ongoing public.ongoing_access_terms;
  v_demo public.demo_entitlements;
begin
  select count(*) into v_count from public.current_company_ids();
  if v_count <> 1 then raise exception 'PILOT_WORKSPACE_REQUIRED' using errcode = '42501'; end if;
  select workspace.company_id into v_company_id from public.current_company_ids() as workspace(company_id);
  select * into v_ongoing from public.ongoing_access_terms where company_id = v_company_id;
  if v_ongoing.company_id is not null then
    if v_ongoing.state <> 'approved_pending_start' then raise exception 'PILOT_NOT_APPROVED' using errcode = '23514'; end if;
    return public.start_ongoing_access_term();
  end if;
  select * into v_demo from public.demo_entitlements where company_id = v_company_id;
  if v_demo.company_id is null or v_demo.state <> 'pending_activation' then
    raise exception 'PILOT_NOT_READY_TO_START' using errcode = '23514';
  end if;
  perform public.activate_demo_trial(v_company_id);
  return public.current_pilot_lifecycle_status();
end;
$$;

create or replace function public.demo_workspaces_due_for_purge()
returns table (company_id uuid, company_name text, purge_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.company_id, c.name, e.purge_at
  from public.demo_entitlements e
  join public.companies c on c.id = e.company_id
  where e.state <> 'converted'
    and e.purge_at is not null
    and e.purge_at <= now()
    and not exists (select 1 from public.ongoing_access_terms o where o.company_id = e.company_id)
  order by e.purge_at;
$$;

create or replace function public.purge_demo_workspace(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement public.demo_entitlements;
  v_company_name text;
begin
  select * into entitlement from public.demo_entitlements where company_id = p_company_id for update;
  if entitlement.company_id is null then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'no entitlement');
  end if;
  if exists (select 1 from public.ongoing_access_terms o where o.company_id = p_company_id) then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'ongoing access retention');
  end if;
  if entitlement.state = 'converted' then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'converted');
  end if;
  if entitlement.purge_at is null or entitlement.purge_at > now() then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'not due');
  end if;
  select name into v_company_name from public.companies where id = p_company_id;
  insert into public.demo_workspace_closures (company_id, company_name, activated_at, active_until, closed_at, outcome)
  values (p_company_id, coalesce(v_company_name, 'Unknown company'), entitlement.activated_at, entitlement.active_until, now(), 'purged')
  on conflict (company_id) do update set outcome = 'purged', closed_at = now();
  delete from public.companies where id = p_company_id;
  return jsonb_build_object('company_id', p_company_id, 'purged', true);
end;
$$;

create or replace function public.platform_ongoing_access_requests()
returns table (
  id uuid, company_id uuid, company_name text, requester_email text, requester_name text,
  status text, requested_at timestamptz, terms_accepted_at timestamptz, review_note text,
  reviewed_at timestamptz, reviewed_by_platform_user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.company_id, c.name, p.email, p.display_name, r.status, r.created_at,
    r.terms_accepted_at, r.review_note, r.reviewed_at, r.reviewed_by_platform_user_id
  from public.ongoing_access_requests r
  join public.companies c on c.id = r.company_id
  join public.recruiter_profiles p on p.id = r.requested_by_profile_id
  where public.is_current_user_admin()
  order by r.created_at desc;
$$;

create or replace function public.review_ongoing_access_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text,
  p_payment_agreement_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ongoing_access_requests;
  v_lifecycle public.ongoing_access_terms;
  v_note text := trim(coalesce(p_review_note, ''));
begin
  if not public.is_current_user_admin() then raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then raise exception 'PILOT_REVIEW_DECISION_INVALID' using errcode = '23514'; end if;
  if v_note = '' then raise exception 'PILOT_REVIEW_NOTE_REQUIRED' using errcode = '23514'; end if;
  if p_decision = 'approve' and p_payment_agreement_confirmed is not true then
    raise exception 'PAYMENT_AGREEMENT_CONFIRMATION_REQUIRED' using errcode = '23514';
  end if;

  select * into v_request from public.ongoing_access_requests where id = p_request_id for update;
  if v_request.id is null or v_request.status <> 'pending' then raise exception 'ONGOING_ACCESS_REQUEST_NOT_PENDING' using errcode = '23514'; end if;

  if p_decision = 'reject' then
    update public.ongoing_access_requests
    set status = 'rejected', review_note = v_note, reviewed_at = now(),
      reviewed_by_platform_user_id = auth.uid(), updated_at = now()
    where id = v_request.id returning * into v_request;
    insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
    values (v_request.company_id, null, 'ongoing_access_request', v_request.id, 'ongoing_access_rejected',
      jsonb_build_object('platform_administrator_user_id', auth.uid(), 'review_note', v_note));
    return jsonb_build_object('id', v_request.id, 'status', v_request.status);
  end if;

  update public.ongoing_access_requests
  set status = 'approved_pending_start', review_note = v_note, reviewed_at = now(),
    reviewed_by_platform_user_id = auth.uid(), payment_agreement_confirmed_at = now(), updated_at = now()
  where id = v_request.id returning * into v_request;
  insert into public.ongoing_access_terms (company_id, request_id)
  values (v_request.company_id, v_request.id)
  on conflict (company_id) do update set request_id = excluded.request_id, state = 'approved_pending_start',
    activated_at = null, active_until = null, updated_at = now()
  returning * into v_lifecycle;
  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_request.company_id, null, 'ongoing_access_request', v_request.id, 'ongoing_access_approved',
    jsonb_build_object('platform_administrator_user_id', auth.uid(), 'review_note', v_note,
      'payment_agreement_confirmed', true, 'ongoing_monthly_price_sgd', 1400));
  return jsonb_build_object('id', v_request.id, 'status', v_request.status);
end;
$$;

-- Preserve all historical action values while adding the paid pilot lifecycle.
alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (
  action in (
    'dashboard_viewed', 'job_role_read', 'candidate_read', 'evidence_report_read',
    'human_review_decision_saved', 'upload_validated', 'document_uploaded',
    'candidate_upload_recorded', 'candidate_upload_failed',
    'evidence_report_generated', 'demo_trial_activated', 'demo_workspace_converted',
    'job_role_created', 'access_request_approved', 'access_request_rejected',
    'ongoing_access_requested', 'ongoing_access_approved', 'ongoing_access_started', 'ongoing_access_rejected'
  )
);

revoke all on function public.current_pilot_lifecycle_status() from public, anon;
revoke all on function public.create_ongoing_access_request(boolean) from public, anon;
revoke all on function public.start_ongoing_access_term() from public, anon;
revoke all on function public.start_current_pilot_lifecycle() from public, anon;
revoke all on function public.platform_ongoing_access_requests() from public, anon;
revoke all on function public.review_ongoing_access_request(uuid, text, text, boolean) from public, anon;
grant execute on function public.current_pilot_lifecycle_status() to authenticated;
grant execute on function public.create_ongoing_access_request(boolean) to authenticated;
grant execute on function public.start_ongoing_access_term() to authenticated;
grant execute on function public.start_current_pilot_lifecycle() to authenticated;
grant execute on function public.platform_ongoing_access_requests() to authenticated;
grant execute on function public.review_ongoing_access_request(uuid, text, text, boolean) to authenticated;
;
