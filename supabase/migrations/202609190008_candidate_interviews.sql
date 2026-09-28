-- Internal interview preparation and follow-up. No decision or client-share writes.
create table public.candidate_interview_plans (
 application_id uuid primary key references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 planned_at timestamptz check(planned_at is null or isfinite(planned_at)),
 version integer not null check(version>0),
 updated_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 updated_by_name text not null,
 updated_at timestamptz not null default now()
);
create table public.candidate_interview_items (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 criterion_id uuid references public.job_requirements(id) on delete set null,
 criterion_snapshot jsonb not null check(jsonb_typeof(criterion_snapshot)='object'),
 question text not null check(char_length(btrim(question)) between 1 and 2000),
 candidate_answer text not null default '' check(char_length(candidate_answer)<=4000),
 reviewer_observation text not null default '' check(char_length(reviewer_observation)<=4000),
 source_reference text not null default '' check(char_length(source_reference)<=2000),
 verification_state text not null check(verification_state in('not_checked','candidate_explained','supporting_evidence_added','still_unresolved')),
 author_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 author_name text not null,
 updated_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 updated_by_name text not null,
 request_id uuid not null,
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(company_id,request_id),
 check(verification_state<>'candidate_explained' or char_length(btrim(candidate_answer))>0),
 check(verification_state<>'supporting_evidence_added' or char_length(btrim(source_reference))>0)
);
create table public.candidate_interview_item_events (
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.candidate_interview_items(id) on delete cascade,
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 actor_name text not null,
 previous_state jsonb,
 state jsonb not null,
 created_at timestamptz not null default now()
);
create table public.candidate_interview_plan_events (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.candidate_interview_plans(application_id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 actor_name text not null,
 previous_state jsonb not null,
 state jsonb not null,
 created_at timestamptz not null default now()
);
create index candidate_interview_items_application_idx on public.candidate_interview_items(company_id,application_id,created_at);
create index candidate_interview_item_events_item_idx on public.candidate_interview_item_events(company_id,item_id,created_at);
create index candidate_interview_plan_events_application_idx on public.candidate_interview_plan_events(company_id,application_id,created_at);
alter table public.candidate_interview_plans enable row level security;
create policy candidate_interview_plans_read on public.candidate_interview_plans for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_interview_plans from public,anon,authenticated;
grant select on public.candidate_interview_plans to authenticated;
alter table public.candidate_interview_items enable row level security;
create policy candidate_interview_items_read on public.candidate_interview_items for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_interview_items from public,anon,authenticated;
grant select on public.candidate_interview_items to authenticated;
alter table public.candidate_interview_item_events enable row level security;
create policy candidate_interview_item_events_read on public.candidate_interview_item_events for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_interview_item_events from public,anon,authenticated;
grant select on public.candidate_interview_item_events to authenticated;
alter table public.candidate_interview_plan_events enable row level security;
create policy candidate_interview_plan_events_read on public.candidate_interview_plan_events for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_interview_plan_events from public,anon,authenticated;
grant select on public.candidate_interview_plan_events to authenticated;

-- Validation is shared by creation and editing; inputs remain literal plain text.
create function public.validate_candidate_interview_content(p_question text,p_answer text,p_observation text,p_reference text,p_state text)
returns void language plpgsql set search_path=public as $$
begin
 if p_question is null or char_length(btrim(p_question,E' \t\n\r')) not between 1 and 2000 then raise exception 'INTERVIEW_QUESTION_INVALID' using errcode='22023'; end if;
 if char_length(coalesce(p_answer,''))>4000 or char_length(coalesce(p_observation,''))>4000 or char_length(coalesce(p_reference,''))>2000 then raise exception 'INTERVIEW_TEXT_TOO_LONG' using errcode='22023'; end if;
 if p_state is null or p_state not in('not_checked','candidate_explained','supporting_evidence_added','still_unresolved') then raise exception 'INTERVIEW_VERIFICATION_INVALID' using errcode='22023'; end if;
 if p_state='candidate_explained' and char_length(btrim(coalesce(p_answer,''),E' \t\n\r'))=0 then raise exception 'INTERVIEW_ANSWER_REQUIRED' using errcode='22023'; end if;
 if p_state='supporting_evidence_added' and char_length(btrim(coalesce(p_reference,''),E' \t\n\r'))=0 then raise exception 'INTERVIEW_SOURCE_REQUIRED' using errcode='22023'; end if;
end; $$;
revoke all on function public.validate_candidate_interview_content(text,text,text,text,text) from public,anon,authenticated;

create function public.get_candidate_interview_workspace(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a public.candidate_applications; actor uuid; plan public.candidate_interview_plans; criteria jsonb; items jsonb; history jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select id into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor is null then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into plan from public.candidate_interview_plans where application_id=a.id and company_id=a.company_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'description',r.description,'priority',r.priority) order by r.sort_order,r.id),'[]'::jsonb) into criteria from public.job_requirements r where r.job_id=a.job_id and r.company_id=a.company_id;
 select coalesce(jsonb_agg(to_jsonb(i)-'request_id' order by i.created_at,i.id),'[]'::jsonb) into items from public.candidate_interview_items i where i.application_id=a.id and i.company_id=a.company_id;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) into history from public.candidate_interview_plan_events e where e.application_id=a.id and e.company_id=a.company_id;
 return jsonb_build_object('application_id',a.id,'current_profile_id',actor,'can_edit',coalesce(public.demo_workspace_is_writable(a.company_id),false),'planned_at',plan.planned_at,'plan_version',coalesce(plan.version,0),'criteria',criteria,'items',items,'plan_events',history);
end; $$;

create function public.update_candidate_interview_plan(p_application_id uuid,p_planned_at timestamptz,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; plan public.candidate_interview_plans; previous jsonb; result jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids()) for update;
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'INTERVIEW_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if p_planned_at is not null and not isfinite(p_planned_at) then raise exception 'INTERVIEW_DATE_INVALID' using errcode='22023'; end if;
 select * into plan from public.candidate_interview_plans where application_id=a.id;
 if p_expected_version is null or p_expected_version<>coalesce(plan.version,0) then raise exception 'INTERVIEW_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=jsonb_build_object('application_id',a.id,'planned_at',plan.planned_at,'version',coalesce(plan.version,0),'updated_at',plan.updated_at);
 if plan.application_id is not null and plan.planned_at is not distinct from p_planned_at then return to_jsonb(plan); end if;
 insert into public.candidate_interview_plans(application_id,company_id,planned_at,version,updated_by_profile_id,updated_by_name) values(a.id,a.company_id,p_planned_at,coalesce(plan.version,0)+1,actor.id,actor.display_name)
 on conflict(application_id) do update set planned_at=excluded.planned_at,version=excluded.version,updated_by_profile_id=excluded.updated_by_profile_id,updated_by_name=excluded.updated_by_name,updated_at=now() returning to_jsonb(candidate_interview_plans.*) into result;
 insert into public.candidate_interview_plan_events(application_id,company_id,actor_profile_id,actor_name,previous_state,state) values(a.id,a.company_id,actor.id,actor.display_name,previous,result);
 return result;
end; $$;

create function public.create_candidate_interview_item(p_application_id uuid,p_criterion_id uuid,p_question text,p_candidate_answer text,p_reviewer_observation text,p_source_reference text,p_verification_state text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; criterion public.job_requirements; item public.candidate_interview_items; original jsonb; result jsonb; content jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'INTERVIEW_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform public.validate_candidate_interview_content(p_question,p_candidate_answer,p_reviewer_observation,p_source_reference,p_verification_state);
 if p_request_id is null then raise exception 'INTERVIEW_REQUEST_ID_REQUIRED' using errcode='22023'; end if;
 content:=jsonb_build_object('question',btrim(p_question,E' \t\n\r'),'candidate_answer',btrim(coalesce(p_candidate_answer,''),E' \t\n\r'),'reviewer_observation',btrim(coalesce(p_reviewer_observation,''),E' \t\n\r'),'source_reference',btrim(coalesce(p_source_reference,''),E' \t\n\r'),'verification_state',p_verification_state);
 perform pg_advisory_xact_lock(hashtext(a.company_id::text),hashtext(p_request_id::text));
 select * into item from public.candidate_interview_items where company_id=a.company_id and request_id=p_request_id;
 if found then
  select state into original from public.candidate_interview_item_events where item_id=item.id and previous_state is null limit 1;
  if item.application_id<>a.id or item.author_profile_id is distinct from actor.id or original->'criterion_snapshot'->>'id' is distinct from p_criterion_id::text or not(original @> content) then raise exception 'INTERVIEW_REQUEST_CONFLICT' using errcode='22023'; end if;
  return to_jsonb(item)-'request_id';
 end if;
 select * into criterion from public.job_requirements where id=p_criterion_id and job_id=a.job_id and company_id=a.company_id;
 if not found then raise exception 'INTERVIEW_CRITERION_UNAVAILABLE' using errcode='22023'; end if;
 insert into public.candidate_interview_items(application_id,company_id,criterion_id,criterion_snapshot,question,candidate_answer,reviewer_observation,source_reference,verification_state,author_profile_id,author_name,updated_by_profile_id,updated_by_name,request_id)
 values(a.id,a.company_id,criterion.id,jsonb_build_object('id',criterion.id,'label',criterion.label,'description',criterion.description,'priority',criterion.priority),content->>'question',content->>'candidate_answer',content->>'reviewer_observation',content->>'source_reference',p_verification_state,actor.id,actor.display_name,actor.id,actor.display_name,p_request_id)
 returning to_jsonb(candidate_interview_items.*)-'request_id' into result;
 insert into public.candidate_interview_item_events(item_id,application_id,company_id,actor_profile_id,actor_name,state) values((result->>'id')::uuid,a.id,a.company_id,actor.id,actor.display_name,result);
 return result;
end; $$;

create function public.update_candidate_interview_item(p_item_id uuid,p_question text,p_candidate_answer text,p_reviewer_observation text,p_source_reference text,p_verification_state text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item public.candidate_interview_items; actor public.recruiter_profiles; previous jsonb; result jsonb;
begin
 select i.* into item from public.candidate_interview_items i join public.candidate_applications a on a.id=i.application_id and a.company_id=i.company_id where i.id=p_item_id and i.company_id in(select public.current_company_ids()) for update of i;
 if not found then raise exception 'INTERVIEW_ITEM_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=item.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or public.demo_workspace_is_writable(item.company_id) is not true then raise exception 'INTERVIEW_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform public.validate_candidate_interview_content(p_question,p_candidate_answer,p_reviewer_observation,p_source_reference,p_verification_state);
 if p_expected_version is null or p_expected_version<>item.version then raise exception 'INTERVIEW_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=to_jsonb(item)-'request_id';
 if item.question=btrim(p_question,E' \t\n\r') and item.candidate_answer=btrim(coalesce(p_candidate_answer,''),E' \t\n\r') and item.reviewer_observation=btrim(coalesce(p_reviewer_observation,''),E' \t\n\r') and item.source_reference=btrim(coalesce(p_source_reference,''),E' \t\n\r') and item.verification_state=p_verification_state then return previous; end if;
 update public.candidate_interview_items set question=btrim(p_question,E' \t\n\r'),candidate_answer=btrim(coalesce(p_candidate_answer,''),E' \t\n\r'),reviewer_observation=btrim(coalesce(p_reviewer_observation,''),E' \t\n\r'),source_reference=btrim(coalesce(p_source_reference,''),E' \t\n\r'),verification_state=p_verification_state,version=version+1,updated_by_profile_id=actor.id,updated_by_name=actor.display_name,updated_at=now() where id=item.id returning to_jsonb(candidate_interview_items.*)-'request_id' into result;
 insert into public.candidate_interview_item_events(item_id,application_id,company_id,actor_profile_id,actor_name,previous_state,state) values(item.id,item.application_id,item.company_id,actor.id,actor.display_name,previous,result);
 return result;
end; $$;

create function public.list_candidate_interview_item_events(p_item_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare item public.candidate_interview_items; result jsonb;
begin
 select i.* into item from public.candidate_interview_items i join public.candidate_applications a on a.id=i.application_id and a.company_id=i.company_id where i.id=p_item_id and i.company_id in(select public.current_company_ids());
 if not found then raise exception 'INTERVIEW_ITEM_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) into result from public.candidate_interview_item_events e where e.item_id=item.id and e.company_id=item.company_id;
 return result;
end; $$;
revoke all on function public.get_candidate_interview_workspace(uuid) from public,anon;
grant execute on function public.get_candidate_interview_workspace(uuid) to authenticated;
revoke all on function public.update_candidate_interview_plan(uuid,timestamptz,integer) from public,anon;
grant execute on function public.update_candidate_interview_plan(uuid,timestamptz,integer) to authenticated;
revoke all on function public.create_candidate_interview_item(uuid,uuid,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.create_candidate_interview_item(uuid,uuid,text,text,text,text,text,uuid) to authenticated;
revoke all on function public.update_candidate_interview_item(uuid,text,text,text,text,text,integer) from public,anon;
grant execute on function public.update_candidate_interview_item(uuid,text,text,text,text,text,integer) to authenticated;
revoke all on function public.list_candidate_interview_item_events(uuid) from public,anon;
grant execute on function public.list_candidate_interview_item_events(uuid) to authenticated;
