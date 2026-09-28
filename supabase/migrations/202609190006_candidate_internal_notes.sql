-- Private, attributed notes; never implicitly added to evidence or client shares.
create table public.candidate_internal_notes (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 kind text not null check(kind in('candidate_statement','reviewer_observation','verification_record')),
 body text not null check(body=btrim(body,E' \t\n\r') and char_length(body) between 1 and 4000),
 author_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 author_name text not null,
 request_id uuid not null,
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(company_id,request_id)
);
create table public.candidate_internal_note_events (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references public.candidate_internal_notes(id) on delete cascade,
 application_id uuid not null references public.candidate_applications(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
 actor_name text not null,
 previous_state jsonb,
 state jsonb not null,
 created_at timestamptz not null default now()
);
create index candidate_internal_notes_application_idx on public.candidate_internal_notes(company_id,application_id,created_at);
create index candidate_internal_note_events_note_idx on public.candidate_internal_note_events(company_id,note_id,created_at);
alter table public.candidate_internal_notes enable row level security;
alter table public.candidate_internal_note_events enable row level security;
create policy candidate_internal_notes_read on public.candidate_internal_notes for select to authenticated using(company_id in(select public.current_company_ids()));
create policy candidate_internal_note_events_read on public.candidate_internal_note_events for select to authenticated using(company_id in(select public.current_company_ids()));
revoke all on public.candidate_internal_notes,public.candidate_internal_note_events from public,anon,authenticated;
grant select on public.candidate_internal_notes,public.candidate_internal_note_events to authenticated;

create function public.list_candidate_internal_notes(p_application_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a public.candidate_applications; actor uuid; notes jsonb;
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select id into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor is null then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(n)-'request_id' order by n.created_at,n.id),'[]'::jsonb) into notes from public.candidate_internal_notes n where n.application_id=a.id and n.company_id=a.company_id;
 return jsonb_build_object('notes',notes,'current_profile_id',actor,'can_create',coalesce(public.demo_workspace_is_writable(a.company_id),false));
end; $$;

create function public.create_candidate_internal_note(p_application_id uuid,p_kind text,p_body text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.candidate_applications; actor public.recruiter_profiles; n public.candidate_internal_notes; first_state jsonb; result jsonb; content text:=btrim(p_body,E' \t\n\r');
begin
 select * into a from public.candidate_applications where id=p_application_id and company_id in(select public.current_company_ids());
 if not found then raise exception 'APPLICATION_UNAVAILABLE' using errcode='42501'; end if;
 if public.demo_workspace_is_writable(a.company_id) is not true then raise exception 'NOTE_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=a.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null then raise exception 'NOTE_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 if p_kind is null or p_kind not in('candidate_statement','reviewer_observation','verification_record') then raise exception 'NOTE_KIND_INVALID' using errcode='22023'; end if;
 if content is null or char_length(content) not between 1 and 4000 then raise exception 'NOTE_BODY_INVALID' using errcode='22023'; end if;
 if p_request_id is null then raise exception 'NOTE_REQUEST_ID_REQUIRED' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtext(a.company_id::text),hashtext(p_request_id::text));
 select * into n from public.candidate_internal_notes where company_id=a.company_id and request_id=p_request_id;
 if found then
  select state into first_state from public.candidate_internal_note_events where note_id=n.id and previous_state is null limit 1;
  if n.application_id<>a.id or n.author_profile_id is distinct from actor.id or first_state->>'kind' is distinct from p_kind or first_state->>'body' is distinct from content then raise exception 'NOTE_REQUEST_CONFLICT' using errcode='22023'; end if;
  return to_jsonb(n)-'request_id';
 end if;
 insert into public.candidate_internal_notes(application_id,company_id,kind,body,author_profile_id,author_name,request_id) values(a.id,a.company_id,p_kind,content,actor.id,actor.display_name,p_request_id) returning * into n;
 result:=to_jsonb(n)-'request_id';
 insert into public.candidate_internal_note_events(note_id,application_id,company_id,actor_profile_id,actor_name,state) values(n.id,a.id,a.company_id,actor.id,actor.display_name,result);
 return result;
end; $$;

create function public.update_candidate_internal_note(p_note_id uuid,p_kind text,p_body text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare n public.candidate_internal_notes; actor public.recruiter_profiles; previous jsonb; result jsonb; content text:=btrim(p_body,E' \t\n\r');
begin
 select n1.* into n from public.candidate_internal_notes n1 join public.candidate_applications a on a.id=n1.application_id and a.company_id=n1.company_id where n1.id=p_note_id and n1.company_id in(select public.current_company_ids()) for update of n1;
 if not found then raise exception 'NOTE_UNAVAILABLE' using errcode='42501'; end if;
 if public.demo_workspace_is_writable(n.company_id) is not true then raise exception 'NOTE_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where company_id=n.company_id and user_id=auth.uid() and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or n.author_profile_id is distinct from actor.id then raise exception 'NOTE_AUTHOR_REQUIRED' using errcode='42501'; end if;
 if p_kind is null or p_kind not in('candidate_statement','reviewer_observation','verification_record') then raise exception 'NOTE_KIND_INVALID' using errcode='22023'; end if;
 if content is null or char_length(content) not between 1 and 4000 then raise exception 'NOTE_BODY_INVALID' using errcode='22023'; end if;
 if p_expected_version is null or p_expected_version<>n.version then raise exception 'NOTE_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=to_jsonb(n)-'request_id';
 if n.kind=p_kind and n.body=content then return previous; end if;
 update public.candidate_internal_notes set kind=p_kind,body=content,version=version+1,updated_at=now() where id=n.id returning to_jsonb(candidate_internal_notes.*)-'request_id' into result;
 insert into public.candidate_internal_note_events(note_id,application_id,company_id,actor_profile_id,actor_name,previous_state,state) values(n.id,n.application_id,n.company_id,actor.id,actor.display_name,previous,result);
 return result;
end; $$;

create function public.list_candidate_internal_note_events(p_note_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare n public.candidate_internal_notes; result jsonb;
begin
 select n1.* into n from public.candidate_internal_notes n1 join public.candidate_applications a on a.id=n1.application_id and a.company_id=n1.company_id where n1.id=p_note_id and n1.company_id in(select public.current_company_ids());
 if not found then raise exception 'NOTE_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) into result from public.candidate_internal_note_events e where e.note_id=n.id and e.company_id=n.company_id;
 return result;
end; $$;
revoke all on function public.list_candidate_internal_notes(uuid),public.create_candidate_internal_note(uuid,text,text,uuid),public.update_candidate_internal_note(uuid,text,text,integer),public.list_candidate_internal_note_events(uuid) from public,anon;
grant execute on function public.list_candidate_internal_notes(uuid),public.create_candidate_internal_note(uuid,text,text,uuid),public.update_candidate_internal_note(uuid,text,text,integer),public.list_candidate_internal_note_events(uuid) to authenticated;
