create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  work_email text not null,
  requester_role text not null,
  hiring_volume text not null,
  first_role_to_review text not null,
  note text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  approved_company_id uuid references public.companies(id) on delete set null,
  approved_role text
    check (approved_role in ('admin', 'recruiter', 'hiring_manager')),
  auth_user_id uuid,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (work_email = lower(trim(work_email))),
  check (
    (status = 'pending' and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  )
);
create unique index access_requests_one_pending_email
  on public.access_requests (lower(work_email))
  where status = 'pending';
create index idx_access_requests_status_requested_at
  on public.access_requests (status, requested_at desc);
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recruiter_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  )
$$;
alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon;
grant select, update on public.access_requests to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
create policy access_requests_admin_select
  on public.access_requests
  for select
  to authenticated
  using (public.current_user_is_admin());
create policy access_requests_admin_update
  on public.access_requests
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
