begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pilot-owner@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pilot-tenant-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'pilot-platform@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '');

insert into public.companies (id, name, status)
values ('e1000000-0000-4000-8000-000000000001', 'Pilot lifecycle behavior', 'active');
insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status)
values
  ('e2000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Pilot owner', 'pilot-owner@example.test', 'admin', 'active'),
  ('e2000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'Pilot tenant admin', 'pilot-tenant-admin@example.test', 'admin', 'active');
insert into public.demo_entitlements (company_id) values ('e1000000-0000-4000-8000-000000000001');
insert into public.platform_admins (user_id, display_name, status)
values ('91000000-0000-4000-8000-000000000003', 'Pilot platform operator', 'active');

select is((select trial_days from public.demo_entitlements where company_id = 'e1000000-0000-4000-8000-000000000001'), 30, 'new pilot entitlement defaults to 30 days');
select is((select max_jobs from public.demo_entitlements where company_id = 'e1000000-0000-4000-8000-000000000001'), 1, 'new pilot entitlement defaults to one role');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok('select public.start_current_pilot_lifecycle()', 'customer intentionally starts the initial pilot');
select is((select state from public.demo_entitlements where company_id = 'e1000000-0000-4000-8000-000000000001'), 'active', 'initial pilot becomes active');
select is((select active_until - activated_at = interval '30 days' from public.demo_entitlements where company_id = 'e1000000-0000-4000-8000-000000000001'), true, 'initial pilot uses the 30-day term');
select lives_ok(
  $$ insert into public.job_roles (company_id, created_by_profile_id, title, status)
     values ('e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Pilot role', 'open') $$,
  'first pilot role is accepted'
);
select throws_ok(
  $$ insert into public.job_roles (company_id, created_by_profile_id, title, status)
     values ('e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'Second pilot role', 'open') $$,
  'P0001', 'PILOT_JOB_LIMIT', 'second pilot role is rejected by the server quota'
);
select throws_ok('select public.create_ongoing_access_request(false)', '23514', 'PILOT_TERMS_REQUIRED', 'ongoing request requires terms acceptance');
select lives_ok('select public.create_ongoing_access_request(true)', 'customer can submit an ongoing request after the initial pilot starts');
reset role;

select is(
  (select ongoing_monthly_price_sgd = 800
      and terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
      and pricing_term_number = 1
   from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'),
  true,
  'first ongoing request records the exact founding offer'
);
select is(
  (select count(*)::integer from public.audit_log_entries
   where company_id = 'e1000000-0000-4000-8000-000000000001'
     and action = 'ongoing_access_requested'
     and (metadata ->> 'ongoing_monthly_price_sgd')::integer = 800
     and metadata ->> 'terms_version' = 'ongoing-access-2026-09-10-founding-800-v1'
     and (metadata ->> 'pricing_term_number')::integer = 1),
  1,
  'request audit records the exact founding offer'
);

with new_candidates as (
  insert into public.candidates (company_id, name, source)
  select 'e1000000-0000-4000-8000-000000000001', 'Pilot document candidate ' || series, 'manual'
  from generate_series(1, 50) as series
  returning id, company_id
), new_applications as (
  insert into public.candidate_applications (id, company_id, job_id, candidate_id, status, consent_status)
  select gen_random_uuid(), candidate.company_id,
    (select id from public.job_roles where company_id = candidate.company_id and title = 'Pilot role'),
    candidate.id, 'submitted', 'missing'
  from new_candidates candidate
  returning id, company_id, candidate_id
)
insert into public.uploaded_documents (id, company_id, application_id, candidate_id, file_name, storage_path, file_type, file_size_bytes, upload_status, parsing_status)
select gen_random_uuid(), application.company_id, application.id, application.candidate_id,
  'pilot-document.pdf', 'test/pilot-document.pdf', 'pdf', 1, 'accepted', 'queued'
from new_applications application;

select throws_ok(
  $$
    with candidate as (
      insert into public.candidates (company_id, name, source)
      values ('e1000000-0000-4000-8000-000000000001', 'Over quota document candidate', 'manual')
      returning id, company_id
    ), application as (
      insert into public.candidate_applications (id, company_id, job_id, candidate_id, status, consent_status)
      select gen_random_uuid(), candidate.company_id,
        (select id from public.job_roles where company_id = candidate.company_id and title = 'Pilot role'),
        candidate.id, 'submitted', 'missing'
      from candidate returning id, company_id, candidate_id
    )
    insert into public.uploaded_documents (id, company_id, application_id, candidate_id, file_name, storage_path, file_type, file_size_bytes, upload_status, parsing_status)
    select gen_random_uuid(), company_id, id, candidate_id, 'over-quota.pdf', 'test/over-quota.pdf', 'pdf', 1, 'accepted', 'queued'
    from application
  $$,
  'P0001', 'PILOT_CANDIDATE_DOCUMENT_LIMIT', '51st pilot document is rejected by the server quota'
);
select set_config(
  'test.ongoing_request_id',
  (select id::text from public.ongoing_access_requests where company_id = 'e1000000-0000-4000-8000-000000000001'),
  true
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Tenant cannot approve', true) $$,
  '42501', 'NOT_PLATFORM_ADMIN', 'tenant admin cannot self-approve ongoing access'
);
reset role;

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Agreement reviewed', false) $$,
  '23514', 'PAYMENT_AGREEMENT_CONFIRMATION_REQUIRED', 'platform review requires explicit payment/agreement confirmation'
);
select lives_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Agreement reviewed by platform operator', true) $$,
  'platform operator can approve with a human note and confirmation'
);
reset role;

select is(
  (select count(*)::integer from public.audit_log_entries
   where company_id = 'e1000000-0000-4000-8000-000000000001'
     and action = 'ongoing_access_approved'
     and (metadata ->> 'ongoing_monthly_price_sgd')::integer = 800
     and metadata ->> 'terms_version' = 'ongoing-access-2026-09-10-founding-800-v1'
     and (metadata ->> 'pricing_term_number')::integer = 1),
  1,
  'approval audit retains the exact accepted offer'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok('select public.start_current_pilot_lifecycle()', 'customer intentionally starts reviewed ongoing access');
select is((select (public.current_pilot_lifecycle_status() ->> 'plan')), 'ongoing', 'effective status switches to ongoing');
select is((select (public.current_pilot_lifecycle_status() -> 'limits' ->> 'candidateDocuments')::integer), 500, 'ongoing period exposes the 500-document limit');
select is((select (public.current_pilot_lifecycle_status() -> 'usage' ->> 'users')::integer), 2, 'ongoing usage includes the prepaid owner and existing tenant user');
reset role;

select is(
  (select count(*)::integer from public.audit_log_entries
   where company_id = 'e1000000-0000-4000-8000-000000000001'
     and action = 'ongoing_access_started'
     and (metadata ->> 'ongoing_monthly_price_sgd')::integer = 800
     and metadata ->> 'terms_version' = 'ongoing-access-2026-09-10-founding-800-v1'
     and (metadata ->> 'pricing_term_number')::integer = 1),
  1,
  'term-start audit retains the exact accepted offer'
);

update public.ongoing_access_terms
set activated_at = now() - interval '31 days', active_until = now() - interval '1 day', updated_at = now()
where company_id = 'e1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.demo_workspace_is_writable('e1000000-0000-4000-8000-000000000001'), false, 'expired ongoing term blocks writes');
select is(
  (select (status -> 'pricing' ->> 'ongoingMonthlySgd')::integer = 800
      and (status -> 'pricing' ->> 'ongoingPricingTermNumber')::integer = 2
   from (select public.current_pilot_lifecycle_status() as status) lifecycle),
  true,
  'expired founding term exposes the next exact founding offer before acceptance'
);
select lives_ok('select public.create_ongoing_access_request(true)', 'expired ongoing term can be renewed only through a new explicit request');
reset role;
update public.ongoing_access_requests
set created_at = now() + interval '1 second'
where company_id = 'e1000000-0000-4000-8000-000000000001' and status = 'pending';


select is(
  (select ongoing_monthly_price_sgd = 800
      and terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
      and pricing_term_number = 2
   from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true,
  'second term remains on the founding offer'
);
select set_config(
  'test.ongoing_request_id',
  (select id::text from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Second term agreement confirmed', true) $$,
  'platform operator approves the second founding term'
);
reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok('select public.start_current_pilot_lifecycle()', 'customer starts the second founding term');
reset role;
update public.ongoing_access_terms
set activated_at = now() - interval '31 days', active_until = now() - interval '1 day', updated_at = now()
where company_id = 'e1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select (status -> 'pricing' ->> 'ongoingMonthlySgd')::integer = 800
      and (status -> 'pricing' ->> 'ongoingPricingTermNumber')::integer = 3
   from (select public.current_pilot_lifecycle_status() as status) lifecycle),
  true,
  'expired second term exposes founding term three before acceptance'
);
select lives_ok('select public.create_ongoing_access_request(true)', 'customer requests the third founding term');
reset role;
update public.ongoing_access_requests
set created_at = now() + interval '2 seconds'
where company_id = 'e1000000-0000-4000-8000-000000000001' and status = 'pending';
select is(
  (select ongoing_monthly_price_sgd = 800
      and terms_version = 'ongoing-access-2026-09-10-founding-800-v1'
      and pricing_term_number = 3
   from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true,
  'third term records the final founding offer'
);
select set_config(
  'test.ongoing_request_id',
  (select id::text from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Third term agreement confirmed', true) $$,
  'platform operator approves the third founding term'
);
reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok('select public.start_current_pilot_lifecycle()', 'customer starts the third founding term');
reset role;
update public.ongoing_access_terms
set activated_at = now() - interval '31 days', active_until = now() - interval '1 day', updated_at = now()
where company_id = 'e1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select (status -> 'pricing' ->> 'ongoingMonthlySgd')::integer = 1400
      and status -> 'pricing' ->> 'ongoingPricingVersion' = 'ongoing-access-2026-09-10-standard-1400-v1'
      and (status -> 'pricing' ->> 'ongoingPricingTermNumber')::integer = 4
   from (select public.current_pilot_lifecycle_status() as status) lifecycle),
  true,
  'expired third term exposes the S$1,400 fourth-term offer before acceptance'
);
select lives_ok('select public.create_ongoing_access_request(true)', 'customer explicitly requests the standard fourth term');
reset role;
update public.ongoing_access_requests
set created_at = now() + interval '3 seconds'
where company_id = 'e1000000-0000-4000-8000-000000000001' and status = 'pending';
select is(
  (select ongoing_monthly_price_sgd = 1400
      and terms_version = 'ongoing-access-2026-09-10-standard-1400-v1'
      and pricing_term_number = 4
   from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true,
  'fourth term records the disclosed standard offer'
);
select set_config(
  'test.ongoing_request_id',
  (select id::text from public.ongoing_access_requests
   where company_id = 'e1000000-0000-4000-8000-000000000001'
   order by created_at desc limit 1),
  true
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$ select public.review_ongoing_access_request(current_setting('test.ongoing_request_id')::uuid, 'approve', 'Standard fourth term agreement confirmed', true) $$,
  'platform operator approves the standard fourth term'
);
reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok('select public.start_current_pilot_lifecycle()', 'customer starts the standard fourth term');
reset role;
select is(
  (select count(*)::integer from public.audit_log_entries
   where company_id = 'e1000000-0000-4000-8000-000000000001'
     and action in ('ongoing_access_requested', 'ongoing_access_approved', 'ongoing_access_started')
     and (metadata ->> 'ongoing_monthly_price_sgd')::integer = 1400
     and metadata ->> 'terms_version' = 'ongoing-access-2026-09-10-standard-1400-v1'
     and (metadata ->> 'pricing_term_number')::integer = 4),
  3,
  'request, approval, and start audits retain the exact fourth-term offer'
);

select * from finish();

rollback;
