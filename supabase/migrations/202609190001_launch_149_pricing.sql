-- New accepted terms use the S$149 launch offer. Existing requests, active terms,
-- and initial-pilot agreements retain their original stored amounts and quotas.
-- No automatic renewal or charging is introduced.
alter table public.demo_entitlements add column commercial_terms_version text not null default 'legacy';
alter table public.demo_entitlements alter column commercial_terms_version set default 'launch-149-2026-09-19', alter column max_jobs set default 2;
alter table public.ongoing_access_requests drop constraint ongoing_access_requests_pricing_schedule_check;
alter table public.ongoing_access_requests add constraint ongoing_access_requests_pricing_schedule_check check (
 (terms_version = 'ongoing-access-2026-09-09' and ongoing_monthly_price_sgd = 1400 and pricing_term_number is null)
 or (terms_version = 'ongoing-access-2026-09-10-founding-800-v1' and ongoing_monthly_price_sgd = 800 and pricing_term_number between 1 and 3)
 or (terms_version = 'ongoing-access-2026-09-10-standard-1400-v1' and ongoing_monthly_price_sgd = 1400 and pricing_term_number >= 4)
 or (terms_version = 'ongoing-access-2026-09-19-launch-149-v1' and ongoing_monthly_price_sgd = 149 and pricing_term_number > 0)
);
alter table public.ongoing_access_requests alter column terms_version set default 'ongoing-access-2026-09-19-launch-149-v1', alter column ongoing_monthly_price_sgd set default 149;
alter table public.ongoing_access_terms
 drop constraint ongoing_access_terms_max_job_roles_check,
 drop constraint ongoing_access_terms_max_candidate_documents_check,
 drop constraint ongoing_access_terms_max_users_check;
alter table public.ongoing_access_terms add constraint ongoing_access_terms_package_check check (
 (max_job_roles = 10 and max_candidate_documents = 500 and max_users = 5)
 or (max_job_roles = 2 and max_candidate_documents = 50 and max_users = 2));

-- Founder eligibility is a payment-confirmed administrator decision, not a count
-- of registrations, invitations, demo starts, or unpaid requests.
create table public.launch_price_locks (
 company_id uuid primary key references public.companies(id) on delete restrict,
 founder_slot integer not null unique check (founder_slot between 1 and 5),
 paid_at timestamptz not null,
 price_lock_ends_at timestamptz not null,
 payment_reference text not null unique check (length(trim(payment_reference)) between 3 and 200),
 confirmed_by uuid not null references auth.users(id),
 confirmed_at timestamptz not null default now(),
 check(price_lock_ends_at = paid_at + interval '12 months')
);
alter table public.launch_price_locks enable row level security;
revoke all on public.launch_price_locks from public, anon, authenticated;
create function public.confirm_launch_founder_payment(p_company_id uuid, p_paid_at timestamptz, p_payment_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_slot integer; v_lock public.launch_price_locks;
begin
 if not public.is_current_user_admin() then raise exception 'NOT_PLATFORM_ADMIN' using errcode='42501'; end if;
 if p_paid_at is null or p_paid_at > now() or p_paid_at < timestamptz '2026-09-19 00:00:00+08'
 or length(trim(coalesce(p_payment_reference,''))) not between 3 and 200 then raise exception 'PAYMENT_CONFIRMATION_INVALID'; end if;
 if not exists(select 1 from public.demo_entitlements where company_id=p_company_id and commercial_terms_version='launch-149-2026-09-19') then raise exception 'LAUNCH_PLAN_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext('launch-founder-five-2026-09-19'));
 select * into v_lock from public.launch_price_locks where company_id=p_company_id;
 if found then return jsonb_build_object('founderSlot',v_lock.founder_slot,'priceLockEndsAt',v_lock.price_lock_ends_at); end if;
 select min(n) into v_slot from generate_series(1,5) n where not exists(select 1 from public.launch_price_locks where founder_slot=n);
 if v_slot is null then raise exception 'FOUNDING_ALLOCATION_FULL'; end if;
 insert into public.launch_price_locks values(p_company_id,v_slot,p_paid_at,p_paid_at + interval '12 months',trim(p_payment_reference),auth.uid(),now()) returning * into v_lock;
 insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata)
 values(p_company_id,null,'company',p_company_id,'launch_founder_payment_confirmed',jsonb_build_object('platform_administrator_user_id',auth.uid(),'founder_slot',v_slot,'paid_at',p_paid_at,'price_lock_ends_at',v_lock.price_lock_ends_at,'payment_reference',trim(p_payment_reference),'price_sgd',149));
 return jsonb_build_object('founderSlot',v_slot,'priceLockEndsAt',v_lock.price_lock_ends_at);
end; $$;
revoke all on function public.confirm_launch_founder_payment(uuid,timestamptz,text) from public,anon;
grant execute on function public.confirm_launch_founder_payment(uuid,timestamptz,text) to authenticated;

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
  v_current_request_is_open boolean;
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

  v_current_request_is_open := v_request.id is not null and (
    v_request.status in ('pending', 'approved_pending_start')
    or (
      v_request.status = 'active'
      and v_lifecycle.request_id = v_request.id
      and v_lifecycle.state = 'active'
      and now() < v_lifecycle.active_until
    )
  );

  if v_current_request_is_open then
    v_offer_price := v_request.ongoing_monthly_price_sgd;
    v_offer_version := v_request.terms_version;
    v_offer_term := v_request.pricing_term_number;
  else
    v_offer_price := 149;
    v_offer_version := 'ongoing-access-2026-09-19-launch-149-v1';
    v_offer_term := v_completed_pricing_terms + 1;
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
  select count(*) into v_roles from public.job_roles where company_id = v_company_id and status <> 'closed';
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
      'initialPilotSgd', case when v_demo.commercial_terms_version = 'launch-149-2026-09-19' then 149 else 500 end,
      'ongoingMonthlySgd', v_offer_price,
      'ongoingPricingVersion', v_offer_version,
      'ongoingPricingTermNumber', v_offer_term,
      'foundingMonthlySgd', case when v_offer_price = 149 then 149 else 800 end,
      'foundingTerms', case when v_offer_price = 149 then 0 else 3 end,
      'standardMonthlySgd', case when v_offer_price = 149 then 149 else 1400 end,
      'priceLockEndsAt', (select price_lock_ends_at from public.launch_price_locks where company_id = v_company_id)
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

  v_price := 149;
  v_terms_version := 'ongoing-access-2026-09-19-launch-149-v1';
  v_pricing_term_number := v_completed_pricing_terms + 1;

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
      'standard_monthly_price_sgd', v_price
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

  perform pg_advisory_xact_lock(hashtext(v_request.company_id::text));
  -- Do not silently move a larger legacy workspace into a smaller package.
  -- Administrator and customer must close extra roles/disable extra users first.
  if v_request.terms_version = 'ongoing-access-2026-09-19-launch-149-v1' and (
    (select count(*) from public.job_roles where company_id=v_request.company_id and status <> 'closed') > 2
    or (select count(*) from public.recruiter_profiles where company_id=v_request.company_id and status <> 'disabled') > 2
  ) then raise exception 'LAUNCH_PACKAGE_REQUIRES_TWO_ROLES_AND_TWO_USERS' using errcode='23514'; end if;

  update public.ongoing_access_requests
  set status = 'approved_pending_start', review_note = v_note, reviewed_at = now(),
    reviewed_by_platform_user_id = auth.uid(), payment_agreement_confirmed_at = now(), updated_at = now()
  where id = v_request.id returning * into v_request;
  insert into public.ongoing_access_terms (company_id, request_id, max_job_roles, max_candidate_documents, max_users)
  values (v_request.company_id, v_request.id,
    case when v_request.terms_version = 'ongoing-access-2026-09-19-launch-149-v1' then 2 else 10 end,
    case when v_request.terms_version = 'ongoing-access-2026-09-19-launch-149-v1' then 50 else 500 end,
    case when v_request.terms_version = 'ongoing-access-2026-09-19-launch-149-v1' then 2 else 5 end)
  on conflict (company_id) do update set request_id = excluded.request_id, state = 'approved_pending_start',
    activated_at = null, active_until = null, max_job_roles = excluded.max_job_roles,
    max_candidate_documents = excluded.max_candidate_documents, max_users = excluded.max_users, updated_at = now()
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
      'standard_monthly_price_sgd', v_request.ongoing_monthly_price_sgd
    ));
  return jsonb_build_object('id', v_request.id, 'status', v_request.status);
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

  perform pg_advisory_xact_lock(hashtext(v_profile.company_id::text));
  select * into v_lifecycle from public.ongoing_access_terms
  where company_id = v_profile.company_id for update;
  if v_lifecycle.company_id is null or v_lifecycle.state <> 'approved_pending_start' then
    raise exception 'PILOT_NOT_APPROVED' using errcode = '23514';
  end if;
  select * into v_request from public.ongoing_access_requests where id = v_lifecycle.request_id;
  -- Capacity can change between approval and the customer's deliberate start.
  -- Serialize this recheck with all role/user quota transitions.
  if v_request.terms_version = 'ongoing-access-2026-09-19-launch-149-v1' and (
    (select count(*) from public.job_roles where company_id=v_profile.company_id and status <> 'closed') > 2
    or (select count(*) from public.recruiter_profiles where company_id=v_profile.company_id and status <> 'disabled') > 2
  ) then raise exception 'LAUNCH_PACKAGE_REQUIRES_TWO_ROLES_AND_TWO_USERS' using errcode='23514'; end if;


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
      'standard_monthly_price_sgd', v_request.ongoing_monthly_price_sgd
    ));
  return public.current_pilot_lifecycle_status();
end;
$$;

-- Closed roles do not consume active-role capacity. Reopening is checked too.
create or replace function public.enforce_demo_job_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_used integer;
begin
 if new.status = 'closed' then return new; end if;
 if TG_OP = 'UPDATE' and old.company_id = new.company_id and old.status <> 'closed' then return new; end if;
 perform pg_advisory_xact_lock(hashtext(new.company_id::text));
 v_limit := public.pilot_job_role_limit(new.company_id);
 if v_limit is null then return new; end if;
 select count(*) into v_used from public.job_roles where company_id=new.company_id and status <> 'closed' and id <> new.id;
 if v_used >= v_limit then raise exception 'PILOT_JOB_LIMIT'; end if;
 return new;
end; $$;
drop trigger if exists job_roles_demo_quota on public.job_roles;
create trigger job_roles_demo_quota before insert or update of status,company_id on public.job_roles for each row execute function public.enforce_demo_job_quota();

update public.support_knowledge_base_articles set body='The launch package is S$149 per 30-day term, including the first term, with two named users, two active roles and 50 new candidate documents per term. Initial guided setup includes one 30-minute session. Support is by email. Company-specific development requires a separate agreed scope and quote. Renewal is manual with no automatic charge. The first five payment-confirmed companies receive a recorded 12-month price lock; eligibility is confirmed by a platform administrator. Existing accepted agreements retain their stored terms. Always use the customer workspace values for its current price, dates and quotas.', updated_at=now() where slug='access-pricing-and-users';

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
      'special_company_access_transferred',
      'launch_founder_payment_confirmed'
    )
  );

-- Enabling an existing profile must consume capacity just like a new invite.
create or replace function public.enforce_demo_user_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_used integer;
begin
 if new.status = 'disabled' then return new; end if;
 if TG_OP = 'UPDATE' and old.company_id = new.company_id and old.status <> 'disabled' then return new; end if;
 perform pg_advisory_xact_lock(hashtext(new.company_id::text));
 v_limit := public.pilot_user_limit(new.company_id);
 if v_limit is null then return new; end if;
 select count(*) into v_used from public.recruiter_profiles where company_id=new.company_id and status<>'disabled' and id<>new.id;
 if v_used>=v_limit then raise exception 'PILOT_USER_LIMIT'; end if;
 return new;
end; $$;
drop trigger if exists recruiter_profiles_demo_quota on public.recruiter_profiles;
create trigger recruiter_profiles_demo_quota before insert or update of status,company_id on public.recruiter_profiles for each row execute function public.enforce_demo_user_quota();
