-- Separate platform authority from company authority.
--
-- Approval now provisions each customer owner as a company `admin`. Before this
-- migration `is_current_user_admin()` returned true for ANY active admin profile,
-- so every provisioned customer would have been able to list and approve other
-- companies' access requests. Platform authority is now tied to a specific Auth
-- user UUID and nothing else.

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- A signed-in platform administrator may read only their own row. Nobody may
-- insert, update, or delete through the API; rows are added by migration only.
drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select
  on public.platform_admins for select
  using (user_id = auth.uid());
-- Founder Auth user, as bootstrapped by 202607060001_admin_workspace.sql.
insert into public.platform_admins (user_id, display_name)
values ('77560c26-93bc-4b8e-a13b-29ebb14b1d3c', 'Sajeewa')
on conflict (user_id) do nothing;
-- Existing access_requests policies call this helper, so redefining it moves
-- every one of them onto platform authority without touching the policies.
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
  );
$$;
-- The lifecycle writes audit rows the original action list did not allow.
alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check (
  action in (
    'dashboard_viewed',
    'job_role_read',
    'candidate_read',
    'evidence_report_read',
    'human_review_decision_saved',
    'upload_validated',
    'candidate_upload_recorded',
    'candidate_upload_failed',
    'evidence_report_generated',
    'demo_trial_activated',
    'demo_workspace_converted'
  )
);
