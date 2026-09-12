-- Company-isolated, time-limited live demo workspaces.

create table if not exists public.demo_entitlements (
  company_id uuid primary key references public.companies(id) on delete cascade,
  state text not null default 'pending_activation'
    check (state in ('pending_activation', 'active', 'read_only', 'purge_due', 'converted')),
  trial_days integer not null default 14 check (trial_days = 14),
  view_only_days integer not null default 7 check (view_only_days = 7),
  activated_at timestamptz,
  active_until timestamptz,
  purge_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((activated_at is null and active_until is null and purge_at is null) or
         (activated_at is not null and active_until = activated_at + interval '14 days' and purge_at = active_until + interval '7 days'))
);
alter table public.access_requests
  add column if not exists provisioned_company_id uuid references public.companies(id) on delete set null;
create unique index if not exists access_requests_one_provisioned_company
  on public.access_requests(provisioned_company_id)
  where provisioned_company_id is not null;
alter table public.demo_entitlements enable row level security;
drop policy if exists demo_entitlements_company_select on public.demo_entitlements;
create policy demo_entitlements_company_select
  on public.demo_entitlements for select
  using (company_id in (select public.current_company_ids()));
create or replace function public.activate_demo_trial(p_company_id uuid)
returns public.demo_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  entitlement public.demo_entitlements;
begin
  select * into entitlement from public.demo_entitlements where company_id = p_company_id for update;
  if entitlement.company_id is null then
    raise exception 'Demo entitlement not found';
  end if;
  if entitlement.state = 'pending_activation' then
    update public.demo_entitlements
    set state = 'active', activated_at = now(), active_until = now() + interval '14 days',
        purge_at = now() + interval '21 days', updated_at = now()
    where company_id = p_company_id
    returning * into entitlement;
  end if;
  return entitlement;
end;
$$;
create or replace function public.demo_workspace_is_writable(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.demo_entitlements e
    where e.company_id = p_company_id
      and e.state <> 'converted'
      and (e.active_until is null or now() >= e.active_until)
  );
$$;
-- Provisioning is one transaction so a failed approval cannot leave an orphaned company.
create or replace function public.provision_demo_workspace(
  p_request_id uuid,
  p_user_id uuid,
  p_email text,
  p_reviewer_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.access_requests;
  company_id uuid;
begin
  select * into request_row from public.access_requests where id = p_request_id for update;
  if request_row.id is null then
    raise exception 'Access request not found';
  end if;

  if request_row.provisioned_company_id is not null then
    return request_row.provisioned_company_id;
  end if;

  insert into public.companies (name)
  values (trim(request_row.company_name))
  returning id into company_id;

  insert into public.demo_entitlements (company_id)
  values (company_id);

  insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
  values (company_id, p_user_id, split_part(trim(p_email), '@', 1), trim(p_email), 'admin', 'active');

  update public.access_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by_profile_id = p_reviewer_profile_id,
      provisioned_company_id = company_id
  where id = p_request_id;

  return company_id;
end;
$$;
-- Split reads from writes: an expired demo remains readable but every mutation is blocked.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'job_roles', 'job_requirements', 'candidates', 'candidate_applications',
    'uploaded_documents', 'parsed_cvs', 'evidence_reports', 'evidence_items',
    'human_review_decisions'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_company_access', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_company_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_company_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_company_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_company_delete', table_name);
    execute format(
      'create policy %I on public.%I for select using (company_id in (select public.current_company_ids()))',
      table_name || '_company_select', table_name
    );
    execute format(
      'create policy %I on public.%I for insert with check (company_id in (select public.current_company_ids()) and public.demo_workspace_is_writable(company_id))',
      table_name || '_company_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update using (company_id in (select public.current_company_ids()) and public.demo_workspace_is_writable(company_id)) with check (company_id in (select public.current_company_ids()) and public.demo_workspace_is_writable(company_id))',
      table_name || '_company_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete using (company_id in (select public.current_company_ids()) and public.demo_workspace_is_writable(company_id))',
      table_name || '_company_delete', table_name
    );
  end loop;
end;
$$;
