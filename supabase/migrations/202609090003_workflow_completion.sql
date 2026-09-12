-- Manual, source-grounded workflow. No parsing or AI claim is created here.
create or replace function public.create_manual_evidence_report(
  p_document_id uuid, p_requirement_id uuid, p_evidence text, p_source_reference text,
  p_missing_evidence text, p_verification_needed text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.uploaded_documents; r public.job_requirements; profile_id uuid; report_id uuid := gen_random_uuid(); report_code text;
begin
  select * into d from public.uploaded_documents where id=p_document_id and company_id in (select public.current_company_ids());
  if d.id is null then raise exception 'DOCUMENT_NOT_IN_WORKSPACE'; end if;
  if not public.demo_workspace_is_writable(d.company_id) then raise exception 'PILOT_EXPIRED'; end if;
  select jr.* into r from public.job_requirements jr join public.candidate_applications a on a.job_id=jr.job_id where jr.id=p_requirement_id and a.id=d.application_id and a.company_id=d.company_id and a.candidate_id=d.candidate_id and jr.company_id=d.company_id;
  if r.id is null then raise exception 'REQUIREMENT_NOT_FOR_DOCUMENT_JOB'; end if;
  if nullif(trim(p_evidence),'') is null or nullif(trim(p_source_reference),'') is null then raise exception 'SOURCE_GROUNDED_EVIDENCE_REQUIRED'; end if;
  select id into profile_id from public.recruiter_profiles where user_id=auth.uid() and company_id=d.company_id and status='active';
  report_code := 'HER-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(report_id::text,'-',''),1,6));
  insert into public.evidence_reports (id,company_id,job_id,application_id,candidate_id,public_report_code,status,evidence_summary,missing_evidence,verification_needed,suggested_interview_questions,recruiter_notes,fairness_check)
  select report_id,d.company_id,a.job_id,d.application_id,d.candidate_id,report_code,'Human review required',jsonb_build_array(jsonb_build_object('label','Manual evidence review','value','1','detail','One reviewer-recorded source reference','tone','info')),jsonb_build_array(coalesce(nullif(trim(p_missing_evidence),''),'No additional missing evidence recorded')),jsonb_build_array(coalesce(nullif(trim(p_verification_needed),''),'Verify this source reference before deciding')), '[]'::jsonb,jsonb_build_array('Manual source reference: ' || trim(p_source_reference)),'{}'::jsonb from public.candidate_applications a where a.id=d.application_id;
  insert into public.evidence_items (company_id,report_id,application_id,requirement_id,requirement,candidate_evidence,source,confidence,verification_needed,status_label,status_tone)
  values (d.company_id,report_id,d.application_id,r.id,r.label,trim(p_evidence),'Recruiter note','None',coalesce(nullif(trim(p_verification_needed),''),'Verify this source reference before deciding'),'Needs verification','warning');
  update public.uploaded_documents set parsing_status='manual_review_required', updated_at=now() where id=d.id;
  update public.candidate_applications set status='needs_review', updated_at=now() where id=d.application_id;
  insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(d.company_id,profile_id,'evidence_report',report_id,'evidence_report_generated',jsonb_build_object('manual_review',true,'document_id',d.id));
  return jsonb_build_object('report_id',report_id,'public_report_code',report_code);
end $$;
revoke execute on function public.create_manual_evidence_report(uuid,uuid,text,text,text,text) from public, anon;
grant execute on function public.create_manual_evidence_report(uuid,uuid,text,text,text,text) to authenticated;

create or replace function public.save_manual_review_decision(p_report_id uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare report public.evidence_reports; profile_id uuid; decision_id uuid := gen_random_uuid();
begin
 select * into report from public.evidence_reports where id=p_report_id and company_id in (select public.current_company_ids());
 if report.id is null then raise exception 'REPORT_NOT_IN_WORKSPACE'; end if;
 if not public.demo_workspace_is_writable(report.company_id) then raise exception 'PILOT_EXPIRED'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'DECISION_REASON_REQUIRED'; end if;
 if p_decision is null or p_decision not in ('Shortlist for interview','Hold for review','Not proceeding','Request more information') then raise exception 'DECISION_INVALID'; end if;
 select id into profile_id from public.recruiter_profiles where user_id=auth.uid() and company_id=report.company_id and status='active';
 insert into public.human_review_decisions(id,company_id,report_id,application_id,recruiter_profile_id,decision,reason,status) values(decision_id,report.company_id,report.id,report.application_id,profile_id,p_decision,trim(p_reason),'saved');
 insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(report.company_id,profile_id,'human_review_decision',decision_id,'human_review_decision_saved',jsonb_build_object('report_id',report.id));
 return jsonb_build_object('decision_id',decision_id);
end $$;
revoke execute on function public.save_manual_review_decision(uuid,text,text) from public, anon;
grant execute on function public.save_manual_review_decision(uuid,text,text) to authenticated;

revoke insert, update, delete on public.human_review_decisions from public, anon, authenticated;
;
