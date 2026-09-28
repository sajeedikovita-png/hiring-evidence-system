-- Human-recorded candidate identity for consistent private and client summaries.
alter table public.candidates add column name_version integer not null default 0 check(name_version>=0);
alter table public.candidates add column name_confirmed_at timestamptz;
alter table public.candidates add column name_confirmed_by_profile_id uuid references public.recruiter_profiles(id) on delete set null;

create table public.candidate_name_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 candidate_id uuid not null references public.candidates(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 actor_name text not null,
 previous_name text not null,
 recorded_name text not null,
 reason text not null,
 version integer not null check(version>0),
 created_at timestamptz not null default now()
);
create index candidate_name_events_application_idx on public.candidate_name_events(company_id,application_id,created_at desc);
alter table public.candidate_name_events enable row level security;
revoke all on public.candidate_name_events from public,anon,authenticated;
grant select on public.candidate_name_events to authenticated;
create policy candidate_name_events_read on public.candidate_name_events for select to authenticated using(company_id in(select public.current_company_ids()));

create function public.get_candidate_identity(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a public.candidate_applications; c public.candidates; actor public.recruiter_profiles; events jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active';
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into c from public.candidates where id=a.candidate_id and company_id=a.company_id;
 if not found then raise exception 'CANDIDATE_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'actor_name',e.actor_name,'previous_name',e.previous_name,'recorded_name',e.recorded_name,'reason',e.reason,'version',e.version,'created_at',e.created_at) order by e.created_at desc,e.id desc),'[]'::jsonb) into events from public.candidate_name_events e where e.company_id=a.company_id and e.application_id=a.id and e.candidate_id=c.id;
 return jsonb_build_object('candidate_id',c.id,'application_id',a.id,'recorded_name',case when c.name='Candidate pending name detection' then '' else c.name end,'version',c.name_version,'confirmed_at',c.name_confirmed_at,'events',events,'can_edit',actor.role in('admin','recruiter','hiring_manager') and coalesce(public.demo_workspace_is_writable(a.company_id),false));
end $$;

create function public.record_candidate_identity(p_application_id uuid,p_recorded_name text,p_reason text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; c public.candidates; actor public.recruiter_profiles; next_name text; next_reason text; previous_name text;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if not found or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'CANDIDATE_IDENTITY_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 next_name:=btrim(coalesce(p_recorded_name,'')); next_reason:=btrim(coalesce(p_reason,''));
 if char_length(next_name) not between 2 and 200 or next_name='Candidate pending name detection' or next_name ~ '[[:cntrl:]]' then raise exception 'CANDIDATE_NAME_INVALID' using errcode='22023'; end if;
 if char_length(next_reason) not between 10 and 1000 or next_reason ~ '[[:cntrl:]]' then raise exception 'CANDIDATE_NAME_REASON_REQUIRED' using errcode='22023'; end if;
 select * into c from public.candidates where id=a.candidate_id and company_id=a.company_id for update;
 if not found then raise exception 'CANDIDATE_UNAVAILABLE' using errcode='42501'; end if;
 if p_expected_version is null or p_expected_version<>c.name_version then raise exception 'CANDIDATE_NAME_VERSION_CONFLICT' using errcode='40001'; end if;
 previous_name:=c.name;
 update public.candidates set name=next_name,name_version=name_version+1,name_confirmed_at=now(),name_confirmed_by_profile_id=actor.id,updated_at=now() where id=c.id returning * into c;
 insert into public.candidate_name_events(company_id,application_id,candidate_id,actor_profile_id,actor_name,previous_name,recorded_name,reason,version) values(a.company_id,a.id,c.id,actor.id,actor.display_name,previous_name,c.name,next_reason,c.name_version);
 return jsonb_build_object('candidate_id',c.id,'application_id',a.id,'recorded_name',c.name,'version',c.name_version,'confirmed_at',c.name_confirmed_at);
end $$;

revoke all on function public.get_candidate_identity(uuid),public.record_candidate_identity(uuid,text,text,integer) from public,anon;
grant execute on function public.get_candidate_identity(uuid),public.record_candidate_identity(uuid,text,text,integer) to authenticated;

-- Resolve the same privacy-safe candidate label for server-created snapshots.
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
 if not exists(select 1 from public.candidate_sharing_authorities a where a.application_id=r.application_id and a.company_id=r.company_id and a.revoked_at is null) then raise exception 'CANDIDATE_SHARING_AUTHORITY_REQUIRED'; end if;
 if exists(select 1 from public.candidate_privacy_requests q where q.company_id=r.company_id and q.candidate_id=r.candidate_id and q.request_type in('deletion','withdrawal') and q.identity_verified_at is not null and q.status<>'declined') then raise exception 'CANDIDATE_SHARING_RESTRICTED'; end if;
 perform pg_advisory_xact_lock(hashtext(r.id::text));
 if (select count(*) from public.client_report_shares where report_id=r.id and revoked_at is null and expires_at>now())>=5 then raise exception 'ACTIVE_SHARE_LIMIT'; end if;
 select case when btrim(c.name)<>'' and c.name<>'Candidate pending name detection' then c.name else coalesce((select nullif(btrim(pcv.extracted_name),'') from public.parsed_cvs pcv where pcv.company_id=r.company_id and pcv.application_id=r.application_id order by pcv.created_at desc,pcv.id desc limit 1),'Name not recorded') end into v_candidate_name from public.candidates c where c.id=r.candidate_id and c.company_id=r.company_id;
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
