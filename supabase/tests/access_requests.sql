begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select has_table(
  'public',
  'access_requests',
  'access_requests table exists'
);

select has_function(
  'public',
  'current_user_is_admin',
  array[]::text[],
  'admin authorization helper exists'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.access_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
      and pg_get_constraintdef(oid) like '%pending%'
      and pg_get_constraintdef(oid) like '%approved%'
      and pg_get_constraintdef(oid) like '%rejected%'
  ),
  'access request status is constrained'
);

select has_index(
  'public',
  'access_requests',
  'access_requests_one_pending_email',
  'only one pending request per normalized email'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'access_requests'
      and policyname = 'access_requests_admin_select'
  ),
  'only the admin select policy is defined for reads'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'access_requests'
      and cmd = 'SELECT'
      and (
        roles = '{anon}'::name[]
        or qual is null
        or qual = 'true'
      )
  ),
  'anonymous users cannot list access requests'
);

select * from finish();

rollback;
