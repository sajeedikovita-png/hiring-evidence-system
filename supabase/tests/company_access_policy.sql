begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000001','authenticated','authenticated','policy-platform@example.test','x',now(),'{}','{}',now(),now(),'',''),
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000002','authenticated','authenticated','policy-one@example.test','x',now(),'{}','{}',now(),now(),'',''),
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000003','authenticated','authenticated','policy-two@example.test','x',now(),'{}','{}',now(),now(),'',''),
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000004','authenticated','authenticated','policy-three@example.test','x',now(),'{}','{}',now(),now(),'','');

insert into public.platform_admins(user_id,display_name,status)
values('97000000-0000-4000-8000-000000000001','Policy operator','active');
insert into public.companies(id,name,status) values
  ('a7000000-0000-4000-8000-000000000001','Policy company A','active'),
  ('a7000000-0000-4000-8000-000000000002','Policy company B','active');
insert into public.demo_entitlements(company_id,max_users) values
  ('a7000000-0000-4000-8000-000000000001',2),
  ('a7000000-0000-4000-8000-000000000002',2);
insert into public.recruiter_profiles(id,company_id,user_id,display_name,email,role,status)
values('b7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','Policy one','policy-one@example.test','admin','active');

select is(has_function_privilege('authenticated','public.submit_access_request_guarded(text,text,text,text,text,text)','EXECUTE'),false,'browser cannot call guarded submission directly');
select is(has_function_privilege('authenticated','public.apply_special_company_access(uuid,uuid,text,uuid,text,text,boolean)','EXECUTE'),false,'browser cannot call special access mutation');

set local role service_role;
select is(public.submit_access_request_guarded('Existing','policy-one@example.test','Owner','1','Role','')->>'state','existing_access','active user does not create another pilot request');
select is(public.submit_access_request_guarded('New company','new-policy@example.test','Owner','1','Role','')->>'state','created','new email creates one pending request');
select is(public.submit_access_request_guarded('Duplicate company','NEW-policy@example.test','Owner','1','Role','')->>'state','already_pending','normalized duplicate reuses pending request');
select is((select count(*)::integer from public.access_requests where lower(work_email)='new-policy@example.test' and status='pending'),1,'only one pending request is stored');

select lives_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000003','policy-two@example.test','a7000000-0000-4000-8000-000000000002','recruiter','Additional employee approved by the company owner.',false)$$,'special access adds a user to an existing company');
select throws_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','policy-one@example.test','a7000000-0000-4000-8000-000000000002','recruiter','Requested without transfer confirmation.',false)$$,'23514','USER_ALREADY_HAS_ACTIVE_COMPANY','second active company is rejected without transfer');
select lives_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','policy-one@example.test','a7000000-0000-4000-8000-000000000002','hiring_manager','Company owner verified the requested membership transfer.',true)$$,'confirmed transfer disables the prior membership and activates the target');
select is((select status from public.recruiter_profiles where user_id='97000000-0000-4000-8000-000000000002' and company_id='a7000000-0000-4000-8000-000000000001'),'disabled','previous company membership is disabled');
select is((select role from public.recruiter_profiles where user_id='97000000-0000-4000-8000-000000000002' and company_id='a7000000-0000-4000-8000-000000000002'),'hiring_manager','target role is recorded');
select ok(exists(select 1 from public.audit_log_entries where company_id='a7000000-0000-4000-8000-000000000002' and action='special_company_access_transferred' and metadata->>'reason'='Company owner verified the requested membership transfer.'),'transfer has the platform actor and written reason in audit');
select throws_ok($$insert into public.recruiter_profiles(company_id,user_id,display_name,email,role,status) values('a7000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','Duplicate active','policy-one@example.test','recruiter','active')$$,'23505',null,'database prevents a second active company membership');
select throws_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000004','policy-three@example.test','a7000000-0000-4000-8000-000000000002','recruiter','Third user exceeds the target company quota.',false)$$,'P0001','PILOT_USER_LIMIT','special access respects the company user limit');
select throws_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000004','policy-three@example.test','a7000000-0000-4000-8000-000000000001','recruiter','short',false)$$,'22023','SPECIAL_ACCESS_INPUT_INVALID','special access requires a meaningful reason');
select throws_ok($$select public.apply_special_company_access('97000000-0000-4000-8000-000000000004','97000000-0000-4000-8000-000000000004','policy-three@example.test','a7000000-0000-4000-8000-000000000001','recruiter','Attempted by a non-platform user.',false)$$,'42501','PLATFORM_ADMIN_REQUIRED','non-platform user cannot grant special access');
reset role;

select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*)::integer from public.platform_company_access_options() where company_id in ('a7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000002')),2,'platform administrator can list active company access options');
reset role;

select * from finish();
rollback;
