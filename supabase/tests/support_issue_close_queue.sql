begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

do $$
declare
  v_company uuid := gen_random_uuid();
  v_profile uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_issue uuid := gen_random_uuid();
  v_closed_issue uuid := gen_random_uuid();
  v_job uuid;
  v_claim_token uuid := gen_random_uuid();
begin
  perform set_config('request.jwt.claim.role','service_role',true);
  insert into public.companies(id,name,status) values(v_company,'Closed issue queue test','active');
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token)
    values('00000000-0000-0000-0000-000000000000',v_user,'authenticated','authenticated','queue-test@example.invalid','not-used',now(),'{}'::jsonb,'{}'::jsonb,now(),now(),'','');
  insert into public.recruiter_profiles(id,company_id,user_id,display_name,email,role,status)
    values(v_profile,v_company,v_user,'Queue test','queue-test@example.invalid','admin','active');
  insert into public.support_issues(id,company_id,submitted_by_profile_id,reported_category,title,description,diagnostics)
    values(v_issue,v_company,v_profile,'bug','Synthetic queue test','Synthetic only.','{"severity":"low"}'::jsonb);
  select id into v_job from public.support_agent_jobs where issue_id=v_issue;
  update public.support_agent_jobs set status='investigating', claim_token=v_claim_token,
    lease_expires_at=now()+interval '20 minutes' where id=v_job;
  update public.support_issues set review_status='closed' where id=v_issue;
  if (select status from public.support_agent_jobs where id=v_job) <> 'closed' then
    raise exception 'CLOSED_ISSUE_LEFT_AGENT_JOB_ACTIVE';
  end if;
  if (select lease_expires_at from public.support_agent_jobs where id=v_job) is not null
     or (select claim_token from public.support_agent_jobs where id=v_job) is not null then
    raise exception 'CLOSED_ISSUE_LEASE_NOT_REVOKED';
  end if;
  if (select count(*) from public.support_agent_events where job_id=v_job and status='closed') <> 1 then
    raise exception 'CLOSED_ISSUE_CLOSE_EVENT_MISSING';
  end if;
  begin
    update public.support_agent_jobs set status='queued' where id=v_job;
    raise exception 'CLOSED_ISSUE_WAS_REQUEUED';
  exception when sqlstate '23514' then
    if sqlerrm <> 'CLOSED_SUPPORT_ISSUE_CANNOT_BE_QUEUED' then raise; end if;
  end;
  insert into public.support_issues(id,company_id,submitted_by_profile_id,reported_category,title,description,review_status)
    values(v_closed_issue,v_company,v_profile,'bug','Closed at creation','Synthetic only.','closed');
  if exists (select 1 from public.support_agent_jobs where issue_id=v_closed_issue) then
    raise exception 'CLOSED_ISSUE_WAS_QUEUED_ON_INSERT';
  end if;
  begin
    insert into public.developer_change_requests(company_id,issue_id,requested_by_profile_id,request_summary,recommendation_snapshot,recommendation_hash)
      values(v_company,v_closed_issue,v_profile,'Synthetic request','Synthetic recommendation','synthetic-hash');
    raise exception 'CLOSED_ISSUE_CHANGE_REQUEST_ACCEPTED';
  exception when sqlstate '23514' then
    if sqlerrm <> 'CLOSED_SUPPORT_ISSUE_CANNOT_CREATE_CHANGE_REQUEST' then raise; end if;
  end;
  delete from public.companies where id=v_company;
end; $$;

select has_trigger('public','support_issues','support_issue_closes_agent_job','closed issues withdraw agent work');
select has_trigger('public','support_agent_jobs','support_agent_job_closed_issue_guard','closed issues cannot be requeued');
select has_trigger('public','developer_change_requests','support_change_request_closed_issue_guard','closed issues cannot create developer requests');
select is((select count(*) from public.support_agent_jobs where status in ('queued','investigating','fix_prepared') and issue_id in (select id from public.support_issues where review_status='closed')),0::bigint,'closed issues have no claimable agent jobs');
select is((select count(*) from public.companies where name='Closed issue queue test'),0::bigint,'synthetic company fixture was cleaned up');
select * from finish();
rollback;
