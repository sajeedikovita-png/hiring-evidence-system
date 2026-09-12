-- One user has one active company by default. Platform administrators may add
-- or transfer access only through a reason-required, audited service boundary.

-- Close pending requests that already have active access. This also resolves
-- the two legacy requests observed for the newly approved pilot owner.
insert into public.audit_log_entries (
  company_id, actor_profile_id, entity_type, entity_id, action, metadata
)
select
  p.company_id,
  null,
  'access_request',
  r.id,
  'access_request_rejected',
  jsonb_build_object(
    'reason', 'Active company access already exists for this email',
    'closed_by', '202609100000_company_access_policy'
  )
from public.access_requests r
join public.recruiter_profiles p
  on lower(trim(p.email)) = lower(trim(r.work_email))
 and p.status = 'active'
join public.companies c on c.id = p.company_id and c.status = 'active'
where r.status = 'pending'
  and not exists (
    select 1 from public.audit_log_entries a
    where a.company_id = p.company_id
      and a.entity_type = 'access_request'
      and a.entity_id = r.id
      and a.action = 'access_request_rejected'
      and a.metadata->>'closed_by' = '202609100000_company_access_policy'
  );

update public.access_requests r
set status = 'rejected',
    reviewed_at = now(),
    review_note = 'Automatically closed: active company access already exists for this email.',
    updated_at = now()
where r.status = 'pending'
  and exists (
    select 1
    from public.recruiter_profiles p
    join public.companies c on c.id = p.company_id
    where lower(trim(p.email)) = lower(trim(r.work_email))
      and p.status = 'active'
      and c.status = 'active'
  );

-- For any other historical collision, retain the earliest pending request and
-- close later copies before adding the database uniqueness guarantee.
with ranked as (
  select id, row_number() over (
    partition by lower(trim(work_email))
    order by requested_at, id
  ) as position
  from public.access_requests
  where status = 'pending'
)
update public.access_requests r
set status = 'rejected',
    reviewed_at = now(),
    review_note = 'Automatically closed: duplicate pending request; the earlier request remains under review.',
    updated_at = now()
from ranked
where ranked.id = r.id and ranked.position > 1;

create unique index if not exists access_requests_one_pending_email
  on public.access_requests (lower(trim(work_email)))
  where status = 'pending';

create unique index if not exists recruiter_profiles_one_active_company_per_user
  on public.recruiter_profiles (user_id)
  where status = 'active';

create or replace function public.submit_access_request_guarded(
  p_company_name text,
  p_work_email text,
  p_requester_role text,
  p_hiring_volume text,
  p_first_role_to_review text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_work_email, '')));
  v_request_id uuid;
begin
  if nullif(trim(coalesce(p_company_name, '')), '') is null
    or nullif(v_email, '') is null
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(trim(coalesce(p_requester_role, '')), '') is null
    or nullif(trim(coalesce(p_hiring_volume, '')), '') is null
    or nullif(trim(coalesce(p_first_role_to_review, '')), '') is null then
    raise exception 'ACCESS_REQUEST_INPUT_INVALID' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  if exists (
    select 1 from public.recruiter_profiles p
    join public.companies c on c.id = p.company_id
    where lower(trim(p.email)) = v_email
      and p.status = 'active' and c.status = 'active'
  ) then
    return jsonb_build_object('state', 'existing_access');
  end if;

  select id into v_request_id
  from public.access_requests
  where lower(trim(work_email)) = v_email and status = 'pending'
  order by requested_at, id
  limit 1;

  if v_request_id is not null then
    return jsonb_build_object('state', 'already_pending', 'request_id', v_request_id);
  end if;

  insert into public.access_requests (
    company_name, work_email, requester_role, hiring_volume,
    first_role_to_review, note, status
  ) values (
    trim(p_company_name), v_email, trim(p_requester_role), trim(p_hiring_volume),
    trim(p_first_role_to_review), trim(coalesce(p_note, '')), 'pending'
  ) returning id into v_request_id;

  return jsonb_build_object('state', 'created', 'request_id', v_request_id);
end;
$$;

create or replace function public.platform_company_access_options()
returns table (
  company_id uuid,
  company_name text,
  company_status text,
  active_members integer,
  user_limit integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select c.id, c.name, c.status,
    count(p.id) filter (where p.status = 'active')::integer,
    public.pilot_user_limit(c.id)
  from public.companies c
  left join public.recruiter_profiles p on p.company_id = c.id
  where c.status = 'active' and public.pilot_user_limit(c.id) is not null
  group by c.id, c.name, c.status
  order by lower(c.name), c.id;
end;
$$;

create or replace function public.apply_special_company_access(
  p_platform_user_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_target_company_id uuid,
  p_role text,
  p_reason text,
  p_transfer_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_company public.companies;
  v_profile public.recruiter_profiles;
  v_previous_companies jsonb;
  v_user_limit integer;
begin
  if p_platform_user_id is null or p_auth_user_id is null or p_target_company_id is null
    or p_role not in ('admin', 'recruiter', 'hiring_manager')
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(v_reason) < 12 or length(v_reason) > 1000 then
    raise exception 'SPECIAL_ACCESS_INPUT_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.platform_admins
    where user_id = p_platform_user_id and status = 'active'
  ) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_company from public.companies
  where id = p_target_company_id and status = 'active'
  for update;
  if v_company.id is null then
    raise exception 'TARGET_COMPANY_NOT_AVAILABLE' using errcode = '23514';
  end if;
  v_user_limit := public.pilot_user_limit(p_target_company_id);
  if v_user_limit is null then
    raise exception 'TARGET_COMPANY_ACCESS_PLAN_REQUIRED' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.recruiter_profiles
    where lower(trim(email)) = v_email and user_id <> p_auth_user_id
      and status in ('active', 'invited')
  ) then
    raise exception 'EMAIL_IDENTITY_CONFLICT' using errcode = '23514';
  end if;

  perform 1 from public.recruiter_profiles where user_id = p_auth_user_id for update;
  select coalesce(jsonb_agg(jsonb_build_object('company_id', company_id, 'profile_id', id)), '[]'::jsonb)
  into v_previous_companies
  from public.recruiter_profiles
  where user_id = p_auth_user_id and status = 'active' and company_id <> p_target_company_id;

  if jsonb_array_length(v_previous_companies) > 0 and not p_transfer_existing then
    raise exception 'USER_ALREADY_HAS_ACTIVE_COMPANY' using errcode = '23514';
  end if;

  if p_transfer_existing then
    update public.recruiter_profiles
    set status = 'disabled', updated_at = now()
    where user_id = p_auth_user_id and status = 'active' and company_id <> p_target_company_id;
  end if;

  select * into v_profile
  from public.recruiter_profiles
  where company_id = p_target_company_id and user_id = p_auth_user_id
  for update;

  if v_profile.id is null then
    insert into public.recruiter_profiles (
      company_id, user_id, display_name, email, role, status
    ) values (
      p_target_company_id, p_auth_user_id, split_part(v_email, '@', 1),
      v_email, p_role, 'active'
    ) returning * into v_profile;
  else
    update public.recruiter_profiles
    set email = v_email, role = p_role, status = 'active', updated_at = now()
    where id = v_profile.id
    returning * into v_profile;
  end if;

  insert into public.audit_log_entries (
    company_id, actor_profile_id, entity_type, entity_id, action, metadata
  ) values (
    p_target_company_id,
    null,
    'recruiter_profile',
    v_profile.id,
    case when jsonb_array_length(v_previous_companies) > 0
      then 'special_company_access_transferred'
      else 'special_company_access_granted'
    end,
    jsonb_build_object(
      'platform_administrator_user_id', p_platform_user_id,
      'auth_user_id', p_auth_user_id,
      'email', v_email,
      'role', p_role,
      'reason', v_reason,
      'transfer_existing', p_transfer_existing,
      'previous_companies', v_previous_companies
    )
  );

  return jsonb_build_object(
    'company_id', p_target_company_id,
    'profile_id', v_profile.id,
    'status', 'active',
    'transferred', jsonb_array_length(v_previous_companies) > 0
  );
end;
$$;

alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (action in (
  'dashboard_viewed','job_role_read','candidate_read','evidence_report_read','human_review_decision_saved',
  'upload_validated','document_uploaded','candidate_upload_recorded','candidate_upload_failed',
  'evidence_report_generated','demo_trial_activated','demo_workspace_converted','job_role_created',
  'access_request_approved','access_request_rejected',
  'ongoing_access_requested','ongoing_access_approved','ongoing_access_started','ongoing_access_rejected',
  'evidence_report_analysis_failed','special_company_access_granted','special_company_access_transferred'
));

revoke all on function public.submit_access_request_guarded(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.platform_company_access_options() from public, anon;
revoke all on function public.apply_special_company_access(uuid,uuid,text,uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.submit_access_request_guarded(text,text,text,text,text,text) to service_role;
grant execute on function public.platform_company_access_options() to authenticated;
grant execute on function public.apply_special_company_access(uuid,uuid,text,uuid,text,text,boolean) to service_role;
;
