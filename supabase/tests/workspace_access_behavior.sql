begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- These synthetic Auth users exist only within this transaction. The platform
-- allowlist deliberately references auth.users, so the fixture mirrors a real
-- authenticated subject without touching any deployed user.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'workspace-member-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'workspace-tenant-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'workspace-platform-active@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'workspace-platform-disabled@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '');

insert into public.companies (id, name, status)
values
  ('a0000000-0000-4000-8000-000000000001', 'Behavior Active Company', 'active'),
  ('a0000000-0000-4000-8000-000000000002', 'Behavior Other Company', 'active'),
  ('a0000000-0000-4000-8000-000000000003', 'Behavior Paused Company', 'paused');

insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'Behavior Member A', 'workspace-member-a@example.test', 'recruiter', 'active'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', 'Behavior Tenant Admin', 'workspace-tenant-admin@example.test', 'admin', 'active'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000004', 'Behavior Paused Member', 'workspace-platform-disabled@example.test', 'recruiter', 'active');

insert into public.candidates (id, company_id, name, source)
values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Active company synthetic candidate', 'manual'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Other company synthetic candidate', 'manual'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'Paused company synthetic candidate', 'manual');

insert into public.access_requests (
  id, company_name, work_email, requester_role, hiring_volume, first_role_to_review, status
)
values (
  'd0000000-0000-4000-8000-000000000001',
  'Behavior Request Company',
  'workspace-access-request@example.test',
  'Head of Talent',
  'One role',
  'Synthetic Role',
  'pending'
);

insert into public.platform_admins (user_id, display_name, status)
values
  ('90000000-0000-4000-8000-000000000003', 'Behavior Active Platform Operator', 'active'),
  ('90000000-0000-4000-8000-000000000004', 'Behavior Disabled Platform Operator', 'disabled');

-- A normal member can read the active workspace, but not a different company.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.candidates where company_id = 'a0000000-0000-4000-8000-000000000001'),
  1,
  'active member can read own active company candidate'
);

select is(
  (select count(*)::integer from public.candidates where company_id = 'a0000000-0000-4000-8000-000000000002'),
  0,
  'active member cannot read another company candidate'
);

select is(
  (select count(*)::integer from public.candidates where company_id = 'a0000000-0000-4000-8000-000000000003'),
  0,
  'active member cannot read a paused company candidate'
);

reset role;

-- A profile in a paused company is not a workspace member for RLS purposes.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
set local role authenticated;

select is_empty(
  'select public.current_company_ids()',
  'paused-company profile resolves no company IDs'
);

select is_empty(
  'select public.current_company_ids_text()',
  'paused-company profile resolves no storage company IDs'
);

select is(
  (select count(*)::integer from public.candidates where company_id = 'a0000000-0000-4000-8000-000000000003'),
  0,
  'paused-company member cannot read its own candidate'
);

reset role;

-- Pausing an otherwise active workspace revokes its RLS access immediately.
update public.companies
set status = 'paused'
where id = 'a0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is_empty(
  'select public.current_company_ids()',
  'pausing the company removes the previously active membership'
);

select is(
  (select count(*)::integer from public.candidates where company_id = 'a0000000-0000-4000-8000-000000000001'),
  0,
  'member cannot read candidate after company is paused'
);

reset role;

-- Tenant administrators cannot use tenant membership to review platform requests
-- or mutate a recruiter profile.
update public.companies
set status = 'active'
where id = 'a0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select is(
  public.current_user_is_platform_administrator(),
  false,
  'tenant administrator is not a platform administrator'
);

select is(
  (select count(*)::integer from public.access_requests),
  0,
  'tenant administrator cannot read the platform access-request queue'
);

select throws_ok(
  $$
    update public.recruiter_profiles
    set role = 'admin'
    where user_id = '90000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table recruiter_profiles',
  'tenant administrator cannot promote a recruiter profile through the browser role'
);

reset role;

-- Platform access is based on the active allowlist only and does not require a
-- customer membership. Disabled entries fail closed.
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select is(
  public.current_user_is_platform_administrator(),
  true,
  'active allowlist entry is a platform administrator'
);

select is(
  (select count(*)::integer from public.access_requests where id = 'd0000000-0000-4000-8000-000000000001'),
  1,
  'active platform administrator can read its synthetic access request without customer membership'
);

select is(
  (select count(*)::integer from public.companies where id = 'a0000000-0000-4000-8000-000000000001'),
  0,
  'platform approval authority does not grant broad customer-company reads'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
set local role authenticated;

select is(
  public.current_user_is_platform_administrator(),
  false,
  'disabled allowlist entry is not a platform administrator'
);

select is(
  (select count(*)::integer from public.access_requests where id = 'd0000000-0000-4000-8000-000000000001'),
  0,
  'disabled platform administrator cannot read the synthetic access request'
);

reset role;

-- A review decision made before provisioning is final: a later provision call
-- must not create a workspace or overwrite the rejected request.
insert into public.access_requests (
  id, company_name, work_email, requester_role, hiring_volume, first_role_to_review, status
)
values (
  'd0000000-0000-4000-8000-000000000002',
  'Behavior Rejected Request Company',
  'workspace-rejected-request@example.test',
  'Head of Talent',
  'One role',
  'Synthetic Role',
  'rejected'
);

select throws_ok(
  $$
    select public.provision_demo_workspace(
      'd0000000-0000-4000-8000-000000000002',
      '90000000-0000-4000-8000-000000000001',
      'workspace-member-a@example.test',
      'b0000000-0000-4000-8000-000000000002'
    )
  $$,
  '23514',
  'ACCESS_REQUEST_NOT_PENDING',
  'a rejected request cannot later be provisioned'
);

-- The trial lifecycle exists in the deployed schema. A member of company A must
-- not be able to activate company B's entitlement just by knowing its UUID.
insert into public.demo_entitlements (company_id)
values ('a0000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$ select public.activate_demo_trial('a0000000-0000-4000-8000-000000000002') $$,
  '42501',
  'WORKSPACE_ACCESS_REQUIRED',
  'member cannot activate another company trial by UUID'
);

reset role;

-- The legacy public form can still create a pending request with the approved
-- form fields, but column grants reject forged platform-review metadata.
set local role anon;

select lives_ok(
  $$
    insert into public.access_requests (
      company_name, work_email, requester_role, hiring_volume,
      first_role_to_review, note, status
    ) values (
      'Behavior Public Request Company', 'behavior-public-request@example.test',
      'Talent Lead', 'One role', 'Synthetic role', 'Synthetic request', 'pending'
    )
  $$,
  'anonymous legacy form can submit only a pending request'
);

select throws_ok(
  $$
    insert into public.access_requests (
      company_name, work_email, requester_role, hiring_volume,
      first_role_to_review, note, status, reviewed_by_platform_user_id
    ) values (
      'Behavior Forged Request Company', 'behavior-forged-request@example.test',
      'Talent Lead', 'One role', 'Synthetic role', 'Forged request', 'pending',
      '90000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  'permission denied for table access_requests',
  'anonymous form cannot forge platform review metadata'
);

reset role;

select is(
  (select count(*)::integer from public.access_requests where work_email = 'behavior-public-request@example.test'),
  1,
  'valid public submission is stored as a pending request'
);

select * from finish();

rollback;
