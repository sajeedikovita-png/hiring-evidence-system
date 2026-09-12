-- Milestone 1C: align workspace access with the canonical platform authority.
-- This migration deliberately grants no platform access. Operational bootstrap is
-- controlled separately; customer company-admin profiles are never promoted.

create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select recruiter_profiles.company_id
  from public.recruiter_profiles
  join public.companies on companies.id = recruiter_profiles.company_id
  where recruiter_profiles.user_id = auth.uid()
    and recruiter_profiles.status = 'active'
    and recruiter_profiles.role in ('admin', 'recruiter', 'hiring_manager')
    and companies.status = 'active'
$$;

-- Storage policies in the live trial use the text variant. It must apply the
-- same active-company decision as the uuid variant above.
create or replace function public.current_company_ids_text()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select recruiter_profiles.company_id::text
  from public.recruiter_profiles
  join public.companies on companies.id = recruiter_profiles.company_id
  where recruiter_profiles.user_id = auth.uid()
    and recruiter_profiles.status = 'active'
    and recruiter_profiles.role in ('admin', 'recruiter', 'hiring_manager')
    and companies.status = 'active'
$$;

-- The live demo lifecycle already has this function. Its original body checked
-- only that an entitlement existed, so any authenticated caller who learned a
-- company UUID could start another company's trial clock. Define the guarded
-- body only when the lifecycle table is present, keeping a clean foundation
-- installation compatible with its earlier migration sequence.
do $workspace_access_hardening$
begin
  if to_regclass('public.demo_entitlements') is not null then
    execute $activate_demo_trial$
      create or replace function public.activate_demo_trial(p_company_id uuid)
      returns public.demo_entitlements
      language plpgsql
      security definer
      set search_path = public
      as $function$
      declare
        entitlement public.demo_entitlements;
      begin
        if not exists (
          select 1
          from public.current_company_ids() as workspace_company(id)
          where workspace_company.id = p_company_id
        ) then
          raise exception 'WORKSPACE_ACCESS_REQUIRED' using errcode = '42501';
        end if;

        select * into entitlement
        from public.demo_entitlements
        where company_id = p_company_id
        for update;

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
      $function$;
    $activate_demo_trial$;
  end if;
end;
$workspace_access_hardening$;

-- The provisioning RPC already locks the request and is idempotent for an
-- existing company. Preserve both properties, but refuse a request that was
-- rejected after its UUID was obtained; otherwise a later approval call could
-- overwrite the rejection and create a workspace.
do $workspace_provisioning_hardening$
begin
  if to_regclass('public.demo_entitlements') is not null
    and to_regprocedure('public.provision_demo_workspace(uuid,uuid,text,uuid)') is not null then
    execute $provision_demo_workspace$
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
      as $function$
      declare
        request_row public.access_requests;
        company_id uuid;
      begin
        select * into request_row
        from public.access_requests
        where id = p_request_id
        for update;

        if request_row.id is null then
          raise exception 'Access request not found';
        end if;

        if request_row.provisioned_company_id is not null then
          return request_row.provisioned_company_id;
        end if;

        if request_row.status <> 'pending' then
          raise exception 'ACCESS_REQUEST_NOT_PENDING' using errcode = '23514';
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
      $function$;
    $provision_demo_workspace$;
  end if;
end;
$workspace_provisioning_hardening$;

drop policy if exists recruiter_profiles_company_update on public.recruiter_profiles;
revoke insert, update, delete on public.recruiter_profiles from public;
revoke insert, update, delete on public.recruiter_profiles from authenticated;

-- `platform_admins` is the deployed authority source. Define the same canonical
-- shape for clean installations; do not create or backfill any allowlist rows.
create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select
  on public.platform_admins for select
  to authenticated
  using (user_id = auth.uid());
revoke all on public.platform_admins from public;
revoke all on public.platform_admins from anon;
revoke all on public.platform_admins from authenticated;
grant select on public.platform_admins to authenticated, service_role;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
      and status = 'active'
  )
$$;

-- Keep the browser boundary's explicit name as an alias to the same authority;
-- it must never consult tenant recruiter profiles.
create or replace function public.current_user_is_platform_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_current_user_admin()
$$;

revoke all on function public.is_current_user_admin() from public;
revoke all on function public.current_user_is_platform_administrator() from public;
grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.current_user_is_platform_administrator() to authenticated;

-- Preserve public request submission for the legacy browser path, but only for
-- pending requests. Approval/rejection remains server-only: no browser UPDATE
-- policy or table privilege is retained. Column privileges prevent clients from
-- forging review, provisioning, or approval metadata on a pending request.
drop policy if exists access_requests_public_insert on public.access_requests;
create policy access_requests_public_insert
  on public.access_requests
  for insert
  to anon, authenticated
  with check (status = 'pending');
revoke insert on public.access_requests from public;
revoke insert on public.access_requests from anon, authenticated;
grant insert (
  company_name, work_email, requester_role, hiring_volume,
  first_role_to_review, note, status
) on public.access_requests to anon, authenticated;

drop policy if exists access_requests_admin_select on public.access_requests;
create policy access_requests_admin_select
  on public.access_requests
  for select
  to authenticated
  using (public.is_current_user_admin());
drop policy if exists access_requests_admin_update on public.access_requests;
revoke update on public.access_requests from public;
revoke update on public.access_requests from authenticated;
grant select on public.access_requests to authenticated;

-- Earlier local drafts exposed a platform company-selector policy. Approval now
-- provisions an isolated trial workspace, so platform review does not require
-- broad customer-company reads.
drop policy if exists companies_select_by_platform_administrator on public.companies;

alter table public.access_requests
  add column if not exists reviewed_by_platform_user_id uuid references auth.users(id) on delete set null;

-- Union the deployed lifecycle actions with the repository's existing actions
-- before adding access-request actions; do not narrow a live audit constraint.
alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (
  action in (
    'dashboard_viewed', 'job_role_read', 'candidate_read', 'evidence_report_read',
    'human_review_decision_saved', 'upload_validated', 'document_uploaded',
    'candidate_upload_recorded', 'candidate_upload_failed',
    'evidence_report_generated', 'demo_trial_activated',
    'demo_workspace_converted', 'job_role_created',
    'access_request_approved', 'access_request_rejected'
  )
);
;
