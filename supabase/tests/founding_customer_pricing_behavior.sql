begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pricing-owner@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pricing-platform@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '');

insert into public.companies (id, name, status)
values ('f1000000-0000-4000-8000-000000000001', 'Founding pricing behavior', 'active');
insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status)
values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'Pricing owner',
  'pricing-owner@example.test',
  'admin',
  'active'
);
insert into public.platform_admins (user_id, display_name, status)
values ('92000000-0000-4000-8000-000000000002', 'Pricing platform operator', 'active');
insert into public.demo_entitlements (company_id, state, activated_at, active_until, purge_at)
values (
  'f1000000-0000-4000-8000-000000000001',
  'active',
  now() - interval '90 days',
  now() - interval '60 days',
  now() - interval '53 days'
);

insert into public.ongoing_access_requests (
  id, company_id, requested_by_user_id, requested_by_profile_id, status,
  terms_version, ongoing_monthly_price_sgd, pricing_term_number,
  terms_accepted_at, review_note, reviewed_at, reviewed_by_platform_user_id,
  payment_agreement_confirmed_at, created_at, updated_at
) values
  ('f3000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'expired', 'ongoing-access-2026-09-10-founding-800-v1', 800, 1, now() - interval '93 days', 'Term one confirmed', now() - interval '93 days', '92000000-0000-4000-8000-000000000002', now() - interval '93 days', now() - interval '93 days', now() - interval '63 days'),
  ('f3000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'expired', 'ongoing-access-2026-09-10-founding-800-v1', 800, 2, now() - interval '62 days', 'Term two confirmed', now() - interval '62 days', '92000000-0000-4000-8000-000000000002', now() - interval '62 days', now() - interval '62 days', now() - interval '32 days'),
  ('f3000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'active', 'ongoing-access-2026-09-10-founding-800-v1', 800, 3, now() - interval '31 days', 'Term three confirmed', now() - interval '31 days', '92000000-0000-4000-8000-000000000002', now() - interval '31 days', now() - interval '31 days', now() - interval '1 day');

insert into public.ongoing_access_terms (
  company_id, request_id, state, activated_at, active_until
) values (
  'f1000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000003',
  'active',
  now() - interval '31 days',
  now() - interval '1 day'
);

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config('test.pricing_status', public.current_pilot_lifecycle_status()::text, true);
reset role;

do $$
declare
  v_status jsonb := current_setting('test.pricing_status')::jsonb;
begin
  if v_status ->> 'state' <> 'expired'
    or (v_status -> 'pricing' ->> 'ongoingMonthlySgd')::integer <> 1400
    or v_status -> 'pricing' ->> 'ongoingPricingVersion' <> 'ongoing-access-2026-09-10-standard-1400-v1'
    or (v_status -> 'pricing' ->> 'ongoingPricingTermNumber')::integer <> 4 then
    raise exception 'EXPIRED_TERM_OFFER_MISMATCH: %', v_status -> 'pricing';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config('test.standard_request_id', public.create_ongoing_access_request(true) ->> 'id', true);
reset role;

do $$
begin
  if not exists (
    select 1 from public.ongoing_access_requests
    where id = current_setting('test.standard_request_id')::uuid
      and status = 'pending'
      and ongoing_monthly_price_sgd = 1400
      and terms_version = 'ongoing-access-2026-09-10-standard-1400-v1'
      and pricing_term_number = 4
  ) then
    raise exception 'STANDARD_REQUEST_OFFER_MISMATCH';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.review_ongoing_access_request(
  current_setting('test.standard_request_id')::uuid,
  'approve',
  'Standard fourth term agreement confirmed',
  true
);
reset role;

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.start_current_pilot_lifecycle();
reset role;

do $$
begin
  if (
    select count(*) from public.audit_log_entries
    where company_id = 'f1000000-0000-4000-8000-000000000001'
      and action in ('ongoing_access_requested', 'ongoing_access_approved', 'ongoing_access_started')
      and (metadata ->> 'ongoing_monthly_price_sgd')::integer = 1400
      and metadata ->> 'terms_version' = 'ongoing-access-2026-09-10-standard-1400-v1'
      and (metadata ->> 'pricing_term_number')::integer = 4
  ) <> 3 then
    raise exception 'STANDARD_OFFER_AUDIT_MISMATCH';
  end if;
end;
$$;

select 'ok - expired founding term displays and records the exact standard renewal offer' as result;

rollback;
