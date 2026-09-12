begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'quota-a@example.test', 'x', now(), '{}', '{}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'quota-b@example.test', 'x', now(), '{}', '{}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'quota-c@example.test', 'x', now(), '{}', '{}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'quota-d@example.test', 'x', now(), '{}', '{}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'quota-e@example.test', 'x', now(), '{}', '{}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '95000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'quota-f@example.test', 'x', now(), '{}', '{}', now(), now(), '', '');

insert into public.companies (id, name, status)
values
  ('95000000-0000-4000-8000-000000000010', 'Two-user fixture', 'active'),
  ('95000000-0000-4000-8000-000000000011', 'Five-user fixture', 'active');
insert into public.demo_entitlements (company_id)
values ('95000000-0000-4000-8000-000000000010'), ('95000000-0000-4000-8000-000000000011');

insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
values
  ('95000000-0000-4000-8000-000000000010', '95000000-0000-4000-8000-000000000001', 'A', 'quota-a@example.test', 'admin', 'active'),
  ('95000000-0000-4000-8000-000000000010', '95000000-0000-4000-8000-000000000002', 'B', 'quota-b@example.test', 'recruiter', 'active');
update public.recruiter_profiles set status = 'disabled'
where company_id = '95000000-0000-4000-8000-000000000010' and user_id = '95000000-0000-4000-8000-000000000002';
insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
values ('95000000-0000-4000-8000-000000000010', '95000000-0000-4000-8000-000000000003', 'C', 'quota-c@example.test', 'recruiter', 'active');

select throws_ok(
  $$ update public.recruiter_profiles set status = 'active'
     where company_id = '95000000-0000-4000-8000-000000000010' and user_id = '95000000-0000-4000-8000-000000000002' $$,
  'P0001', 'PILOT_USER_LIMIT', 'reactivating a displaced pilot user is rejected'
);
select is(
  (select count(*)::integer from public.recruiter_profiles where company_id = '95000000-0000-4000-8000-000000000010' and status <> 'disabled'),
  2, 'two-user pilot remains capped after failed reactivation'
);

insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
values ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000004', 'Four', 'quota-d@example.test', 'admin', 'active');
insert into public.ongoing_access_requests (
  id, company_id, requested_by_user_id, requested_by_profile_id, status, terms_accepted_at,
  review_note, reviewed_at, reviewed_by_platform_user_id, payment_agreement_confirmed_at
) values (
  '95000000-0000-4000-8000-000000000020', '95000000-0000-4000-8000-000000000011',
  '95000000-0000-4000-8000-000000000004',
  (select id from public.recruiter_profiles where company_id = '95000000-0000-4000-8000-000000000011' limit 1),
  'active', now(), 'Fixture agreement', now(), '95000000-0000-4000-8000-000000000004', now()
);
insert into public.ongoing_access_terms (company_id, request_id, state, activated_at, active_until)
values ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000020', 'active', now(), now() + interval '30 days');

insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
values
  ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000001', 'One', 'quota-a@example.test', 'admin', 'active'),
  ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000002', 'Two', 'quota-b@example.test', 'recruiter', 'active'),
  ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000003', 'Three', 'quota-c@example.test', 'recruiter', 'active'),
  ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000005', 'Five', 'quota-e@example.test', 'recruiter', 'active');
select is(
  (select count(*)::integer from public.recruiter_profiles where company_id = '95000000-0000-4000-8000-000000000011' and status <> 'disabled'),
  5, 'ongoing term accepts five active users'
);
select throws_ok(
  $$ insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
     values ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000006', 'Six', 'quota-f@example.test', 'recruiter', 'active') $$,
  'P0001', 'PILOT_USER_LIMIT', 'sixth ongoing user is rejected'
);
select is(
  (select count(*)::integer from public.recruiter_profiles where company_id = '95000000-0000-4000-8000-000000000011' and status <> 'disabled'),
  5, 'ongoing term remains capped at five users'
);

select * from finish();

rollback;
