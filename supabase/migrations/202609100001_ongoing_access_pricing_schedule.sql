-- Versioned founding-customer pricing. Existing accepted S$1,400 requests remain unchanged.

alter table public.ongoing_access_requests
  add column if not exists pricing_term_number integer;
alter table public.ongoing_access_requests
  drop constraint if exists ongoing_access_requests_ongoing_monthly_price_sgd_check;
alter table public.ongoing_access_requests
  drop constraint if exists ongoing_access_requests_pricing_term_number_check;
alter table public.ongoing_access_requests
  drop constraint if exists ongoing_access_requests_pricing_schedule_check;
alter table public.ongoing_access_requests
  add constraint ongoing_access_requests_pricing_term_number_check
    check (pricing_term_number is null or pricing_term_number > 0),
  add constraint ongoing_access_requests_pricing_schedule_check check (
    (terms_version = 'ongoing-access-2026-09-09'
      and ongoing_monthly_price_sgd = 1400
      and pricing_term_number is null)
    or
    (terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
      and ongoing_monthly_price_sgd = 800
      and pricing_term_number between 1 and 3)
    or
    (terms_version = 'ongoing-access-2026-09-10-standard-1400-v1'
      and ongoing_monthly_price_sgd = 1400
      and pricing_term_number >= 4)
  );
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
  v_founding_terms integer;
  v_completed_pricing_terms integer;
  v_has_standard_history boolean;
  v_offer_price integer;
  v_offer_version text;
  v_offer_term integer;
begin
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count <> 1 then raise exception 'PILOT_WORKSPACE_REQUIRED' using errcode = '42501'; end if;
  select workspace.company_id into v_company_id
  from public.current_company_ids() as workspace(company_id);

  select * into v_lifecycle from public.ongoing_access_terms where company_id = v_company_id;
  select * into v_demo from public.demo_entitlements where company_id = v_company_id;
  select * into v_request from public.ongoing_access_requests
  where company_id = v_company_id order by created_at desc limit 1;

  select count(*) into v_founding_terms
  from public.ongoing_access_requests
  where company_id = v_company_id
    and terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
    and status in ('active', 'expired');
  select count(*) into v_completed_pricing_terms
  from public.ongoing_access_requests
  where company_id = v_company_id
    and pricing_term_number is not null
    and status in ('active', 'expired');
  select exists(
    select 1 from public.ongoing_access_requests
    where company_id = v_company_id
      and terms_version in ('ongoing-access-2026-09-09', 'ongoing-access-2026-09-10-standard-1400-v1')
      and status in ('approved_pending_start', 'active', 'expired')
  ) into v_has_standard_history;

  if v_request.id is not null and v_request.status in ('pending', 'approved_pending_start', 'active') then
    v_offer_price := v_request.ongoing_monthly_price_sgd;
    v_offer_version := v_request.terms_version;
    v_offer_term := v_request.pricing_term_number;
  elsif v_has_standard_history or v_founding_terms >= 3 then
    v_offer_price := 1400;
    v_offer_version := 'ongoing-access-2026-09-10-standard-1400-v1';
    v_offer_term := greatest(4, v_completed_pricing_terms + 1);
  else
    v_offer_price := 800;
    v_offer_version := 'ongoing-access-2026-09-10-founding-800-v1';
    v_offer_term := v_founding_terms + 1;
  end if;

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
    'pricing', jsonb_build_object(
      'initialPilotSgd', 500,
      'ongoingMonthlySgd', v_offer_price,
      'ongoingPricingVersion', v_offer_version,
      'ongoingPricingTermNumber', v_offer_term,
      'foundingMonthlySgd', 800,
      'foundingTerms', 3,
      'standardMonthlySgd', 1400
    ),
    'limits', jsonb_build_object(
      'roles', public.pilot_job_role_limit(v_company_id),
      'candidateDocuments', public.pilot_candidate_document_limit(v_company_id),
      'users', public.pilot_user_limit(v_company_id)
    ),
    'usage', jsonb_build_object('roles', v_roles, 'candidateDocuments', v_documents, 'users', v_users),
    'paidRequest', case when v_request.id is null then null else jsonb_build_object(
      'id', v_request.id, 'status', v_request.status, 'requestedAt', v_request.created_at,
      'termsAcceptedAt', v_request.terms_accepted_at, 'reviewNote', v_request.review_note,
      'ongoingMonthlySgd', v_request.ongoing_monthly_price_sgd,
      'ongoingPricingVersion', v_request.terms_version,
      'ongoingPricingTermNumber', v_request.pricing_term_number
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
  v_founding_terms integer;
  v_completed_pricing_terms integer;
  v_has_standard_history boolean;
  v_price integer;
  v_terms_version text;
  v_pricing_term_number integer;
begin
  if p_terms_accepted is not true then raise exception 'PILOT_TERMS_REQUIRED' using errcode = '23514'; end if;
  select count(*) into v_admin_count
  from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';
  if v_admin_count <> 1 then raise exception 'PILOT_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select r.* into v_profile from public.recruiter_profiles r join public.companies c on c.id = r.company_id
  where r.user_id = auth.uid() and r.status = 'active' and r.role = 'admin' and c.status = 'active';
  select r.* into v_demo from public.demo_entitlements r where r.company_id = v_profile.company_id;
  if v_demo.company_id is null or v_demo.activated_at is null then
    raise exception 'ONGOING_ACCESS_REQUIRES_INITIAL_PILOT' using errcode = '23514';
  end if;

  perform 1 from public.companies where id = v_profile.company_id for update;
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

  select count(*) into v_founding_terms
  from public.ongoing_access_requests
  where company_id = v_profile.company_id
    and terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
    and status in ('active', 'expired');
  select count(*) into v_completed_pricing_terms
  from public.ongoing_access_requests
  where company_id = v_profile.company_id
    and pricing_term_number is not null
    and status in ('active', 'expired');
  select exists(
    select 1 from public.ongoing_access_requests
    where company_id = v_profile.company_id
      and terms_version in ('ongoing-access-2026-09-09', 'ongoing-access-2026-09-10-standard-1400-v1')
      and status in ('approved_pending_start', 'active', 'expired')
  ) into v_has_standard_history;

  if v_has_standard_history or v_founding_terms >= 3 then
    v_price := 1400;
    v_terms_version := 'ongoing-access-2026-09-10-standard-1400-v1';
    v_pricing_term_number := greatest(4, v_completed_pricing_terms + 1);
  else
    v_price := 800;
    v_terms_version := 'ongoing-access-2026-09-10-founding-800-v1';
    v_pricing_term_number := v_founding_terms + 1;
  end if;

  insert into public.ongoing_access_requests (
    company_id, requested_by_user_id, requested_by_profile_id, terms_version,
    ongoing_monthly_price_sgd, pricing_term_number, terms_accepted_at
  ) values (
    v_profile.company_id, auth.uid(), v_profile.id, v_terms_version,
    v_price, v_pricing_term_number, now()
  ) returning * into v_request;

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_profile.company_id, v_profile.id, 'ongoing_access_request', v_request.id, 'ongoing_access_requested',
    jsonb_build_object(
      'terms_version', v_request.terms_version,
      'ongoing_monthly_price_sgd', v_request.ongoing_monthly_price_sgd,
      'pricing_term_number', v_request.pricing_term_number,
      'standard_monthly_price_sgd', 1400
    ));
  return jsonb_build_object(
    'id', v_request.id,
    'status', v_request.status,
    'termsAcceptedAt', v_request.terms_accepted_at,
    'ongoingMonthlySgd', v_request.ongoing_monthly_price_sgd,
    'ongoingPricingVersion', v_request.terms_version,
    'ongoingPricingTermNumber', v_request.pricing_term_number
  );
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
  v_request public.ongoing_access_requests;
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
  select * into v_request from public.ongoing_access_requests where id = v_lifecycle.request_id;

  update public.ongoing_access_terms
  set state = 'active', activated_at = now(), active_until = now() + make_interval(days => v_lifecycle.duration_days), updated_at = now()
  where company_id = v_profile.company_id returning * into v_lifecycle;
  update public.ongoing_access_requests set status = 'active', updated_at = now() where id = v_lifecycle.request_id;
  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (v_profile.company_id, v_profile.id, 'ongoing_access_term', v_lifecycle.request_id, 'ongoing_access_started',
    jsonb_build_object(
      'duration_days', v_lifecycle.duration_days,
      'active_until', v_lifecycle.active_until,
      'terms_version', v_request.terms_version,
      'ongoing_monthly_price_sgd', v_request.ongoing_monthly_price_sgd,
      'pricing_term_number', v_request.pricing_term_number,
      'standard_monthly_price_sgd', 1400
    ));
  return public.current_pilot_lifecycle_status();
end;
$$;
drop function if exists public.platform_ongoing_access_requests();
create function public.platform_ongoing_access_requests()
returns table (
  id uuid, company_id uuid, company_name text, requester_email text, requester_name text,
  status text, requested_at timestamptz, terms_accepted_at timestamptz, review_note text,
  reviewed_at timestamptz, reviewed_by_platform_user_id uuid, ongoing_monthly_price_sgd integer,
  terms_version text, pricing_term_number integer
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.company_id, c.name, p.email, p.display_name, r.status, r.created_at,
    r.terms_accepted_at, r.review_note, r.reviewed_at, r.reviewed_by_platform_user_id,
    r.ongoing_monthly_price_sgd, r.terms_version, r.pricing_term_number
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
      jsonb_build_object(
        'platform_administrator_user_id', auth.uid(),
        'review_note', v_note,
        'terms_version', v_request.terms_version,
        'ongoing_monthly_price_sgd', v_request.ongoing_monthly_price_sgd,
        'pricing_term_number', v_request.pricing_term_number
      ));
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
    jsonb_build_object(
      'platform_administrator_user_id', auth.uid(),
      'review_note', v_note,
      'payment_agreement_confirmed', true,
      'terms_version', v_request.terms_version,
      'ongoing_monthly_price_sgd', v_request.ongoing_monthly_price_sgd,
      'pricing_term_number', v_request.pricing_term_number,
      'standard_monthly_price_sgd', 1400
    ));
  return jsonb_build_object('id', v_request.id, 'status', v_request.status);
end;
$$;
revoke all on function public.platform_ongoing_access_requests() from public, anon;
grant execute on function public.platform_ongoing_access_requests() to authenticated;
