-- Edge-only support submission keeps the browser contract small and binds the
-- record to the authenticated actor validated by the Edge Function.

create or replace function public.submit_support_issue_as_actor(p_actor_user_id uuid, p_issue jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_profile public.recruiter_profiles;
  v_count integer;
  v_input jsonb:=coalesce(p_issue,'{}'::jsonb);
  v_kind text:=lower(trim(coalesce(v_input->>'category',v_input->>'type','')));
  v_severity text:=lower(trim(coalesce(v_input->>'severity','')));
  v_title text:=trim(coalesce(v_input->>'title',v_input->>'subject',''));
  v_description text:=trim(coalesce(v_input->>'description',v_input->>'message',''));
  v_diagnostics jsonb:=coalesce(v_input->'diagnostics','{}'::jsonb);
  v_issue public.support_issues;
begin
  select count(*) into v_count
  from public.recruiter_profiles p join public.companies c on c.id=p.company_id
  where p.user_id=p_actor_user_id and p.status='active' and p.role in ('admin','recruiter','hiring_manager') and c.status='active';
  if v_count<>1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  select * into v_profile from public.recruiter_profiles
  where user_id=p_actor_user_id and status='active' and role in ('admin','recruiter','hiring_manager');

  if v_kind='problem' then v_kind:='bug'; end if;
  if v_kind not in ('question','bug','feature') or v_severity not in ('low','medium','high','critical') or length(v_title) not between 1 and 180 or length(v_description) not between 1 and 4000 then
    raise exception 'SUPPORT_ISSUE_INPUT_INVALID' using errcode='22023';
  end if;
  if (select count(*) from public.support_issues where submitted_by_profile_id=v_profile.id and created_at>now()-interval '10 minutes') >= 10 then
    raise exception 'SUPPORT_ISSUE_RATE_LIMITED' using errcode='42900';
  end if;
  if jsonb_typeof(v_diagnostics)<>'object' then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
  v_diagnostics:=v_diagnostics || jsonb_build_object('severity',v_severity);

  insert into public.support_issues(company_id,submitted_by_profile_id,reported_category,title,description,diagnostics)
  values(v_profile.company_id,v_profile.id,v_kind,v_title,v_description,public.redact_support_diagnostics(v_diagnostics))
  returning * into v_issue;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata)
  values(v_profile.company_id,v_profile.id,'support_issue',v_issue.id,'issue_created',jsonb_build_object('reported_category',v_kind,'source','support_edge'));
  return jsonb_build_object('issueId',v_issue.id,'triageStatus',v_issue.triage_status,'approvalStatus','not_requested');
end; $$;

revoke all on function public.submit_support_issue_as_actor(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_support_issue_as_actor(uuid,jsonb) to service_role;
