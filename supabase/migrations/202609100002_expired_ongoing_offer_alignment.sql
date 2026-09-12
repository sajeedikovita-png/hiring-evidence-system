-- Ensure the customer sees the next exact offer before accepting a renewal.
-- Stored request status is updated by the write RPC; this read RPC also treats
-- an active term past active_until as completed when calculating its successor.

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
