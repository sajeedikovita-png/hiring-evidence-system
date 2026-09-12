begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table(
  'public',
  'platform_admins',
  'platform administrator allowlist exists'
);

select has_function(
  'public',
  'current_user_is_platform_administrator',
  array[]::text[],
  'platform authorization helper exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_admins'::regclass),
  'platform administrator allowlist has RLS enabled'
);

select ok(
  has_table_privilege('service_role', 'public.platform_admins', 'SELECT'),
  'service role can read the platform allowlist for protected Edge Function authorization'
);

select ok(
  not has_table_privilege('authenticated', 'public.platform_admins', 'INSERT')
  and not has_table_privilege('authenticated', 'public.platform_admins', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.platform_admins', 'DELETE'),
  'authenticated clients cannot mutate the platform allowlist'
);

select ok(
  not has_table_privilege('authenticated', 'public.recruiter_profiles', 'UPDATE'),
  'authenticated clients cannot update recruiter memberships'
);

select ok(
  not has_table_privilege('authenticated', 'public.access_requests', 'UPDATE'),
  'authenticated clients cannot update access requests directly'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'access_requests'
      and policyname = 'access_requests_admin_select'
      and cmd = 'SELECT'
  ),
  'access request reads require the platform administrator policy'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
      and policyname = 'companies_select_by_platform_administrator'
  ),
  'approval does not expose a broad platform company-selector policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'access_requests'
      and policyname = 'access_requests_public_insert'
      and cmd = 'INSERT'
  ),
  'legacy public request submission remains available'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'access_requests'
      and cmd in ('UPDATE', 'DELETE')
  ),
  'no browser update or delete policy remains for access requests'
);

select ok(
  has_column_privilege('anon', 'public.access_requests', 'company_name', 'INSERT')
  and not has_column_privilege('anon', 'public.access_requests', 'reviewed_by_platform_user_id', 'INSERT'),
  'public request inserts cannot write platform review metadata'
);

select ok(
  pg_get_functiondef('public.current_company_ids()'::regprocedure)
    like '%companies.status = ''active''%'
  and pg_get_functiondef('public.current_company_ids()'::regprocedure)
    like '%recruiter_profiles.role in (''admin'', ''recruiter'', ''hiring_manager'')%',
  'workspace membership requires an active company and valid role'
);

select ok(
  pg_get_functiondef('public.current_company_ids_text()'::regprocedure)
    like '%companies.status = ''active''%'
  and pg_get_functiondef('public.current_company_ids_text()'::regprocedure)
    like '%recruiter_profiles.role in (''admin'', ''recruiter'', ''hiring_manager'')%',
  'storage membership requires an active company and valid role'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_is_platform_administrator()'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users may execute only the platform authorization helper'
);

select * from finish();

rollback;
