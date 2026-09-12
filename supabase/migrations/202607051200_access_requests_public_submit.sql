-- Access requests: anyone can submit a pilot/access request; only admins can view or approve.
-- Rebuilds access_requests with a clean, known schema (the table is empty in this dev project).

drop table if exists public.access_requests cascade;
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  work_email text not null,
  requester_role text,
  hiring_volume text,
  first_role_to_review text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.recruiter_profiles(id) on delete set null
);
create index if not exists idx_access_requests_status on public.access_requests(status);
create index if not exists idx_access_requests_created_at on public.access_requests(created_at desc);
-- Helper: is the currently signed-in user an admin?
create or replace function public.is_current_user_admin()
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
      and status = 'active'
      and role = 'admin'
  );
$$;
alter table public.access_requests enable row level security;
-- Anyone (including not-signed-in visitors) may SUBMIT a request.
drop policy if exists access_requests_public_insert on public.access_requests;
create policy access_requests_public_insert
  on public.access_requests
  for insert
  to anon, authenticated
  with check (true);
-- Only admins may VIEW requests.
drop policy if exists access_requests_admin_select on public.access_requests;
create policy access_requests_admin_select
  on public.access_requests
  for select
  to authenticated
  using (public.is_current_user_admin());
-- Only admins may UPDATE (approve / reject) requests.
drop policy if exists access_requests_admin_update on public.access_requests;
create policy access_requests_admin_update
  on public.access_requests
  for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
-- Table privileges: public can insert; only signed-in users can read/update (RLS then limits to admins).
grant insert on public.access_requests to anon, authenticated;
grant select, update on public.access_requests to authenticated;
-- TEMP dev-only helper so setup can be verified without an admin login.
-- (Will be removed once the admin view exists.)
create or replace function public.__dev_access_requests_summary()
returns table(total bigint, latest_email text, latest_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.access_requests),
    (select work_email from public.access_requests order by created_at desc limit 1),
    (select created_at from public.access_requests order by created_at desc limit 1);
$$;
grant execute on function public.__dev_access_requests_summary() to anon, authenticated;
