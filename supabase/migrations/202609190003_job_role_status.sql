-- Reversible role closure releases active-role capacity and preserves all
-- candidate, report and hiring-decision records.
create function public.update_job_role_status(p_job_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare j public.job_roles; v_profile_id uuid; v_previous text;
begin
 if p_status is null or p_status not in('open','closed') then raise exception 'JOB_STATUS_INVALID' using errcode='22023'; end if;
 select * into j from public.job_roles where id=p_job_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 select id into v_profile_id from public.recruiter_profiles where company_id=j.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter');
 if v_profile_id is null then raise exception 'JOB_MANAGEMENT_ACCESS_REQUIRED' using errcode='42501'; end if;
 if not public.demo_workspace_is_writable(j.company_id) then raise exception 'PILOT_EXPIRED' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(j.company_id::text));
 select status into v_previous from public.job_roles where id=j.id for update;
 if v_previous<>p_status then
  update public.job_roles set status=p_status,updated_at=now() where id=j.id;
  insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata)
  values(j.company_id,v_profile_id,'job_role',j.id,'job_role_status_changed',jsonb_build_object('previous_status',v_previous,'status',p_status));
 end if;
 return jsonb_build_object('jobId',j.id,'status',p_status);
end; $$;
revoke all on function public.update_job_role_status(uuid,text) from public,anon;
grant execute on function public.update_job_role_status(uuid,text) to authenticated;

-- A closed role cannot silently continue accepting new candidate documents.
-- Existing evidence remains reviewable; reopening first checks the active quota.
create function public.enforce_open_job_for_document() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.company_id::text));
 if exists(select 1 from public.candidate_applications a join public.job_roles j on j.id=a.job_id and j.company_id=a.company_id where a.id=new.application_id and a.company_id=new.company_id and j.status='closed') then raise exception 'JOB_CLOSED_REOPEN_BEFORE_UPLOAD' using errcode='23514'; end if;
 return new;
end; $$;
revoke all on function public.enforce_open_job_for_document() from public,anon,authenticated;
create trigger uploaded_documents_open_job before insert on public.uploaded_documents for each row execute function public.enforce_open_job_for_document();

alter table public.audit_log_entries
  drop constraint if exists audit_log_entries_action_check;

alter table public.audit_log_entries
  add constraint audit_log_entries_action_check check (
    action in (
      'dashboard_viewed',
      'job_role_read',
      'candidate_read',
      'evidence_report_read',
      'human_review_decision_saved',
      'upload_validated',
      'document_uploaded',
      'candidate_upload_recorded',
      'candidate_upload_failed',
      'evidence_report_generated',
      'demo_trial_activated',
      'demo_workspace_converted',
      'job_role_created',
      'access_request_approved',
      'access_request_rejected',
      'ongoing_access_requested',
      'ongoing_access_approved',
      'ongoing_access_started',
      'ongoing_access_rejected',
      'evidence_report_analysis_failed',
      'public_evidence_analyzed',
      'special_company_access_granted',
      'special_company_access_transferred', 'launch_founder_payment_confirmed',
      'client_report_share_created', 'client_report_share_revoked', 'job_role_status_changed'
    )
  );

-- Status writes must use the audited RPC. Existing job creation uses its own
-- security-definer RPC; repository reads continue under existing RLS.
revoke update on public.job_roles from public,anon,authenticated;
