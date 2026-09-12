-- Finalize a provisioned access request in one transaction. The Edge function
-- authenticates the platform actor, while this service-only boundary rechecks
-- that actor and binds the approved Auth user to the provisioned workspace.

create or replace function public.finalize_access_request_approval(
  p_request_id uuid,
  p_platform_user_id uuid,
  p_auth_user_id uuid,
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.access_requests;
  v_owner public.recruiter_profiles;
  v_canonical_metadata jsonb;
begin
  if p_request_id is null or p_platform_user_id is null
    or p_auth_user_id is null or p_company_id is null then
    raise exception 'APPROVAL_FINALIZATION_ARGUMENT_REQUIRED' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.platform_admins
    where user_id = p_platform_user_id and status = 'active'
  ) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_request
  from public.access_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'ACCESS_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_request.status <> 'approved' or v_request.provisioned_company_id is null then
    raise exception 'ACCESS_REQUEST_NOT_APPROVED' using errcode = '23514';
  end if;

  if v_request.provisioned_company_id <> p_company_id then
    raise exception 'ACCESS_REQUEST_COMPANY_MISMATCH' using errcode = '23514';
  end if;

  select * into v_owner
  from public.recruiter_profiles
  where company_id = p_company_id
    and user_id = p_auth_user_id
    and role = 'admin'
    and status = 'active'
    and lower(trim(email)) = lower(trim(v_request.work_email));

  if v_owner.id is null then
    raise exception 'ACCESS_REQUEST_OWNER_MISMATCH' using errcode = '23514';
  end if;

  if v_request.reviewed_by_platform_user_id is not null
    and v_request.reviewed_by_platform_user_id <> p_platform_user_id then
    raise exception 'ACCESS_REQUEST_REVIEWER_MISMATCH' using errcode = '23514';
  end if;

  if v_request.auth_user_id is not null and v_request.auth_user_id <> p_auth_user_id then
    raise exception 'ACCESS_REQUEST_AUTH_USER_MISMATCH' using errcode = '23514';
  end if;

  if v_request.approved_company_id is not null and v_request.approved_company_id <> p_company_id then
    raise exception 'ACCESS_REQUEST_APPROVED_COMPANY_MISMATCH' using errcode = '23514';
  end if;

  if v_request.approved_role is not null and v_request.approved_role <> 'admin' then
    raise exception 'ACCESS_REQUEST_APPROVED_ROLE_MISMATCH' using errcode = '23514';
  end if;

  update public.access_requests
  set reviewed_by_platform_user_id = p_platform_user_id,
      auth_user_id = p_auth_user_id,
      approved_company_id = p_company_id,
      approved_role = 'admin',
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
  where id = p_request_id;

  v_canonical_metadata := jsonb_build_object(
    'approval_finalization_version', '202609090005',
    'platform_administrator_user_id', p_platform_user_id,
    'auth_user_id', p_auth_user_id,
    'provisioned_company_id', p_company_id
  );

  -- Locking the request row above serializes retries. Only this finalizer's
  -- company-bound metadata suppresses a retry; unrelated or legacy audit rows
  -- remain intact and cannot impersonate a completed finalization.
  if not exists (
    select 1 from public.audit_log_entries
    where company_id = p_company_id
      and entity_type = 'access_request'
      and entity_id = p_request_id
      and action = 'access_request_approved'
      and metadata @> v_canonical_metadata
  ) then
    insert into public.audit_log_entries (
      company_id, actor_profile_id, entity_type, entity_id, action, metadata
    ) values (
      p_company_id, null, 'access_request', p_request_id, 'access_request_approved',
      v_canonical_metadata
    );
  end if;

  return jsonb_build_object(
    'request_id', p_request_id,
    'company_id', p_company_id,
    'auth_user_id', p_auth_user_id,
    'status', 'approved'
  );
end;
$$;

revoke all on function public.finalize_access_request_approval(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_access_request_approval(uuid, uuid, uuid, uuid)
  to service_role;
;
