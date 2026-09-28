-- Preserve an approved HTTPS company logo in client-summary snapshots.
-- General report text still removes links and email addresses.
create or replace function public.create_client_report_share(p_report_id uuid,p_expires_in_days integer default 7,p_include_decision boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r public.evidence_reports; p public.recruiter_profiles; d public.human_review_decisions; s public.company_settings; t public.company_template_versions;
 v_summary jsonb; v_criteria jsonb; v_branding jsonb; v_share public.client_report_shares; v_token text; v_candidate_name text; v_company_name text; v_job_title text;
begin
 if p_expires_in_days is null or p_expires_in_days not between 1 and 30 then raise exception 'SHARE_EXPIRY_INVALID' using errcode='22023'; end if;
 select e.* into r from public.evidence_reports e where e.id=p_report_id and e.company_id in(select public.current_company_ids());
 if not found then raise exception 'REPORT_UNAVAILABLE' using errcode='42501'; end if;
 select * into p from public.recruiter_profiles where company_id=r.company_id and user_id=auth.uid() and status='active';
 if not found or not public.demo_workspace_is_writable(r.company_id) then raise exception 'SHARE_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.candidate_applications a where a.id=r.application_id and a.company_id=r.company_id and a.candidate_id=r.candidate_id and a.consent_status='recorded') then raise exception 'CANDIDATE_CONSENT_REQUIRED'; end if;
 if exists(select 1 from public.candidate_privacy_requests q where q.company_id=r.company_id and q.candidate_id=r.candidate_id and q.request_type in('deletion','withdrawal') and q.identity_verified_at is not null and q.status<>'declined') then raise exception 'CANDIDATE_SHARING_RESTRICTED'; end if;
 perform pg_advisory_xact_lock(hashtext(r.id::text));
 if (select count(*) from public.client_report_shares where report_id=r.id and revoked_at is null and expires_at>now())>=5 then raise exception 'ACTIVE_SHARE_LIMIT'; end if;
 select name into v_candidate_name from public.candidates where id=r.candidate_id and company_id=r.company_id;
 select name into v_company_name from public.companies where id=r.company_id and status='active';
 select title into v_job_title from public.job_roles where id=r.job_id and company_id=r.company_id;
 if v_candidate_name is null or v_company_name is null or v_job_title is null then raise exception 'REPORT_UNAVAILABLE'; end if;
 select * into s from public.company_settings where company_id=r.company_id;
 if s.active_report_template_id is not null then select * into t from public.company_template_versions where id=s.active_report_template_id and company_id=r.company_id and template_kind='report'; end if;
 v_branding:=jsonb_build_object('displayName',public.client_share_text(coalesce(s.display_name,v_company_name)),'logoUrl',case when coalesce(s.logo_url,'') like 'https://%' then left(s.logo_url,500) else '' end,'accentColor',coalesce(s.accent_color,'#28543f'),'heading',public.client_share_text(coalesce(s.report_branding->>'heading','Candidate evidence summary')),'footer',public.client_share_text(coalesce(nullif(t.content->>'footer',''),s.report_branding->>'footer','AI assists. Human decides. Evidence explains.')));
 select coalesce(jsonb_agg(jsonb_build_object(
  'requirement',public.client_share_text(e.requirement),
  'evidence',case when e.source='Recruiter note' then 'Internal evidence omitted from this summary.' else public.client_share_text(e.candidate_evidence) end,
  'source',case when e.source='Recruiter note' then 'Internal source omitted' else e.source end,
  'sourceReference',case when e.source='Recruiter note' then 'Not included' else public.client_share_text(coalesce(nullif(e.source_reference,''),'Reference not recorded')) end,
  'status',case when e.source='Recruiter note' then 'Needs verification' else public.client_share_text(e.status_label) end,
  'verification',case when e.source='Recruiter note' then 'Ask the recruiter for approved supporting evidence.' else public.client_share_text(e.verification_needed) end
 ) order by e.created_at,e.id),'[]'::jsonb) into v_criteria from public.evidence_items e where e.report_id=r.id and e.company_id=r.company_id;
 v_summary:=jsonb_build_object('reportReference',public.client_share_text(r.public_report_code),'companyName',public.client_share_text(v_company_name),'candidateName',public.client_share_text(v_candidate_name),'roleTitle',public.client_share_text(v_job_title),'preparedAt',now(),'reportGeneratedAt',r.generated_at,'status','Human review required','branding',v_branding,'criteria',v_criteria,'missingEvidence',public.client_share_text_array(r.missing_evidence),'verificationNeeded',public.client_share_text_array(r.verification_needed),'questions',public.client_share_text_array(r.suggested_interview_questions));
 if p_include_decision is true then
  select * into d from public.human_review_decisions where report_id=r.id and company_id=r.company_id and status='saved' order by created_at desc,id desc limit 1;
  if found then v_summary:=v_summary||jsonb_build_object('decision',jsonb_build_object('outcome',d.decision,'reason',public.client_share_text(d.reason),'recordedAt',d.created_at)); end if;
 end if;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.client_report_shares(company_id,report_id,created_by_profile_id,token_hash,summary,include_decision,expires_at)
 values(r.company_id,r.id,p.id,extensions.digest(v_token,'sha256'),v_summary,p_include_decision is true,now()+make_interval(days=>p_expires_in_days)) returning * into v_share;
 insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(r.company_id,p.id,'client_report_share',v_share.id,'client_report_share_created',jsonb_build_object('report_id',r.id,'expires_at',v_share.expires_at,'include_decision',p_include_decision is true));
 return jsonb_build_object('id',v_share.id,'token',v_token,'expiresAt',v_share.expires_at);
end; $$;
