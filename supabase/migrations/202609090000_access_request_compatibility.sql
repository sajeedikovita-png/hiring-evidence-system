-- Bring the deployed pilot-request table forward without replacing its public
-- submission policy or its isolated demo-workspace lifecycle.
--
-- The deployed project has the 202607310900_live_demo_trials migration, which
-- provides provision_demo_workspace and the 14-day entitlement lifecycle. A
-- clean local database must apply that remote migration (or an equivalent
-- lifecycle implementation) before an approval flow may call that RPC.

alter table public.access_requests
  add column if not exists requested_at timestamptz,
  add column if not exists review_note text,
  add column if not exists auth_user_id uuid,
  add column if not exists approved_company_id uuid references public.companies(id) on delete set null,
  add column if not exists approved_role text,
  add column if not exists updated_at timestamptz;

-- The deployed table used created_at and provisioned_company_id. Keep those
-- legacy fields as the source of truth while exposing the names read by the
-- current admin workspace.
update public.access_requests
set
  requested_at = coalesce(requested_at, created_at),
  updated_at = coalesce(updated_at, created_at)
where requested_at is null
   or updated_at is null;

do $$
begin
  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.access_requests'::regclass
      and attname = 'provisioned_company_id'
      and not attisdropped
  ) then
    update public.access_requests
    set approved_company_id = coalesce(approved_company_id, provisioned_company_id)
    where approved_company_id is null
      and provisioned_company_id is not null;
  end if;
end;
$$;

alter table public.access_requests
  alter column requested_at set default now(),
  alter column requested_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create index if not exists idx_access_requests_status_requested_at
  on public.access_requests (status, requested_at desc);
;
