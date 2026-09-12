-- Transactional production-schema verification. Synthetic records are removed before commit.
do $$
declare
  v_company uuid:=gen_random_uuid(); v_profile uuid:=gen_random_uuid(); v_issue uuid:=gen_random_uuid(); v_job uuid; v_token uuid:=gen_random_uuid(); v_bad uuid:=gen_random_uuid(); v_long text:=repeat('x',1000); v_event_length integer;
begin
  perform set_config('request.jwt.claim.role','service_role',true);
  insert into public.companies(id,name,status) values(v_company,'Support agent verification','active');
  insert into public.recruiter_profiles(id,company_id,user_id,display_name,email,role,status) values(v_profile,v_company,gen_random_uuid(),'Synthetic verifier','synthetic-verifier@example.invalid','admin','active');
  insert into public.support_issues(id,company_id,submitted_by_profile_id,reported_category,title,description,diagnostics) values(v_issue,v_company,v_profile,'bug','Synthetic UI verification','No customer data.','{"affected_page":"/","severity":"low"}'::jsonb);
  select id into v_job from public.support_agent_jobs where issue_id=v_issue;
  update public.support_agent_jobs set status='investigating',claim_token=v_token,lease_expires_at=now()+interval '20 minutes',attempt_count=1 where id=v_job;

  begin
    perform public.update_support_agent_job_v2(v_job,v_bad,'verification-worker','blocked','low','unknown','Wrong token must fail',null,'[]'::jsonb,null,null,null,null,null,'[]'::jsonb,'Expected failure');
    raise exception 'WRONG_CLAIM_TOKEN_ACCEPTED';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.update_support_agent_job_v2(v_job,v_token,'verification-worker','preview_ready','low','ui_layout','Direct preview must fail','Synthetic fix','[{"name":"typecheck","status":"passed"},{"name":"test","status":"passed"},{"name":"build","status":"passed"},{"name":"audit","status":"passed"}]'::jsonb,'codex/synthetic','https://synthetic-preview.vercel.app','synthetic','1111111111111111111111111111111111111111','2222222222222222222222222222222222222222','["src/styles/public-marketing.css"]'::jsonb,null);
    raise exception 'INVALID_STATUS_TRANSITION_ACCEPTED';
  exception when sqlstate '23514' then null;
  end;

  perform public.update_support_agent_job_v2(v_job,v_token,'verification-worker','fix_prepared','low','ui_layout','Synthetic investigation','Synthetic fix','[]'::jsonb,'codex/synthetic',null,null,null,null,'[]'::jsonb,null);

  begin
    perform public.update_support_agent_job_v2(v_job,v_token,'verification-worker','preview_ready','low','ui_layout','Null file must fail','Synthetic fix','[{"name":"typecheck","status":"passed"},{"name":"test","status":"passed"},{"name":"build","status":"passed"},{"name":"audit","status":"passed"}]'::jsonb,'codex/synthetic','https://synthetic-preview.vercel.app','synthetic','1111111111111111111111111111111111111111','2222222222222222222222222222222222222222','[null]'::jsonb,null);
    raise exception 'NULL_CHANGED_FILE_ACCEPTED';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.update_support_agent_job_v2(v_job,v_token,'verification-worker','preview_ready','low','ui_layout','Failed check must fail','Synthetic fix','[{"name":"typecheck","status":"passed"},{"name":"test","status":"failed"},{"name":"build","status":"passed"},{"name":"audit","status":"passed"}]'::jsonb,'codex/synthetic','https://synthetic-preview.vercel.app','synthetic','1111111111111111111111111111111111111111','2222222222222222222222222222222222222222','["src/styles/public-marketing.css"]'::jsonb,null);
    raise exception 'FAILED_CHECK_ACCEPTED';
  exception when sqlstate '23514' then null;
  end;

  update public.support_agent_jobs set status='investigating',claim_token=v_token,lease_expires_at=now()+interval '20 minutes' where id=v_job;
  perform public.update_support_agent_job_v2(v_job,v_token,'verification-worker','blocked','high','security',v_long,null,'[]'::jsonb,null,null,null,null,null,'[]'::jsonb,'Synthetic boundary verification');
  select length(summary) into v_event_length from public.support_agent_events where job_id=v_job and event_type='report_updated' and status='blocked' order by created_at desc limit 1;
  if v_event_length<>800 then raise exception 'EVENT_SUMMARY_NOT_BOUNDED'; end if;

  delete from public.companies where id=v_company;
end; $$;
