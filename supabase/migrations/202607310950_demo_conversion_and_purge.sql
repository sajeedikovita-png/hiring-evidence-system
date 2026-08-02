-- Ending a demo: convert it to a continuing customer, or delete it.
--
-- A converted workspace is exempt from expiry and from deletion forever. An
-- unconverted workspace is deleted after the seven view-only days, leaving only a
-- non-personal record that a demo ran and ended.

-- 1. What survives a purge. No candidate, recruiter, or contact data.
create table if not exists public.demo_workspace_closures (
  company_id uuid primary key,
  company_name text not null,
  activated_at timestamptz,
  active_until timestamptz,
  closed_at timestamptz not null default now(),
  outcome text not null check (outcome in ('purged', 'converted'))
);

alter table public.demo_workspace_closures enable row level security;

drop policy if exists demo_workspace_closures_platform_select on public.demo_workspace_closures;
create policy demo_workspace_closures_platform_select
  on public.demo_workspace_closures for select
  using (public.is_current_user_admin());

-- 2. The platform administrator needs to see every workspace, not just their own,
-- so /admin reads through this function rather than the company-scoped table.
drop policy if exists demo_entitlements_platform_select on public.demo_entitlements;
create policy demo_entitlements_platform_select
  on public.demo_entitlements for select
  using (public.is_current_user_admin());

create or replace function public.demo_workspaces_for_platform_admin()
returns table (
  company_id uuid,
  company_name text,
  state text,
  activated_at timestamptz,
  active_until timestamptz,
  purge_at timestamptz,
  converted_at timestamptz,
  candidate_count bigint,
  job_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.company_id,
    c.name,
    e.state,
    e.activated_at,
    e.active_until,
    e.purge_at,
    e.converted_at,
    (select count(*) from public.candidates where company_id = e.company_id),
    (select count(*) from public.job_roles where company_id = e.company_id)
  from public.demo_entitlements e
  join public.companies c on c.id = e.company_id
  where public.is_current_user_admin()
  order by e.created_at desc;
$$;

-- 3. Conversion is a deliberate human act by the platform administrator after an
-- off-platform commercial decision. No payment code is involved.
create or replace function public.convert_demo_workspace(p_company_id uuid)
returns public.demo_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement public.demo_entitlements;
  company_name text;
begin
  if not public.is_current_user_admin() then
    raise exception 'NOT_PLATFORM_ADMIN';
  end if;

  select * into entitlement
  from public.demo_entitlements
  where company_id = p_company_id
  for update;
  if entitlement.company_id is null then
    raise exception 'Demo entitlement not found';
  end if;

  if entitlement.state = 'converted' then
    return entitlement;
  end if;

  update public.demo_entitlements
  set state = 'converted',
      converted_at = now(),
      purge_at = null,
      updated_at = now()
  where company_id = p_company_id
  returning * into entitlement;

  select name into company_name from public.companies where id = p_company_id;

  insert into public.demo_workspace_closures (
    company_id, company_name, activated_at, active_until, closed_at, outcome
  )
  values (
    p_company_id, coalesce(company_name, 'Unknown company'),
    entitlement.activated_at, entitlement.active_until, now(), 'converted'
  )
  on conflict (company_id) do update
  set outcome = 'converted', closed_at = now();

  return entitlement;
end;
$$;

-- 4. Which workspaces are past their view-only period. Converted ones never appear.
create or replace function public.demo_workspaces_due_for_purge()
returns table (company_id uuid, company_name text, purge_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.company_id, c.name, e.purge_at
  from public.demo_entitlements e
  join public.companies c on c.id = e.company_id
  where e.state <> 'converted'
    and e.purge_at is not null
    and e.purge_at <= now()
  order by e.purge_at;
$$;

-- 5. Delete one workspace. Idempotent: a second call after the company is gone is a
-- no-op, so a retried or overlapping job cannot fail halfway.
--
-- Every tenant table references companies(id) on delete cascade, so removing the
-- company row removes jobs, candidates, applications, documents, reports, evidence,
-- decisions, and audit rows with it. Auth users are deliberately NOT deleted here:
-- a person may belong to another workspace. Storage objects are removed by the
-- purge-expired-demos function BEFORE this is called.
create or replace function public.purge_demo_workspace(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement public.demo_entitlements;
  v_company_name text;
begin
  select * into entitlement
  from public.demo_entitlements
  where company_id = p_company_id
  for update;

  if entitlement.company_id is null then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'no entitlement');
  end if;

  if entitlement.state = 'converted' then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'converted');
  end if;

  if entitlement.purge_at is null or entitlement.purge_at > now() then
    return jsonb_build_object('company_id', p_company_id, 'purged', false, 'reason', 'not due');
  end if;

  select name into v_company_name from public.companies where id = p_company_id;

  insert into public.demo_workspace_closures (
    company_id, company_name, activated_at, active_until, closed_at, outcome
  )
  values (
    p_company_id, coalesce(v_company_name, 'Unknown company'),
    entitlement.activated_at, entitlement.active_until, now(), 'purged'
  )
  on conflict (company_id) do update
  set outcome = 'purged', closed_at = now();

  delete from public.companies where id = p_company_id;

  return jsonb_build_object('company_id', p_company_id, 'purged', true);
end;
$$;

-- The purge functions are called with the service role by a scheduled function.
revoke execute on function public.purge_demo_workspace(uuid) from anon, authenticated;
revoke execute on function public.demo_workspaces_due_for_purge() from anon, authenticated;
