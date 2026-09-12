-- Candidate-confirmed public professional evidence. No scraping or name search.
create table if not exists public.candidate_public_evidence (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid not null references public.evidence_reports(id) on delete cascade, application_id uuid not null references public.candidate_applications(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade, added_by_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  source_type text not null check(source_type in ('linkedin','github','portfolio','app_store','play_store','publication','other')),
  source_url text not null check(length(source_url) between 10 and 1000), source_title text not null check(length(source_title) between 1 and 180),
  source_excerpt text not null check(length(source_excerpt) between 20 and 8000), candidate_confirmed boolean not null check(candidate_confirmed),
  status text not null default 'processing' check(status in ('processing','ready','failed')), analysis jsonb not null default '{}'::jsonb,
  lease_token uuid, lease_expires_at timestamptz, failure_code text, checked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists candidate_public_evidence_report_created on public.candidate_public_evidence(company_id,report_id,created_at desc);
alter table public.candidate_public_evidence enable row level security;
revoke all on public.candidate_public_evidence from public,anon,authenticated;
grant all on public.candidate_public_evidence to service_role;

create or replace function public.prepare_public_evidence_analysis(p_actor_user_id uuid,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles; v_report public.evidence_reports; v_source public.candidate_public_evidence; v_company_count integer; v_type text:=lower(trim(coalesce(p_input->>'sourceType',''))); v_url text:=trim(coalesce(p_input->>'sourceUrl','')); v_title text:=trim(coalesce(p_input->>'sourceTitle','')); v_excerpt text:=trim(coalesce(p_input->>'sourceExcerpt','')); v_token uuid:=gen_random_uuid(); v_criteria jsonb; v_resume jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
  select count(*) into v_company_count from public.recruiter_profiles p join public.companies c on c.id=p.company_id where p.user_id=p_actor_user_id and p.status='active' and p.role in ('admin','recruiter','hiring_manager') and c.status='active';
  if v_company_count<>1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  select p.* into v_profile from public.recruiter_profiles p join public.companies c on c.id=p.company_id where p.user_id=p_actor_user_id and p.status='active' and c.status='active';
  select * into v_report from public.evidence_reports where id=(p_input->>'reportId')::uuid and company_id=v_profile.company_id;
  if v_report.id is null or not public.demo_workspace_is_writable(v_profile.company_id) then raise exception 'REPORT_NOT_WRITABLE' using errcode='42501'; end if;
  if v_type not in ('linkedin','github','portfolio','app_store','play_store','publication','other') or v_url !~ '^https://[^[:space:]]+$' or length(v_url)>1000 or length(v_title) not between 1 and 180 or length(v_excerpt) not between 20 and 8000 or coalesce((p_input->>'candidateConfirmed')::boolean,false) is not true then raise exception 'PUBLIC_EVIDENCE_INPUT_INVALID' using errcode='22023'; end if;
  if v_type='linkedin' and v_url !~* '^https://([a-z]{2,3}\.)?linkedin\.com/in/' then raise exception 'LINKEDIN_PROFILE_URL_REQUIRED' using errcode='22023'; end if;
  v_url:=split_part(split_part(v_url,'?',1),'#',1);
  if (select count(*) from public.candidate_public_evidence where report_id=v_report.id)>=10 then raise exception 'PUBLIC_EVIDENCE_LIMIT_REACHED' using errcode='23514'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'description',r.description,'priority',r.priority) order by r.sort_order,r.id),'[]'::jsonb) into v_criteria from public.job_requirements r where r.company_id=v_report.company_id and r.job_id=v_report.job_id;
  select coalesce(jsonb_agg(jsonb_build_object('criteriaId',e.requirement_id,'requirement',e.requirement,'evidence',e.candidate_evidence,'status',e.status_label)),'[]'::jsonb) into v_resume from public.evidence_items e where e.company_id=v_report.company_id and e.report_id=v_report.id;
  insert into public.candidate_public_evidence(company_id,report_id,application_id,candidate_id,added_by_profile_id,source_type,source_url,source_title,source_excerpt,candidate_confirmed,lease_token,lease_expires_at)
  values(v_report.company_id,v_report.id,v_report.application_id,v_report.candidate_id,v_profile.id,v_type,v_url,v_title,v_excerpt,true,v_token,now()+interval '90 seconds') returning * into v_source;
  return jsonb_build_object('sourceId',v_source.id,'leaseToken',v_token,'jobTitle',(select title from public.job_roles where id=v_report.job_id),'criteria',v_criteria,'resumeEvidence',v_resume);
end; $$;

create or replace function public.finalize_public_evidence_analysis(p_source_id uuid,p_actor_user_id uuid,p_lease_token uuid,p_analysis jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_source public.candidate_public_evidence; v_profile public.recruiter_profiles;
begin
  if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
  select * into v_source from public.candidate_public_evidence where id=p_source_id for update;
  select * into v_profile from public.recruiter_profiles where id=v_source.added_by_profile_id and user_id=p_actor_user_id and company_id=v_source.company_id and status='active';
  if v_source.id is null or v_profile.id is null or v_source.status<>'processing' or v_source.lease_token is distinct from p_lease_token or v_source.lease_expires_at<=now() then raise exception 'PUBLIC_EVIDENCE_RUN_NOT_FINALIZABLE' using errcode='42501'; end if;
  if jsonb_typeof(p_analysis)<>'object' or jsonb_typeof(p_analysis->'requirementLinks')<>'array' or jsonb_typeof(p_analysis->'additionalFacts')<>'array' or jsonb_typeof(p_analysis->'verificationQuestions')<>'array' or length(coalesce(p_analysis->>'summary','')) not between 1 and 800 then raise exception 'PUBLIC_EVIDENCE_ANALYSIS_INVALID' using errcode='22023'; end if;
  update public.candidate_public_evidence set status='ready',analysis=p_analysis,source_excerpt='Public excerpt removed after analysis.',lease_token=null,lease_expires_at=null,checked_at=now(),updated_at=now() where id=v_source.id;
  insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(v_source.company_id,v_profile.id,'candidate_public_evidence',v_source.id,'public_evidence_analyzed',jsonb_build_object('report_id',v_source.report_id,'source_type',v_source.source_type,'candidate_confirmed',true));
  return jsonb_build_object('sourceId',v_source.id,'status','ready');
end; $$;

create or replace function public.fail_public_evidence_analysis(p_source_id uuid,p_actor_user_id uuid,p_lease_token uuid,p_failure_code text)
returns void language plpgsql security definer set search_path=public as $$
declare v_source public.candidate_public_evidence;
begin
  if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
  select * into v_source from public.candidate_public_evidence where id=p_source_id for update;
  if v_source.id is null or v_source.status<>'processing' or v_source.lease_token is distinct from p_lease_token then return; end if;
  update public.candidate_public_evidence set status='failed',source_excerpt='Public excerpt removed after failed analysis.',failure_code=left(coalesce(p_failure_code,'ANALYSIS_FAILED'),80),lease_token=null,lease_expires_at=null,updated_at=now() where id=v_source.id;
end; $$;

create or replace function public.list_public_evidence_for_report(p_report_id uuid)
returns table(id uuid,source_type text,source_url text,source_title text,status text,analysis jsonb,checked_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.current_company_ids())<>1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  return query select e.id,e.source_type,e.source_url,e.source_title,e.status,e.analysis,e.checked_at,e.created_at from public.candidate_public_evidence e where e.report_id=p_report_id and e.company_id in(select public.current_company_ids()) order by e.created_at desc;
end; $$;

alter table public.audit_log_entries drop constraint if exists audit_log_entries_action_check;
alter table public.audit_log_entries add constraint audit_log_entries_action_check check(action in ('dashboard_viewed','job_role_read','candidate_read','evidence_report_read','human_review_decision_saved','upload_validated','document_uploaded','candidate_upload_recorded','candidate_upload_failed','evidence_report_generated','demo_trial_activated','demo_workspace_converted','job_role_created','access_request_approved','access_request_rejected','ongoing_access_requested','ongoing_access_approved','ongoing_access_started','ongoing_access_rejected','evidence_report_analysis_failed','public_evidence_analyzed'));
revoke all on function public.prepare_public_evidence_analysis(uuid,jsonb),public.finalize_public_evidence_analysis(uuid,uuid,uuid,jsonb),public.fail_public_evidence_analysis(uuid,uuid,uuid,text),public.list_public_evidence_for_report(uuid) from public,anon;
revoke all on function public.prepare_public_evidence_analysis(uuid,jsonb),public.finalize_public_evidence_analysis(uuid,uuid,uuid,jsonb),public.fail_public_evidence_analysis(uuid,uuid,uuid,text) from authenticated;
grant execute on function public.prepare_public_evidence_analysis(uuid,jsonb),public.finalize_public_evidence_analysis(uuid,uuid,uuid,jsonb),public.fail_public_evidence_analysis(uuid,uuid,uuid,text) to service_role;
grant execute on function public.list_public_evidence_for_report(uuid) to authenticated;
