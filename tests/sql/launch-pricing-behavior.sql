-- Run after 202609190001 in an isolated test database with test auth helpers.
do $$
declare result jsonb; request_id uuid; n integer;
begin
 insert into public.companies(id,name,status) values('00000000-0000-0000-0000-000000000001','Launch customer','active');
 insert into public.recruiter_profiles(id,company_id,user_id,role,status,email,display_name) values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001',auth.uid(),'admin','active','test@example.invalid','Test');
 insert into public.demo_entitlements(company_id,state,activated_at,active_until) values('00000000-0000-0000-0000-000000000001','active',now()-interval '31 days',now()-interval '1 day');
 result:=public.current_pilot_lifecycle_status();
 if result#>>'{pricing,initialPilotSgd}' <> '149' or result#>>'{limits,roles}' <> '2' then raise exception 'NEW_PILOT_WRONG'; end if;
 result:=public.create_ongoing_access_request(true);
 if result->>'ongoingMonthlySgd'<>'149' then raise exception 'NEW_REQUEST_PRICE_WRONG'; end if;
 request_id:=(result->>'id')::uuid;
 perform public.review_ongoing_access_request(request_id,'approve','Test payment agreement',true);
 -- A larger legacy initial quota can still exist while new terms await start.
 update public.demo_entitlements set max_jobs=10 where company_id='00000000-0000-0000-0000-000000000001';
 insert into public.job_roles(company_id,title,status) values
 ('00000000-0000-0000-0000-000000000001','Before start1','open'),
 ('00000000-0000-0000-0000-000000000001','Before start2','open'),
 ('00000000-0000-0000-0000-000000000001','Before start3','open');
 begin
 perform public.start_ongoing_access_term();
 raise exception 'OVERCAPACITY_START_ALLOWED';
 exception when others then if SQLERRM <> 'LAUNCH_PACKAGE_REQUIRES_TWO_ROLES_AND_TWO_USERS' then raise; end if; end;
 if (select state from public.ongoing_access_terms where company_id='00000000-0000-0000-0000-000000000001')<>'approved_pending_start' then raise exception 'FAILED_START_MUTATED_TERM'; end if;
 delete from public.job_roles where title like 'Before start%';
 update public.demo_entitlements set max_jobs=2 where company_id='00000000-0000-0000-0000-000000000001';
 perform public.start_ongoing_access_term();
 result:=public.current_pilot_lifecycle_status();
 if result#>>'{limits,roles}' <> '2' or result#>>'{limits,candidateDocuments}' <> '50' or result#>>'{limits,users}' <> '2' then raise exception 'ONGOING_LIMITS_WRONG'; end if;
 insert into public.job_roles(company_id,title,status) values('00000000-0000-0000-0000-000000000001','One','open'),('00000000-0000-0000-0000-000000000001','Two','draft');
 begin
 insert into public.job_roles(company_id,title,status) values('00000000-0000-0000-0000-000000000001','Three','open');
 raise exception 'QUOTA_NOT_ENFORCED';
 exception when others then if SQLERRM <> 'PILOT_JOB_LIMIT' then raise; end if; end;
 insert into public.job_roles(company_id,title,status) values('00000000-0000-0000-0000-000000000001','Closed','closed');
 begin
 update public.job_roles set status='open' where title='Closed';
 raise exception 'REOPEN_QUOTA_NOT_ENFORCED';
 exception when others then if SQLERRM <> 'PILOT_JOB_LIMIT' then raise; end if; end;
 update public.job_roles set status='closed' where title='One';
 update public.job_roles set status='open' where title='Closed';
 result:=public.confirm_launch_founder_payment('00000000-0000-0000-0000-000000000001',now(),'TEST-PAID-001');
 if result->>'founderSlot'<>'1' then raise exception 'FOUNDER_SLOT_WRONG'; end if;
 perform public.confirm_launch_founder_payment('00000000-0000-0000-0000-000000000001',now(),'TEST-PAID-001');
 select count(*) into n from public.launch_price_locks;
 if n<>1 then raise exception 'FOUNDER_NOT_IDEMPOTENT'; end if;
 begin
 perform public.confirm_launch_founder_payment('00000000-0000-0000-0000-000000000001',now()+interval '1 day','TEST-FUTURE');
 raise exception 'FUTURE_PAYMENT_ACCEPTED';
 exception when others then if SQLERRM <> 'PAYMENT_CONFIRMATION_INVALID' then raise; end if; end;
 if not exists(select 1 from public.audit_log_entries where action='launch_founder_payment_confirmed') then raise exception 'AUDIT_MISSING'; end if;
 insert into auth.users(id) values('00000000-0000-0000-0000-000000000102'),('00000000-0000-0000-0000-000000000103');
 insert into public.recruiter_profiles(id,company_id,user_id,role,status,email,display_name) values
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000102','recruiter','active','two@example.invalid','Two'),
 ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000103','recruiter','disabled','three@example.invalid','Three');
 begin
 update public.recruiter_profiles set status='active' where id='00000000-0000-0000-0000-000000000013';
 raise exception 'REACTIVATION_OVER_QUOTA';
 exception when others then if SQLERRM <> 'PILOT_USER_LIMIT' then raise; end if; end;
 update public.recruiter_profiles set status='disabled' where id='00000000-0000-0000-0000-000000000012';
 update public.recruiter_profiles set status='active' where id='00000000-0000-0000-0000-000000000013';

 for n in 2..6 loop
   insert into public.companies(id,name,status) values(('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Founder '||n,'active');
   insert into public.demo_entitlements(company_id) values(('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid);
   if n<=5 then
     perform public.confirm_launch_founder_payment(('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,now(),'TEST-PAID-00'||n);
   else
     begin
       perform public.confirm_launch_founder_payment(('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,now(),'TEST-PAID-006');
       raise exception 'SIXTH_FOUNDER_ACCEPTED';
     exception when others then if SQLERRM <> 'FOUNDING_ALLOCATION_FULL' then raise; end if; end;
   end if;
 end loop;

end $$;
