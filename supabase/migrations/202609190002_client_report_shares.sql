-- Immutable client-approved summary snapshots. Bearer tokens grant summary-only
-- access until expiry/revocation; never expose report records or document URLs.
create table public.client_report_shares (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 report_id uuid not null references public.evidence_reports(id) on delete cascade,
 created_by_profile_id uuid not null references public.recruiter_profiles(id),
 token_hash bytea not null unique,
 summary jsonb not null check(jsonb_typeof(summary)='object'),
 include_decision boolean not null default false,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null check(expires_at>created_at),
 revoked_at timestamptz
);
create index client_report_shares_company_report on public.client_report_shares(company_id,report_id,created_at desc);
alter table public.client_report_shares enable row level security;
revoke all on public.client_report_shares from public,anon,authenticated;

create function public.client_share_text(p_text text) returns text language sql immutable set search_path=public as $$
 select regexp_replace(regexp_replace(left(coalesce(p_text,''),12000),'(https?://|file://|blob:|data:)[^[:space:]<>]+','[link omitted]','gi'),'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}','[email omitted]','gi');
$$;
create function public.client_share_text_array(p_values jsonb) returns jsonb language sql immutable set search_path=public as $$
 select coalesce(jsonb_agg(public.client_share_text(item)), '[]'::jsonb) from jsonb_array_elements_text(case when jsonb_typeof(p_values)='array' then p_values else '[]'::jsonb end) as vals(item);
$$;
revoke all on function public.client_share_text(text),public.client_share_text_array(jsonb) from public,anon,authenticated;

create function public.create_client_report_share(p_report_id uuid,p_expires_in_days integer default 7,p_include_decision boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r public.evidence_reports; p public.recruiter_profiles; d public.human_review_decisions;
 v_summary jsonb; v_criteria jsonb; v_share public.client_report_shares; v_token text; v_candidate_name text; v_company_name text; v_job_title text;
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
 select coalesce(jsonb_agg(jsonb_build_object(
  'requirement',public.client_share_text(e.requirement),
  'evidence',case when e.source='Recruiter note' then 'Internal evidence omitted from this summary.' else public.client_share_text(e.candidate_evidence) end,
  'source',case when e.source='Recruiter note' then 'Internal source omitted' else e.source end,
  'sourceReference',case when e.source='Recruiter note' then 'Not included' else public.client_share_text(coalesce(nullif(e.source_reference,''),'Reference not recorded')) end,
  'status',case when e.source='Recruiter note' then 'Needs verification' else public.client_share_text(e.status_label) end,
  'verification',case when e.source='Recruiter note' then 'Ask the recruiter for approved supporting evidence.' else public.client_share_text(e.verification_needed) end
 ) order by e.created_at,e.id),'[]'::jsonb) into v_criteria from public.evidence_items e where e.report_id=r.id and e.company_id=r.company_id;
 v_summary:=jsonb_build_object('reportReference',public.client_share_text(r.public_report_code),'companyName',public.client_share_text(v_company_name),'candidateName',public.client_share_text(v_candidate_name),'roleTitle',public.client_share_text(v_job_title),'preparedAt',now(),'reportGeneratedAt',r.generated_at,'status','Human review required','criteria',v_criteria,'missingEvidence',public.client_share_text_array(r.missing_evidence),'verificationNeeded',public.client_share_text_array(r.verification_needed),'questions',public.client_share_text_array(r.suggested_interview_questions));
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

create function public.list_client_report_shares(p_report_id uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'expiresAt',expires_at,'revokedAt',revoked_at,'includeDecision',include_decision) order by created_at desc),'[]'::jsonb) from public.client_report_shares where report_id=p_report_id and company_id in(select public.current_company_ids());
$$;
create function public.revoke_client_report_share(p_share_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.client_report_shares; v_profile_id uuid;
begin
 select * into s from public.client_report_shares where id=p_share_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'SHARE_UNAVAILABLE' using errcode='42501'; end if;
 select id into v_profile_id from public.recruiter_profiles where company_id=s.company_id and user_id=auth.uid() and status='active';
 if v_profile_id is null then raise exception 'SHARE_UNAVAILABLE' using errcode='42501'; end if;
 if s.revoked_at is null then
 update public.client_report_shares set revoked_at=now() where id=s.id;
 insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata) values(s.company_id,v_profile_id,'client_report_share',s.id,'client_report_share_revoked',jsonb_build_object('report_id',s.report_id));
 end if;
end; $$;
create function public.read_client_report_share(p_token text) returns jsonb language plpgsql stable security definer set search_path=public,extensions as $$
declare v_result jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select jsonb_build_object('summary',s.summary,'expiresAt',s.expires_at) into v_result
 from public.client_report_shares s join public.evidence_reports r on r.id=s.report_id and r.company_id=s.company_id
 join public.companies c on c.id=s.company_id and c.status='active'
 join public.candidate_applications a on a.id=r.application_id and a.company_id=r.company_id and a.candidate_id=r.candidate_id and a.consent_status='recorded'
 where s.token_hash=extensions.digest(p_token,'sha256') and s.revoked_at is null and s.expires_at>now()
 and not exists(select 1 from public.candidate_privacy_requests q where q.company_id=r.company_id and q.candidate_id=r.candidate_id and q.request_type in('deletion','withdrawal') and q.identity_verified_at is not null and q.status<>'declined');
 return v_result;
end; $$;
revoke all on function public.create_client_report_share(uuid,integer,boolean),public.list_client_report_shares(uuid),public.revoke_client_report_share(uuid),public.read_client_report_share(text) from public,anon,authenticated;
grant execute on function public.create_client_report_share(uuid,integer,boolean),public.list_client_report_shares(uuid),public.revoke_client_report_share(uuid) to authenticated;
grant execute on function public.read_client_report_share(text) to anon,authenticated;

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
      'client_report_share_created', 'client_report_share_revoked'
    )
  );
