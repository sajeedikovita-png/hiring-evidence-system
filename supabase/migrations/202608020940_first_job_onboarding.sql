-- Let an approved company define its own first role and criteria.
--
-- Until now a newly provisioned company had no job and no way to create one, so a real
-- customer signed in to an empty workspace and stopped: uploads require a role with
-- criteria to analyse against. The founder was inserting the first role by hand in SQL.
--
-- The company is derived from the signed-in user, never accepted from the browser. A
-- caller who passes someone else's ids gets nothing extra — there is nothing to pass.

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
    'demo_workspace_converted',
    'job_role_created'
  )
);

create or replace function public.create_job_with_criteria(
  p_title text,
  p_department text,
  p_location text,
  p_employment_type text,
  p_criteria jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_company_count integer;
  v_profile_id uuid;
  v_job_id uuid;
  v_criterion jsonb;
  v_criteria_count integer;
  v_required_count integer;
  v_sort integer := 0;
begin
  -- Exactly one workspace, or we cannot tell which one this is for. A person who
  -- belongs to two companies must not have a role silently filed under the wrong one.
  select count(*) into v_company_count from public.current_company_ids();
  if v_company_count = 0 then
    raise exception 'NO_WORKSPACE';
  end if;
  if v_company_count > 1 then
    raise exception 'AMBIGUOUS_WORKSPACE';
  end if;

  select company_id, id into v_company_id, v_profile_id
  from public.recruiter_profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;

  if not public.demo_workspace_is_writable(v_company_id) then
    raise exception 'PILOT_EXPIRED';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'TITLE_REQUIRED';
  end if;

  select count(*) into v_criteria_count from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb));
  if v_criteria_count = 0 then
    raise exception 'CRITERIA_REQUIRED';
  end if;
  -- Matches the analyzer's own cap, so a role cannot be created that the evidence
  -- analysis would then silently truncate.
  if v_criteria_count > 12 then
    raise exception 'TOO_MANY_CRITERIA';
  end if;

  select count(*) into v_required_count
  from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb)) as c
  where c ->> 'priority' = 'required';
  if v_required_count = 0 then
    raise exception 'REQUIRED_CRITERION_MISSING';
  end if;

  -- The two-job demo quota is enforced by the trigger on job_roles; it raises
  -- PILOT_JOB_LIMIT and aborts this whole transaction.
  insert into public.job_roles (company_id, created_by_profile_id, title, department, location, employment_type, status)
  values (
    v_company_id,
    v_profile_id,
    trim(p_title),
    nullif(trim(coalesce(p_department, '')), ''),
    nullif(trim(coalesce(p_location, '')), ''),
    nullif(trim(coalesce(p_employment_type, '')), ''),
    'open'
  )
  returning id into v_job_id;

  for v_criterion in select * from jsonb_array_elements(coalesce(p_criteria, '[]'::jsonb))
  loop
    if nullif(trim(coalesce(v_criterion ->> 'label', '')), '') is null then
      raise exception 'CRITERION_LABEL_REQUIRED';
    end if;

    v_sort := v_sort + 1;

    insert into public.job_requirements (company_id, job_id, label, description, priority, sort_order)
    values (
      v_company_id,
      v_job_id,
      trim(v_criterion ->> 'label'),
      -- Description drives analysis quality but should not block a first role; fall
      -- back to the label so the row is never empty.
      coalesce(nullif(trim(coalesce(v_criterion ->> 'description', '')), ''), trim(v_criterion ->> 'label')),
      case when v_criterion ->> 'priority' = 'preferred' then 'preferred' else 'required' end,
      v_sort
    );
  end loop;

  insert into public.audit_log_entries (company_id, actor_profile_id, entity_type, entity_id, action, metadata)
  values (
    v_company_id, v_profile_id, 'job_role', v_job_id, 'job_role_created',
    jsonb_build_object('criteria_count', v_criteria_count, 'required_count', v_required_count)
  );

  return jsonb_build_object('job_id', v_job_id, 'company_id', v_company_id, 'criteria_count', v_criteria_count);
end;
$$;

revoke execute on function public.create_job_with_criteria(text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_job_with_criteria(text, text, text, text, jsonb) to authenticated;
