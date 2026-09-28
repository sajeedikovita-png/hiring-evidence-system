do $$
declare created jsonb; shared jsonb; sid uuid; token text; other_id uuid:='00000000-0000-0000-0000-000000000002';
begin
 begin
  perform public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,false);
  raise exception 'MISSING_AUTHORITY_CREATE_ALLOWED';
 exception when others then if SQLERRM<>'CANDIDATE_SHARING_AUTHORITY_REQUIRED' then raise; end if; end;
 perform public.record_candidate_sharing_authority('00000000-0000-0000-0000-000000000025','candidate_confirmation','Candidate email dated 19 September 2026','Synthetic fixture',0);
 if public.get_candidate_sharing_authority('00000000-0000-0000-0000-000000000025')#>>'{authority,authority_type}' <> 'candidate_confirmation' then raise exception 'AUTHORITY_NOT_RECORDED'; end if;
 if public.get_candidate_identity('00000000-0000-0000-0000-000000000025')->>'recorded_name' <> 'Amanda' then raise exception 'CANDIDATE_IDENTITY_NOT_LOADED'; end if;
 created:=public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,false);
 sid:=(created->>'id')::uuid; token:=created->>'token';
 if length(token)<>64 then raise exception 'TOKEN_SIZE_WRONG'; end if;
 if exists(select 1 from public.client_report_shares where token_hash=convert_to(token,'UTF8')) then raise exception 'RAW_TOKEN_PERSISTED'; end if;
 shared:=public.read_client_report_share(token);
 if shared is null or shared#>>'{summary,candidateName}'<>'Amanda' then raise exception 'SUMMARY_MISSING'; end if;
 if (shared->'summary') ? 'decision' then raise exception 'DECISION_NOT_OPT_IN'; end if;
 if shared::text ~ 'secret|private\.example|person@example|HIDDEN_INTERNAL_NOTE' then raise exception 'SENSITIVE_FIELD_LEAK'; end if;
 if shared#>>'{summary,criteria,1,evidence}' <> 'Internal evidence omitted from this summary.' then raise exception 'INTERNAL_SOURCE_LEAK'; end if;
 if public.read_client_report_share(repeat('f',64)) is not null or public.read_client_report_share('bad') is not null then raise exception 'INVALID_TOKEN_NOT_UNAVAILABLE'; end if;
 -- Snapshot does not silently change after a report edit.
 update public.evidence_items set candidate_evidence='Changed later' where source='Resume';
 if public.read_client_report_share(token)#>>'{summary,criteria,0,evidence}' <> shared#>>'{summary,criteria,0,evidence}' then raise exception 'SNAPSHOT_MUTATED'; end if;
 perform public.revoke_client_report_share(sid);
 if public.read_client_report_share(token) is not null then raise exception 'REVOKED_TOKEN_WORKS'; end if;
 perform public.record_candidate_identity('00000000-0000-0000-0000-000000000025','Avery Tan (fictional)','Checked against the fictional CV',0);
 created:=public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,true);
 sid:=(created->>'id')::uuid; token:=created->>'token';
 if public.read_client_report_share(token)#>>'{summary,candidateName}' <> 'Avery Tan (fictional)' then raise exception 'RECORDED_CANDIDATE_NAME_MISSING'; end if;
 if public.read_client_report_share(token)#>>'{summary,decision,outcome}' <> 'Hold for review' then raise exception 'OPT_IN_DECISION_MISSING'; end if;
 update public.client_report_shares set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=sid;
 if public.read_client_report_share(token) is not null then raise exception 'EXPIRED_TOKEN_WORKS'; end if;
 begin
 perform public.create_client_report_share('00000000-0000-0000-0000-000000000032',7,false);
 raise exception 'CROSS_TENANT_CREATE_ALLOWED';
 exception when others then if SQLERRM<>'REPORT_UNAVAILABLE' then raise; end if; end;
 if jsonb_array_length(public.list_client_report_shares('00000000-0000-0000-0000-000000000032'))<>0 then raise exception 'CROSS_TENANT_LIST_LEAK'; end if;
 created:=public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,false);
 token:=created->>'token';
 perform public.revoke_candidate_sharing_authority('00000000-0000-0000-0000-000000000025','Candidate withdrew sharing confirmation',1);
 if public.read_client_report_share(token) is not null then raise exception 'AUTHORITY_REVOKE_NOT_ENFORCED'; end if;
 perform public.record_candidate_sharing_authority('00000000-0000-0000-0000-000000000025','candidate_confirmation','Candidate email dated 19 September 2026','Synthetic fixture restored',2);
 if public.read_client_report_share(token) is not null then raise exception 'REVOKED_LINK_REVIVED_AFTER_NEW_AUTHORITY'; end if;
 created:=public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,false);
 token:=created->>'token';
 insert into public.candidate_privacy_requests(company_id,candidate_id,request_type,identity_verified_at,status) values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000021','withdrawal',now(),'in_review');
 if public.read_client_report_share(token) is not null then raise exception 'WITHDRAWAL_NOT_ENFORCED'; end if;
 begin
 perform public.create_client_report_share('00000000-0000-0000-0000-000000000031',7,false);
 raise exception 'WITHDRAWAL_CREATE_ALLOWED';
 exception when others then if SQLERRM<>'CANDIDATE_SHARING_RESTRICTED' then raise; end if; end;
 if has_table_privilege('anon','public.client_report_shares','SELECT') then raise exception 'ANON_TABLE_READ'; end if;
 if has_function_privilege('anon','public.create_client_report_share(uuid,integer,boolean)','EXECUTE') then raise exception 'ANON_CREATE'; end if;
end $$;
