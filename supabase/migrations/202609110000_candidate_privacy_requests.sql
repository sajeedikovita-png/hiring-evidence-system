-- Candidate privacy requests are deliberately a reviewed workflow. Recording a
-- request never discloses, corrects, withdraws, or deletes candidate data by
-- itself: those actions need an identity-verification and retention decision.

create table if not exists public.candidate_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  request_type text not null check (request_type in ('access', 'correction', 'deletion', 'withdrawal')),
  requester_email text not null check (requester_email = lower(trim(requester_email))),
  request_details text not null default '' check (length(request_details) <= 2000),
  status text not null default 'identity_verification_required'
    check (status in ('identity_verification_required', 'in_review', 'resolved', 'declined')),
  submitted_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  identity_verified_at timestamptz,
  identity_verified_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'identity_verification_required'
      and identity_verified_at is null and identity_verified_by_profile_id is null
      and resolved_at is null and resolved_by_profile_id is null and resolution_note is null)
    or
    (status = 'in_review'
      and identity_verified_at is not null and identity_verified_by_profile_id is not null
      and resolved_at is null and resolved_by_profile_id is null and resolution_note is null)
    or
    (status in ('resolved', 'declined')
      and resolved_at is not null and resolved_by_profile_id is not null
      and length(trim(coalesce(resolution_note, ''))) > 0)
  )
);
create index if not exists idx_candidate_privacy_requests_company_status_created
  on public.candidate_privacy_requests (company_id, status, created_at desc);
create unique index if not exists candidate_privacy_requests_one_open_request
  on public.candidate_privacy_requests (candidate_id, request_type)
  where status in ('identity_verification_required', 'in_review');
alter table public.candidate_privacy_requests enable row level security;
revoke all on public.candidate_privacy_requests from public, anon, authenticated;
grant select on public.candidate_privacy_requests to authenticated;
create policy candidate_privacy_requests_company_admin_select
  on public.candidate_privacy_requests
  for select
  to authenticated
  using (
    company_id in (select public.current_company_ids())
    and exists (
      select 1
      from public.recruiter_profiles p
      where p.company_id = candidate_privacy_requests.company_id
        and p.user_id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  );
create or replace function public.create_candidate_privacy_request(
  p_candidate_id uuid,
  p_request_type text,
  p_requester_email text,
  p_request_details text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_count integer;
  v_profile public.recruiter_profiles;
  v_candidate public.candidates;
  v_request public.candidate_privacy_requests;
  v_request_type text := lower(trim(coalesce(p_request_type, '')));
  v_requester_email text := lower(trim(coalesce(p_requester_email, '')));
  v_request_details text := trim(coalesce(p_request_details, ''));
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then
    raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode = '42501';
  end if;

  select p.* into v_profile
  from public.recruiter_profiles p
  where p.user_id = auth.uid()
    and p.company_id in (select public.current_company_ids())
    and p.status = 'active'
    and p.role in ('admin', 'recruiter', 'hiring_manager');

  if v_profile.id is null then
    raise exception 'WORKSPACE_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  if p_candidate_id is null
    or v_request_type not in ('access', 'correction', 'deletion', 'withdrawal')
    or v_requester_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(v_request_details) > 2000 then
    raise exception 'CANDIDATE_PRIVACY_REQUEST_INPUT_INVALID' using errcode = '22023';
  end if;

  select * into v_candidate
  from public.candidates
  where id = p_candidate_id and company_id = v_profile.company_id
  for update;

  if v_candidate.id is null then
    raise exception 'CANDIDATE_NOT_IN_WORKSPACE' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.candidate_privacy_requests r
    where r.candidate_id = p_candidate_id
      and r.request_type = v_request_type
      and r.status in ('identity_verification_required', 'in_review')
  ) then
    raise exception 'CANDIDATE_PRIVACY_REQUEST_ALREADY_OPEN' using errcode = '23505';
  end if;

  insert into public.candidate_privacy_requests (
    company_id, candidate_id, request_type, requester_email, request_details,
    submitted_by_profile_id
  ) values (
    v_profile.company_id, p_candidate_id, v_request_type, v_requester_email,
    v_request_details, v_profile.id
  ) returning * into v_request;

  insert into public.audit_log_entries (
    company_id, actor_profile_id, entity_type, entity_id, action, metadata
  ) values (
    v_profile.company_id, v_profile.id, 'candidate_privacy_request', v_request.id,
    'candidate_privacy_request_submitted',
    jsonb_build_object('candidate_id', p_candidate_id, 'request_type', v_request_type)
  );

  return jsonb_build_object(
    'id', v_request.id,
    'candidate_id', v_request.candidate_id,
    'request_type', v_request.request_type,
    'status', v_request.status,
    'created_at', v_request.created_at
  );
end;
$$;
create or replace function public.review_candidate_privacy_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text,
  p_identity_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_count integer;
  v_profile public.recruiter_profiles;
  v_request public.candidate_privacy_requests;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_note text := trim(coalesce(p_review_note, ''));
  v_action text;
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then
    raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode = '42501';
  end if;

  select p.* into v_profile
  from public.recruiter_profiles p
  where p.user_id = auth.uid()
    and p.company_id in (select public.current_company_ids())
    and p.status = 'active'
    and p.role = 'admin';

  if v_profile.id is null then
    raise exception 'PRIVACY_REQUEST_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_request_id is null or v_decision not in ('verify_identity', 'resolve', 'decline')
    or nullif(v_note, '') is null or length(v_note) > 2000 then
    raise exception 'CANDIDATE_PRIVACY_REVIEW_INPUT_INVALID' using errcode = '22023';
  end if;

  select * into v_request
  from public.candidate_privacy_requests
  where id = p_request_id and company_id = v_profile.company_id
  for update;

  if v_request.id is null then
    raise exception 'CANDIDATE_PRIVACY_REQUEST_NOT_IN_WORKSPACE' using errcode = '23514';
  end if;

  if v_decision = 'verify_identity' then
    if v_request.status <> 'identity_verification_required' or p_identity_verified is not true then
      raise exception 'CANDIDATE_PRIVACY_IDENTITY_VERIFICATION_REQUIRED' using errcode = '23514';
    end if;

    update public.candidate_privacy_requests
    set status = 'in_review', identity_verified_at = now(),
        identity_verified_by_profile_id = v_profile.id, updated_at = now()
    where id = v_request.id
    returning * into v_request;
    v_action := 'candidate_privacy_request_identity_verified';
  elsif v_decision = 'resolve' then
    if v_request.status <> 'in_review' then
      raise exception 'CANDIDATE_PRIVACY_REQUEST_REVIEW_REQUIRED' using errcode = '23514';
    end if;

    -- This records a human-confirmed outcome. It intentionally does not mutate
    -- candidate data, documents, consent, or reports without a defined policy.
    update public.candidate_privacy_requests
    set status = 'resolved', resolved_at = now(), resolved_by_profile_id = v_profile.id,
        resolution_note = v_note, updated_at = now()
    where id = v_request.id
    returning * into v_request;
    v_action := 'candidate_privacy_request_resolved';
  else
    if v_request.status not in ('identity_verification_required', 'in_review') then
      raise exception 'CANDIDATE_PRIVACY_REQUEST_NOT_REVIEWABLE' using errcode = '23514';
    end if;

    update public.candidate_privacy_requests
    set status = 'declined', resolved_at = now(), resolved_by_profile_id = v_profile.id,
        resolution_note = v_note, updated_at = now()
    where id = v_request.id
    returning * into v_request;
    v_action := 'candidate_privacy_request_declined';
  end if;

  insert into public.audit_log_entries (
    company_id, actor_profile_id, entity_type, entity_id, action, metadata
  ) values (
    v_profile.company_id, v_profile.id, 'candidate_privacy_request', v_request.id,
    v_action,
    jsonb_build_object(
      'candidate_id', v_request.candidate_id,
      'request_type', v_request.request_type,
      'decision', v_decision,
      'identity_verified', v_request.identity_verified_at is not null
    )
  );

  return jsonb_build_object(
    'id', v_request.id,
    'candidate_id', v_request.candidate_id,
    'request_type', v_request.request_type,
    'status', v_request.status,
    'reviewed_at', coalesce(v_request.resolved_at, v_request.identity_verified_at)
  );
end;
$$;
create or replace function public.list_candidate_privacy_requests()
returns table (
  id uuid,
  candidate_id uuid,
  candidate_name text,
  request_type text,
  requester_email text,
  request_details text,
  status text,
  created_at timestamptz,
  identity_verified_at timestamptz,
  resolved_at timestamptz,
  resolution_note text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_count integer;
  v_company_id uuid;
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then
    raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode = '42501';
  end if;

  select p.company_id into v_company_id
  from public.recruiter_profiles p
  where p.user_id = auth.uid()
    and p.company_id in (select public.current_company_ids())
    and p.status = 'active'
    and p.role = 'admin';

  if v_company_id is null then
    raise exception 'PRIVACY_REQUEST_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select r.id, r.candidate_id, c.name, r.request_type, r.requester_email,
    r.request_details, r.status, r.created_at, r.identity_verified_at,
    r.resolved_at, r.resolution_note
  from public.candidate_privacy_requests r
  join public.candidates c on c.id = r.candidate_id and c.company_id = r.company_id
  where r.company_id = v_company_id
  order by r.created_at desc, r.id;
end;
$$;
alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (action in (
  'dashboard_viewed','job_role_read','candidate_read','evidence_report_read','human_review_decision_saved',
  'upload_validated','document_uploaded','candidate_upload_recorded','candidate_upload_failed',
  'evidence_report_generated','demo_trial_activated','demo_workspace_converted','job_role_created',
  'access_request_approved','access_request_rejected',
  'ongoing_access_requested','ongoing_access_approved','ongoing_access_started','ongoing_access_rejected',
  'evidence_report_analysis_failed','special_company_access_granted','special_company_access_transferred',
  'candidate_privacy_request_submitted','candidate_privacy_request_identity_verified',
  'candidate_privacy_request_resolved','candidate_privacy_request_declined'
));
revoke all on function public.create_candidate_privacy_request(uuid, text, text, text) from public, anon;
revoke all on function public.review_candidate_privacy_request(uuid, text, text, boolean) from public, anon;
revoke all on function public.list_candidate_privacy_requests() from public, anon;
grant execute on function public.create_candidate_privacy_request(uuid, text, text, text) to authenticated;
grant execute on function public.review_candidate_privacy_request(uuid, text, text, boolean) to authenticated;
grant execute on function public.list_candidate_privacy_requests() to authenticated;
