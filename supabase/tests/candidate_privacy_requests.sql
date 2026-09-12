begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'privacy-admin-a@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'privacy-recruiter-a@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '98000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'privacy-admin-b@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '');

insert into public.companies (id, name, status) values
  ('a8000000-0000-4000-8000-000000000001', 'Privacy Company A', 'active'),
  ('a8000000-0000-4000-8000-000000000002', 'Privacy Company B', 'active');

insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status) values
  ('b8000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', 'Privacy admin A', 'privacy-admin-a@example.test', 'admin', 'active'),
  ('b8000000-0000-4000-8000-000000000002', 'a8000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000002', 'Privacy recruiter A', 'privacy-recruiter-a@example.test', 'recruiter', 'active'),
  ('b8000000-0000-4000-8000-000000000003', 'a8000000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000003', 'Privacy admin B', 'privacy-admin-b@example.test', 'admin', 'active');

insert into public.candidates (id, company_id, name, email, source) values
  ('c8000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-000000000001', 'Candidate A', 'candidate-a@example.test', 'manual'),
  ('c8000000-0000-4000-8000-000000000002', 'a8000000-0000-4000-8000-000000000002', 'Candidate B', 'candidate-b@example.test', 'manual');

select is(
  has_function_privilege('authenticated', 'public.create_candidate_privacy_request(uuid,text,text,text)', 'EXECUTE'),
  true,
  'authenticated workspace staff can record a privacy request through the RPC'
);
select is(
  has_table_privilege('authenticated', 'public.candidate_privacy_requests', 'INSERT'),
  false,
  'browser roles cannot bypass the privacy-request RPC with a direct insert'
);

select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select ok(
  set_config(
    'privacy.fixture.request_id',
    public.create_candidate_privacy_request(
    'c8000000-0000-4000-8000-000000000001', 'withdrawal',
    'Candidate-A@Example.Test', 'Stop using my application for future hiring.'
    )->>'id',
    true
  ) <> '',
  'active recruiter can record a withdrawal request for their company'
);

select is(
  (select status from public.candidate_privacy_requests where candidate_id = 'c8000000-0000-4000-8000-000000000001'),
  null,
  'non-admin staff cannot read the sensitive privacy-request queue directly'
);

select throws_ok(
  $$ select public.create_candidate_privacy_request(
    'c8000000-0000-4000-8000-000000000002', 'access',
    'candidate-b@example.test', ''
  ) $$,
  '23514', 'CANDIDATE_NOT_IN_WORKSPACE',
  'staff cannot create a privacy request for another company candidate'
);

select throws_ok(
  $$ insert into public.candidate_privacy_requests(
    company_id, candidate_id, request_type, requester_email
  ) values (
    'a8000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001', 'access', 'candidate-a@example.test'
  ) $$,
  '42501', 'permission denied for table candidate_privacy_requests',
  'staff cannot insert a privacy request outside the reviewed RPC'
);

reset role;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.list_candidate_privacy_requests()),
  1,
  'company admin can list only their privacy-request queue'
);

select throws_ok(
  $$ select public.review_candidate_privacy_request(
    current_setting('privacy.fixture.request_id')::uuid,
    'verify_identity', 'Identity verification was recorded.', false
  ) $$,
  '23514', 'CANDIDATE_PRIVACY_IDENTITY_VERIFICATION_REQUIRED',
  'admin cannot advance a request without an explicit identity-verification confirmation'
);

select lives_ok(
  $$ select public.review_candidate_privacy_request(
    current_setting('privacy.fixture.request_id')::uuid,
    'verify_identity', 'Identity verification was recorded.', true
  ) $$,
  'admin can move a verified request into human review'
);

select is(
  (select status from public.candidate_privacy_requests where candidate_id = 'c8000000-0000-4000-8000-000000000001'),
  'in_review',
  'verified request remains pending a human resolution'
);

select lives_ok(
  $$ select public.review_candidate_privacy_request(
    current_setting('privacy.fixture.request_id')::uuid,
    'resolve', 'Human reviewer recorded the withdrawal response and next steps.', false
  ) $$,
  'admin can record a human resolution after verification'
);

select is(
  (select status from public.candidate_privacy_requests where candidate_id = 'c8000000-0000-4000-8000-000000000001'),
  'resolved',
  'resolution state is recorded without automatic candidate-data mutation'
);

select is(
  (select count(*)::integer from public.candidates where id = 'c8000000-0000-4000-8000-000000000001'),
  1,
  'resolving a deletion or withdrawal request does not automatically delete candidate data'
);

reset role;
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.list_candidate_privacy_requests()),
  0,
  'another company admin cannot list company A privacy requests'
);

select throws_ok(
  $$ select public.review_candidate_privacy_request(
    current_setting('privacy.fixture.request_id')::uuid,
    'decline', 'Other company should not review this request.', false
  ) $$,
  '23514', 'CANDIDATE_PRIVACY_REQUEST_NOT_IN_WORKSPACE',
  'another company admin cannot review company A privacy requests'
);

reset role;

select is(
  (select count(*)::integer from public.audit_log_entries
   where entity_type = 'candidate_privacy_request'
     and entity_id = (select id from public.candidate_privacy_requests where candidate_id = 'c8000000-0000-4000-8000-000000000001')),
  3,
  'submission, identity verification, and human resolution each have an audit event'
);

select * from extensions.finish(false);

do $$
begin
  if extensions.num_failed() <> 0 then
    raise exception 'candidate privacy request SQL test failed: % assertions', extensions.num_failed();
  end if;
end;
$$;

rollback;
