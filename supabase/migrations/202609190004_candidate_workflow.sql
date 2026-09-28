-- Recruiter workflow is independent of processing status and hiring decisions.
create table public.candidate_workflows (
 application_id uuid primary key references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 stage text not null default 'new' check(stage in ('new','evidence_review','interview','client_review','closed')),
 assigned_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 next_action text not null default '' check(char_length(next_action)<=500),
 due_at timestamptz,
 version integer not null check(version>0),
 updated_at timestamptz not null default now()
);
create table public.candidate_workflow_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 actor_name text not null,
 previous_state jsonb not null,
 state jsonb not null,
 created_at timestamptz not null default now()
);
create index candidate_workflows_company_idx on public.candidate_workflows(company_id);
create index candidate_workflow_events_application_idx on public.candidate_workflow_events(application_id,created_at desc);
alter table public.candidate_workflows enable row level security;
alter table public.candidate_workflow_events enable row level security;
create policy candidate_workflows_read on public.candidate_workflows for select to authenticated using(company_id in(select public.current_company_ids()));
create policy candidate_workflow_events_read on public.candidate_workflow_events for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_workflows,public.candidate_workflow_events from public,anon,authenticated;
grant select on public.candidate_workflows,public.candidate_workflow_events to authenticated;

create function public.update_candidate_workflow(p_application_id uuid,p_stage text,p_assigned_profile_id uuid,p_next_action text,p_due_at timestamptz,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; w public.candidate_workflows; previous jsonb; result jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'WORKFLOW_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if p_stage is null or p_stage not in('new','evidence_review','interview','client_review','closed') then raise exception 'WORKFLOW_STAGE_INVALID' using errcode='22023'; end if;
 if char_length(coalesce(p_next_action,''))>500 then raise exception 'WORKFLOW_NEXT_ACTION_TOO_LONG' using errcode='22023'; end if;
 if p_due_at is not null and not isfinite(p_due_at) then raise exception 'WORKFLOW_DUE_AT_INVALID' using errcode='22023'; end if;
 if p_assigned_profile_id is not null and not exists(select 1 from public.recruiter_profiles where id=p_assigned_profile_id and company_id=a.company_id and status='active') then raise exception 'WORKFLOW_ASSIGNEE_INVALID' using errcode='22023'; end if;
 select * into w from public.candidate_workflows where application_id=a.id;
 if p_expected_version is null or p_expected_version<>coalesce(w.version,0) then raise exception 'WORKFLOW_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=jsonb_build_object('application_id',a.id,'company_id',a.company_id,'updated_at',w.updated_at,'stage',coalesce(w.stage,'new'),'assigned_profile_id',w.assigned_profile_id,'next_action',coalesce(w.next_action,''),'due_at',w.due_at,'version',coalesce(w.version,0));
 if w.application_id is not null and w.stage=p_stage and w.assigned_profile_id is not distinct from p_assigned_profile_id and w.next_action=trim(coalesce(p_next_action,'')) and w.due_at is not distinct from p_due_at then return to_jsonb(w); end if;
 insert into public.candidate_workflows(application_id,company_id,stage,assigned_profile_id,next_action,due_at,version)
 values(a.id,a.company_id,p_stage,p_assigned_profile_id,trim(coalesce(p_next_action,'')),p_due_at,coalesce(w.version,0)+1)
 on conflict(application_id) do update set stage=excluded.stage,assigned_profile_id=excluded.assigned_profile_id,next_action=excluded.next_action,due_at=excluded.due_at,version=excluded.version,updated_at=now()
 returning to_jsonb(candidate_workflows.*) into result;
 insert into public.candidate_workflow_events(company_id,application_id,actor_profile_id,actor_name,previous_state,state)
 values(a.company_id,a.id,actor.id,actor.display_name,previous,result);
 return result;
end; $$;

create function public.list_candidate_workflows(p_job_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare j public.job_roles; actor public.recruiter_profiles; workflows jsonb; reviewers jsonb;
begin
 select * into j from public.job_roles where id=p_job_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=j.company_id and user_id=auth.uid() and status='active';
 if actor.id is null then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('application_id',a.id,'company_id',a.company_id,'stage',coalesce(w.stage,'new'),'assigned_profile_id',w.assigned_profile_id,'next_action',coalesce(w.next_action,''),'due_at',w.due_at,'version',coalesce(w.version,0),'updated_at',w.updated_at) order by a.created_at,a.id),'[]'::jsonb) into workflows from public.candidate_applications a left join public.candidate_workflows w on w.application_id=a.id and w.company_id=a.company_id where a.job_id=j.id and a.company_id=j.company_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',display_name,'is_active',status='active') order by display_name,id),'[]'::jsonb) into reviewers from public.recruiter_profiles where company_id=j.company_id;
 return jsonb_build_object('workflows',workflows,'reviewers',reviewers,'current_profile_id',actor.id,'can_edit',coalesce(public.demo_workspace_is_writable(j.company_id),false));
end; $$;

create function public.list_candidate_workflow_events(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a public.candidate_applications; result jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id),'[]'::jsonb) into result from public.candidate_workflow_events e where e.application_id=a.id and e.company_id=a.company_id;
 return result;
end; $$;
revoke all on function public.update_candidate_workflow(uuid,text,uuid,text,timestamptz,integer),public.list_candidate_workflows(uuid),public.list_candidate_workflow_events(uuid) from public,anon;
grant execute on function public.update_candidate_workflow(uuid,text,uuid,text,timestamptz,integer),public.list_candidate_workflows(uuid),public.list_candidate_workflow_events(uuid) to authenticated;
