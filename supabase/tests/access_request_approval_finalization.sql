begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '96000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'approval-platform@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '96000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'approval-owner@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '96000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'approval-disabled@example.test', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '');

insert into public.platform_admins (user_id, display_name, status)
values
  ('96000000-0000-4000-8000-000000000001', 'Approval platform operator', 'active'),
  ('96000000-0000-4000-8000-000000000003', 'Disabled approval operator', 'disabled');

insert into public.companies (id, name, status)
values
  ('a6000000-0000-4000-8000-000000000001', 'Approval finalization fixture', 'active'),
  ('a6000000-0000-4000-8000-000000000002', 'Unrelated audit fixture', 'active');

insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status)
values (
  'b6000000-0000-4000-8000-000000000001',
  'a6000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000002',
  'Approval owner', 'approval-owner@example.test', 'admin', 'active'
);

insert into public.access_requests (
  id, company_name, work_email, requester_role, hiring_volume, first_role_to_review,
  status, reviewed_at, provisioned_company_id
) values (
  'd6000000-0000-4000-8000-000000000001',
  'Approval finalization fixture', 'approval-owner@example.test', 'Talent lead',
  'One role', 'Synthetic role', 'approved', now(),
  'a6000000-0000-4000-8000-000000000001'
);

-- A legacy/spoofed event for the same request must not suppress the canonical
-- finalizer's company-bound audit entry.
insert into public.audit_log_entries (company_id, entity_type, entity_id, action, metadata)
values (
  'a6000000-0000-4000-8000-000000000002', 'access_request',
  'd6000000-0000-4000-8000-000000000001', 'access_request_approved',
  jsonb_build_object('platform_administrator_user_id', '96000000-0000-4000-8000-000000000003')
);

select is(
  has_function_privilege(
    'authenticated',
    'public.finalize_access_request_approval(uuid, uuid, uuid, uuid)',
    'EXECUTE'
  ),
  false,
  'browser roles cannot call approval finalization directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.finalize_access_request_approval(uuid, uuid, uuid, uuid)',
    'EXECUTE'
  ),
  true,
  'only the service role can call approval finalization'
);

set local role service_role;

select lives_ok(
  $$ select public.finalize_access_request_approval(
    'd6000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000002',
    'a6000000-0000-4000-8000-000000000001'
  ) $$,
  'active platform operator finalizes the provisioned request'
);

select lives_ok(
  $$ select public.finalize_access_request_approval(
    'd6000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000002',
    'a6000000-0000-4000-8000-000000000001'
  ) $$,
  'same approval retry is idempotent'
);

select is(
  (select count(*)::integer from public.audit_log_entries
   where company_id = 'a6000000-0000-4000-8000-000000000001'
     and entity_type = 'access_request'
     and entity_id = 'd6000000-0000-4000-8000-000000000001'
     and action = 'access_request_approved'
     and metadata @> jsonb_build_object(
       'approval_finalization_version', '202609090005',
       'platform_administrator_user_id', '96000000-0000-4000-8000-000000000001',
       'auth_user_id', '96000000-0000-4000-8000-000000000002',
       'provisioned_company_id', 'a6000000-0000-4000-8000-000000000001'
     )),
  1,
  'retries create exactly one canonical approval audit event'
);

select is(
  (select count(*)::integer from public.audit_log_entries
   where entity_type = 'access_request'
     and entity_id = 'd6000000-0000-4000-8000-000000000001'
     and action = 'access_request_approved'),
  2,
  'unrelated legacy audit row is preserved alongside the canonical event'
);

select is(
  (select concat_ws('|', reviewed_by_platform_user_id::text, auth_user_id::text, approved_company_id::text, approved_role)
   from public.access_requests where id = 'd6000000-0000-4000-8000-000000000001'),
  '96000000-0000-4000-8000-000000000001|96000000-0000-4000-8000-000000000002|a6000000-0000-4000-8000-000000000001|admin',
  'compatibility fields bind the verified platform actor, owner, company, and admin role'
);

select throws_ok(
  $$ select public.finalize_access_request_approval(
    'd6000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000003',
    '96000000-0000-4000-8000-000000000002',
    'a6000000-0000-4000-8000-000000000001'
  ) $$,
  '42501', 'PLATFORM_ADMIN_REQUIRED',
  'disabled platform operator cannot finalize an approval'
);

select throws_ok(
  $$ select public.finalize_access_request_approval(
    'd6000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000002',
    'a6000000-0000-4000-8000-000000000099'
  ) $$,
  '23514', 'ACCESS_REQUEST_COMPANY_MISMATCH',
  'finalization rejects a company other than the provisioned workspace'
);

reset role;

select * from finish();

rollback;
