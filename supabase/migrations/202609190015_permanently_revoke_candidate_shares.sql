-- Revoking candidate sharing authority permanently revokes every active link.
-- A later authority record must never revive an earlier bearer URL.
create or replace function public.revoke_candidate_sharing_authority(p_application_id uuid,p_reason text,p_expected_version integer)
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
 insert into public.candidate_sharing_authority_events(company_id,authority_id,actor_profile_id,actor_name,action,reason,state)
 values(a.company_id,result.id,actor.id,actor.display_name,'revoked',btrim(p_reason),to_jsonb(result)-'company_id'-'recorded_by_profile_id');
 with revoked as (
  update public.client_report_shares s set revoked_at=now()
  from public.evidence_reports r
  where s.report_id=r.id and s.company_id=a.company_id and r.company_id=a.company_id and r.application_id=a.id and s.revoked_at is null
  returning s.id,s.report_id
 )
 insert into public.audit_log_entries(company_id,actor_profile_id,entity_type,entity_id,action,metadata)
 select a.company_id,actor.id,'client_report_share',revoked.id,'client_report_share_revoked',jsonb_build_object('report_id',revoked.report_id,'reason','candidate_sharing_authority_revoked') from revoked;
 return to_jsonb(result)-'company_id'-'recorded_by_profile_id';
end $$;
