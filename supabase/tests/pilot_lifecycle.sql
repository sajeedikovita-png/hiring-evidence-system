begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_table('public', 'ongoing_access_requests', 'ongoing access request table exists');
select has_table('public', 'ongoing_access_terms', 'ongoing access term table exists');
select has_function('public', 'current_pilot_lifecycle_status', array[]::text[], 'effective lifecycle status RPC exists');
select has_function('public', 'create_ongoing_access_request', array['boolean'], 'customer ongoing request RPC exists');
select has_function('public', 'start_current_pilot_lifecycle', array[]::text[], 'intentional start RPC exists');
select has_function('public', 'review_ongoing_access_request', array['uuid', 'text', 'text', 'boolean'], 'platform review RPC exists');

select ok(
  not has_table_privilege('authenticated', 'public.ongoing_access_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ongoing_access_requests', 'UPDATE'),
  'customers cannot write or self-approve paid requests directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.ongoing_access_terms', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ongoing_access_terms', 'UPDATE'),
  'customers cannot alter pilot dates or quotas directly'
);

select ok(
  has_function_privilege('authenticated', 'public.current_pilot_lifecycle_status()'::regprocedure, 'EXECUTE')
  and has_function_privilege('authenticated', 'public.start_current_pilot_lifecycle()'::regprocedure, 'EXECUTE'),
  'authenticated customers can read status and intentionally start the current approved pilot or ongoing term'
);

select ok(
  pg_get_functiondef('public.activate_demo_trial(uuid)'::regprocedure)
    like '%make_interval(days => entitlement.trial_days)%'
  and pg_get_functiondef('public.activate_demo_trial(uuid)'::regprocedure)
    like '%entitlement.view_only_days%',
  'legacy demo activation uses its stored duration fields'
);

select ok(
  pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%PILOT_REVIEW_NOTE_REQUIRED%'
  and pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%PAYMENT_AGREEMENT_CONFIRMATION_REQUIRED%'
  and pg_get_functiondef('public.review_ongoing_access_request(uuid, text, text, boolean)'::regprocedure)
    like '%public.is_current_user_admin()%',
  'approval requires platform authority, a human note, and payment agreement confirmation'
);

select ok(
  pg_get_functiondef('public.start_current_pilot_lifecycle()'::regprocedure)
    like '%pending_activation%'
  and pg_get_functiondef('public.start_current_pilot_lifecycle()'::regprocedure)
    like '%approved_pending_start%',
  'the intentional start RPC covers the initial pilot and reviewed ongoing term'
);

select ok(
  pg_get_functiondef('public.demo_workspace_is_writable(uuid)'::regprocedure)
    like '%now() < p.active_until%'
  and pg_get_functiondef('public.demo_workspace_is_writable(uuid)'::regprocedure)
    like '%demo_entitlements%',
  'write access honors active paid expiry while retaining legacy entitlement fallback'
);

select ok(
  pg_get_functiondef('public.enforce_demo_job_quota()'::regprocedure)
    like '%pilot_job_role_limit%'
  and pg_get_functiondef('public.enforce_pilot_candidate_document_quota()'::regprocedure)
    like '%PILOT_CANDIDATE_DOCUMENT_LIMIT%'
  and pg_get_functiondef('public.enforce_demo_user_quota()'::regprocedure)
    like '%pilot_user_limit%',
  'server quota checks cover roles, candidate documents, and users'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.ongoing_access_terms'::regclass
      and pg_get_constraintdef(oid) like '%duration_days = 30%'
  ),
  'new ongoing term has an immutable 30-day renewal period'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.ongoing_access_requests'::regclass
      and conname = 'ongoing_access_requests_pricing_schedule_check'
      and pg_get_constraintdef(oid) like '%ongoing_monthly_price_sgd = 800%'
      and pg_get_constraintdef(oid) like '%ongoing_monthly_price_sgd = 1400%'
  ),
  'ongoing requests enforce the versioned founding and standard prices'
);

select * from finish();

rollback;
