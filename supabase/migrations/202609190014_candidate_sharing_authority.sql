-- Audited authority to disclose a candidate summary. Upload authority is separate.
create table public.candidate_sharing_authorities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 authority_type text not null check(authority_type in ('candidate_confirmation','documented_recruitment_process','other_documented_authority')),
 source_reference text not null check(char_length(btrim(source_reference)) between 10 and 1000),
 note text not null default '' check(char_length(note)<=2000),
 recorded_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 recorded_by_name text not null,
 version integer not null check(version>0),
 recorded_at timestamptz not null default now(),
 revoked_at timestamptz,
 unique(company_id,application_id)
);
create table public.candidate_sharing_authority_events (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 authority_id uuid not null references public.candidate_sharing_authorities(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null, actor_name text not null,
 action text not null check(action in('recorded','updated','revoked')), reason text not null default '', state jsonb not null,
 created_at timestamptz not null default now()
);
create index candidate_sharing_authority_events_idx on public.candidate_sharing_authority_events(company_id,authority_id,created_at);
alter table public.candidate_sharing_authorities enable row level security;
alter table public.candidate_sharing_authority_events enable row level security;
revoke all on public.candidate_sharing_authorities,public.candidate_sharing_authority_events from public,anon,authenticated;
grant select on public.candidate_sharing_authorities,public.candidate_sharing_authority_events to authenticated;
create policy candidate_sharing_authorities_read on public.candidate_sharing_authorities for select to authenticated using(company_id in(select public.current_company_ids()));
create policy candidate_sharing_authority_events_read on public.candidate_sharing_authority_events for select to authenticated using(company_id in(select public.current_company_ids()));

create function public.get_candidate_sharing_authority(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; authority public.candidate_sharing_authorities; events jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active';
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into authority from public.candidate_sharing_authorities where company_id=a.company_id and application_id=a.id;
 if authority.id is null then return jsonb_build_object('authority',null,'events','[]'::jsonb,'can_edit',coalesce(public.demo_workspace_is_writable(a.company_id),false)); end if;
 select coalesce(jsonb_agg(to_jsonb(e)-'company_id'-'actor_profile_id' order by e.created_at desc,e.id desc),'[]'::jsonb) into events from public.candidate_sharing_authority_events e where e.authority_id=authority.id and e.company_id=a.company_id;
 return jsonb_build_object('authority',to_jsonb(authority)-'company_id'-'recorded_by_profile_id','events',events,'can_edit',coalesce(public.demo_workspace_is_writable(a.company_id),false));
end $$;

create function public.record_candidate_sharing_authority(p_application_id uuid,p_authority_type text,p_source_reference text,p_note text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; current public.candidate_sharing_authorities; result public.candidate_sharing_authorities; previous jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if not found or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'SHARING_AUTHORITY_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if p_authority_type not in('candidate_confirmation','documented_recruitment_process','other_documented_authority') or char_length(btrim(coalesce(p_source_reference,''))) not between 10 and 1000 or char_length(coalesce(p_note,''))>2000 then raise exception 'SHARING_AUTHORITY_INVALID' using errcode='22023'; end if;
 select * into current from public.candidate_sharing_authorities where company_id=a.company_id and application_id=a.id for update;
 if p_expected_version is null or p_expected_version<>coalesce(current.version,0) then raise exception 'SHARING_AUTHORITY_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=case when current.id is null then null else to_jsonb(current)-'company_id'-'recorded_by_profile_id' end;
 insert into public.candidate_sharing_authorities(company_id,application_id,authority_type,source_reference,note,recorded_by_profile_id,recorded_by_name,version,recorded_at,revoked_at)
 values(a.company_id,a.id,p_authority_type,btrim(p_source_reference),btrim(coalesce(p_note,'')),actor.id,actor.display_name,coalesce(current.version,0)+1,now(),null)
 on conflict(company_id,application_id) do update set authority_type=excluded.authority_type,source_reference=excluded.source_reference,note=excluded.note,recorded_by_profile_id=excluded.recorded_by_profile_id,recorded_by_name=excluded.recorded_by_name,version=excluded.version,recorded_at=now(),revoked_at=null returning * into result;
 insert into public.candidate_sharing_authority_events(company_id,authority_id,actor_profile_id,actor_name,action,state) values(a.company_id,result.id,actor.id,actor.display_name,case when previous is null then 'recorded' else 'updated' end,to_jsonb(result)-'company_id'-'recorded_by_profile_id');
 return to_jsonb(result)-'company_id'-'recorded_by_profile_id';
end $$;

create function public.revoke_candidate_sharing_authority(p_application_id uuid,p_reason text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; current public.candidate_sharing_authorities; result public.candidate_sharing_authorities;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if not found or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'SHARING_AUTHORITY_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'SHARING_AUTHORITY_REVOKE_REASON_REQUIRED' using errcode='22023'; end if;
 select * into current from public.candidate_sharing_authorities where company_id=a.company_id and application_id=a.id for update;
 if current.id is null then raise exception 'SHARING_AUTHORITY_UNAVAILABLE' using errcode='22023'; end if;
 if p_expected_version is null or p_expected_version<>current.version then raise exception 'SHARING_AUTHORITY_VERSION_CONFLICT' using errcode='40001'; end if;
 update public.candidate_sharing_authorities set revoked_at=now(),version=version+1 where id=current.id returning * into result;
 insert into public.candidate_sharing_authority_events(company_id,authority_id,actor_profile_id,actor_name,action,reason,state) values(a.company_id,result.id,actor.id,actor.display_name,'revoked',btrim(p_reason),to_jsonb(result)-'company_id'-'recorded_by_profile_id');
 return to_jsonb(result)-'company_id'-'recorded_by_profile_id';
end $$;
revoke all on function public.get_candidate_sharing_authority(uuid),public.record_candidate_sharing_authority(uuid,text,text,text,integer),public.revoke_candidate_sharing_authority(uuid,text,integer) from public,anon;
grant execute on function public.get_candidate_sharing_authority(uuid),public.record_candidate_sharing_authority(uuid,text,text,text,integer),public.revoke_candidate_sharing_authority(uuid,text,integer) to authenticated;

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

create or replace function public.read_client_report_share(p_token text) returns jsonb language plpgsql stable security definer set search_path=public,extensions as $$
declare v_result jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select jsonb_build_object('summary',s.summary,'expiresAt',s.expires_at) into v_result
 from public.client_report_shares s join public.evidence_reports r on r.id=s.report_id and r.company_id=s.company_id
 join public.companies c on c.id=s.company_id and c.status='active'
 join public.candidate_applications a on a.id=r.application_id and a.company_id=r.company_id and a.candidate_id=r.candidate_id
 join public.candidate_sharing_authorities ca on ca.application_id=a.id and ca.company_id=a.company_id and ca.revoked_at is null
 where s.token_hash=extensions.digest(p_token,'sha256') and s.revoked_at is null and s.expires_at>now()
 and not exists(select 1 from public.candidate_privacy_requests q where q.company_id=r.company_id and q.candidate_id=r.candidate_id and q.request_type in('deletion','withdrawal') and q.identity_verified_at is not null and q.status<>'declined');
 return v_result;
end $$;
