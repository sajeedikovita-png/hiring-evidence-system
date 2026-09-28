-- Execute AFTER migrations 001+002 inside a BEGIN / ROLLBACK transaction.
-- Reads one eligible existing report without returning personal data or tokens.
-- All created shares/audit rows are rolled back by the caller.
do $$
declare fixture record; created jsonb; shared jsonb; v_id uuid; v_token text; v_found boolean:=false;
begin
 for fixture in
 select r.id as report_id,r.company_id,p.user_id
 from public.evidence_reports r
 join public.recruiter_profiles p on p.company_id=r.company_id and p.status='active'
 join public.companies c on c.id=r.company_id and c.status='active'
 join public.candidate_applications a on a.id=r.application_id and a.company_id=r.company_id and a.consent_status='recorded'
 where not exists(select 1 from public.candidate_privacy_requests q where q.company_id=r.company_id and q.candidate_id=r.candidate_id and q.request_type in('deletion','withdrawal') and q.identity_verified_at is not null and q.status<>'declined')
 order by r.created_at desc limit 50
 loop
  perform set_config('request.jwt.claim.sub',fixture.user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',fixture.user_id,'role','authenticated')::text,true);
  if not public.demo_workspace_is_writable(fixture.company_id) then continue; end if;
  if fixture.company_id not in(select public.current_company_ids()) then continue; end if;
  created:=public.create_client_report_share(fixture.report_id,1,false);
  v_id:=(created->>'id')::uuid; v_token:=created->>'token';
  shared:=public.read_client_report_share(v_token);
  if shared is null or jsonb_typeof(shared#>'{summary,criteria}')<>'array' then raise exception 'LINKED_SHARE_READ_FAILED'; end if;
  if (shared->'summary') ? 'decision' then raise exception 'LINKED_DECISION_NOT_OPT_IN'; end if;
  if (shared->'summary') ? 'recruiter_notes' or (shared->'summary') ? 'email' then raise exception 'LINKED_PRIVATE_FIELD_LEAK'; end if;
  perform public.revoke_client_report_share(v_id);
  if public.read_client_report_share(v_token) is not null then raise exception 'LINKED_REVOKE_FAILED'; end if;
  if public.read_client_report_share('invalid') is not null then raise exception 'LINKED_INVALID_TOKEN_FAILED'; end if;
  v_found:=true;
  exit;
 end loop;
 if not v_found then raise exception 'NO_ELIGIBLE_LINKED_REPORT_FOR_SMOKE_TEST'; end if;
end $$;
select 'client-share runtime create/read/revoke passed; transaction must roll back' as verification;
