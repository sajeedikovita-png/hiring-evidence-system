-- Server-managed membership changes can reactivate a disabled profile or move a
-- profile into another company. Enforce the same entitlement cap on those paths
-- as on new invitations; browser profile mutations remain revoked by 001.

create or replace function public.enforce_demo_user_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_users integer;
  v_used_users integer;
  v_needs_check boolean;
  v_exclude_profile_id uuid;
begin
  if tg_op = 'INSERT' then
    v_needs_check := new.status <> 'disabled';
  else
    v_exclude_profile_id := old.id;
    v_needs_check := new.status <> 'disabled'
      and (old.status = 'disabled' or old.company_id is distinct from new.company_id);
  end if;

  if not v_needs_check then
    return new;
  end if;

  v_max_users := public.pilot_user_limit(new.company_id);
  if v_max_users is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.company_id::text));

  select count(*) into v_used_users
  from public.recruiter_profiles
  where company_id = new.company_id
    and status <> 'disabled'
    and (v_exclude_profile_id is null or id <> v_exclude_profile_id);

  if v_used_users >= v_max_users then
    raise exception 'PILOT_USER_LIMIT';
  end if;

  return new;
end;
$$;

drop trigger if exists recruiter_profiles_demo_quota on public.recruiter_profiles;
create trigger recruiter_profiles_demo_quota
  before insert or update of company_id, status on public.recruiter_profiles
  for each row execute function public.enforce_demo_user_quota();
;
