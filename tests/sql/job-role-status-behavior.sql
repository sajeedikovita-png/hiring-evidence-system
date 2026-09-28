do $$
declare v_result jsonb; v_count integer;
begin
 insert into public.demo_entitlements(company_id) values('00000000-0000-0000-0000-000000000001');
 v_result:=public.update_job_role_status('00000000-0000-0000-0000-000000000011','closed');
 if v_result->>'status'<>'closed' then raise exception 'CLOSE_FAILED'; end if;
 if not exists(select 1 from public.evidence_reports where id='00000000-0000-0000-0000-000000000031') then raise exception 'REPORT_DELETED'; end if;
 if not exists(select 1 from public.human_review_decisions where report_id='00000000-0000-0000-0000-000000000031') then raise exception 'DECISION_DELETED'; end if;
 begin
  insert into public.uploaded_documents(id,company_id,application_id,created_at) values(gen_random_uuid(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000025',now());
  raise exception 'CLOSED_ROLE_UPLOAD_ACCEPTED';
 exception when others then if SQLERRM<>'JOB_CLOSED_REOPEN_BEFORE_UPLOAD' then raise; end if; end;
 insert into public.job_roles(id,company_id,title,status) values('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Two','open'),('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Three','open');
 begin
  perform public.update_job_role_status('00000000-0000-0000-0000-000000000011','open');
  raise exception 'REOPEN_OVER_QUOTA';
 exception when others then if SQLERRM<>'PILOT_JOB_LIMIT' then raise; end if; end;
 perform public.update_job_role_status('00000000-0000-0000-0000-000000000013','closed');
 perform public.update_job_role_status('00000000-0000-0000-0000-000000000011','open');
 insert into public.uploaded_documents(id,company_id,application_id,created_at) values(gen_random_uuid(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000025',now());
 insert into public.job_roles(id,company_id,title,status) values('00000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000002','Other','open');
 begin
  perform public.update_job_role_status('00000000-0000-0000-0000-000000000019','closed');
  raise exception 'CROSS_TENANT_CLOSE_ALLOWED';
 exception when others then if SQLERRM<>'JOB_UNAVAILABLE' then raise; end if; end;
 update public.recruiter_profiles set role='hiring_manager';
 begin
  perform public.update_job_role_status('00000000-0000-0000-0000-000000000011','closed');
  raise exception 'MANAGER_CLOSE_ALLOWED';
 exception when others then if SQLERRM<>'JOB_MANAGEMENT_ACCESS_REQUIRED' then raise; end if; end;
 update public.recruiter_profiles set role='recruiter';
 perform public.update_job_role_status('00000000-0000-0000-0000-000000000011','closed');
 select count(*) into v_count from public.audit_log_entries where action='job_role_status_changed';
 perform public.update_job_role_status('00000000-0000-0000-0000-000000000011','closed');
 if (select count(*) from public.audit_log_entries where action='job_role_status_changed')<>v_count then raise exception 'NOOP_AUDIT_DUPLICATED'; end if;
 if has_function_privilege('anon','public.update_job_role_status(uuid,text)','EXECUTE') then raise exception 'ANON_CLOSE_ALLOWED'; end if;
end $$;
