-- Agency-owned records are never matched or merged with platform companies.
-- Archive preserves role context/history. Contact data is exposed only by management RPCs.
create table public.agency_client_organisations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 200),
 contact_name text not null default '' check(char_length(contact_name)<=200),
 contact_email text not null default '' check(char_length(contact_email)<=254),
 contact_phone text not null default '' check(char_length(contact_phone)<=80),
 notes text not null default '' check(char_length(notes)<=2000),
 status text not null default 'active' check(status in('active','archived')),
 version integer not null default 1 check(version>0), request_id uuid not null,
 created_by_profile_id uuid references public.recruiter_profiles(id) on delete set null, created_by_name text not null,
 updated_by_profile_id uuid references public.recruiter_profiles(id) on delete set null, updated_by_name text not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(company_id,request_id),unique(id,company_id)
);
create table public.job_client_context (
 job_id uuid primary key references public.job_roles(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid,
 version integer not null check(version>0),
 updated_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,updated_by_name text not null,
 updated_at timestamptz not null default now(),
 foreign key(client_id,company_id) references public.agency_client_organisations(id,company_id) on delete no action
);
create table public.agency_client_events (
 id uuid primary key default gen_random_uuid(),client_id uuid not null references public.agency_client_organisations(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,actor_name text not null,
 previous_state jsonb,state jsonb not null,created_at timestamptz not null default now()
);
create table public.job_client_context_events (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.job_roles(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,actor_name text not null,
 previous_state jsonb,state jsonb not null,created_at timestamptz not null default now()
);
create index agency_client_company_idx on public.agency_client_organisations(company_id,status,name);
create index agency_client_events_client_idx on public.agency_client_events(company_id,client_id,created_at);
create index job_client_context_company_idx on public.job_client_context(company_id,client_id);
create index job_client_context_events_job_idx on public.job_client_context_events(company_id,job_id,created_at);
alter table public.agency_client_organisations enable row level security;
revoke all on public.agency_client_organisations from public,anon,authenticated;
alter table public.job_client_context enable row level security;
revoke all on public.job_client_context from public,anon,authenticated;
alter table public.agency_client_events enable row level security;
revoke all on public.agency_client_events from public,anon,authenticated;
alter table public.job_client_context_events enable row level security;
revoke all on public.job_client_context_events from public,anon,authenticated;

-- Exactly one active workspace is required; never guess between company memberships.
create function public.agency_client_actor(p_management boolean default false)
returns public.recruiter_profiles language plpgsql stable security definer set search_path=public as $$
declare actor public.recruiter_profiles; count integer;
begin
 select count(*) into count from public.current_company_ids();
 if count<>1 then raise exception 'CLIENT_WORKSPACE_UNAVAILABLE' using errcode='42501'; end if;
 select * into actor from public.recruiter_profiles where user_id=auth.uid() and company_id in(select public.current_company_ids()) and status='active' and role in('admin','recruiter','hiring_manager');
 if actor.id is null or (p_management and actor.role not in('admin','recruiter')) then raise exception 'CLIENT_MANAGEMENT_REQUIRED' using errcode='42501'; end if;
 return actor;
end; $$;
revoke all on function public.agency_client_actor(boolean) from public,anon,authenticated;

create function public.validate_agency_client(p_name text,p_contact_name text,p_contact_email text,p_contact_phone text,p_notes text)
returns void language plpgsql set search_path=public as $$
begin
 if p_name is null or char_length(btrim(p_name,E' \t\n\r')) not between 1 and 200 then raise exception 'CLIENT_NAME_INVALID' using errcode='22023'; end if;
 if char_length(coalesce(p_contact_name,''))>200 or char_length(coalesce(p_contact_email,''))>254 or char_length(coalesce(p_contact_phone,''))>80 or char_length(coalesce(p_notes,''))>2000 then raise exception 'CLIENT_TEXT_TOO_LONG' using errcode='22023'; end if;
 if btrim(coalesce(p_contact_email,''))<>'' and btrim(p_contact_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'CLIENT_EMAIL_INVALID' using errcode='22023'; end if;
end; $$;
revoke all on function public.validate_agency_client(text,text,text,text,text) from public,anon,authenticated;

create function public.list_agency_clients()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(false); clients jsonb;
begin
 select coalesce(jsonb_agg(case when actor.role in('admin','recruiter') then to_jsonb(c)-'request_id' else jsonb_build_object('id',c.id,'name',c.name,'status',c.status,'version',c.version) end order by c.name,c.id),'[]'::jsonb) into clients from public.agency_client_organisations c where c.company_id=actor.company_id;
 return jsonb_build_object('clients',clients,'current_profile_id',actor.id,'can_manage',actor.role in('admin','recruiter') and public.demo_workspace_is_writable(actor.company_id) is true);
end; $$;

create function public.create_agency_client(p_name text,p_contact_name text,p_contact_email text,p_contact_phone text,p_notes text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(true); c public.agency_client_organisations; content jsonb; original jsonb; result jsonb;
begin
 if public.demo_workspace_is_writable(actor.company_id) is not true then raise exception 'CLIENT_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform public.validate_agency_client(p_name,p_contact_name,p_contact_email,p_contact_phone,p_notes);
 if p_request_id is null then raise exception 'CLIENT_REQUEST_ID_REQUIRED' using errcode='22023'; end if;
 content:=jsonb_build_object('name',btrim(p_name,E' \t\n\r'),'contact_name',btrim(coalesce(p_contact_name,''),E' \t\n\r'),'contact_email',btrim(coalesce(p_contact_email,''),E' \t\n\r'),'contact_phone',btrim(coalesce(p_contact_phone,''),E' \t\n\r'),'notes',btrim(coalesce(p_notes,''),E' \t\n\r'));
 perform pg_advisory_xact_lock(hashtext(actor.company_id::text),hashtext(p_request_id::text));
 select * into c from public.agency_client_organisations where company_id=actor.company_id and request_id=p_request_id;
 if found then
  select state into original from public.agency_client_events where client_id=c.id and previous_state is null limit 1;
  if c.created_by_profile_id is distinct from actor.id or not(original @> content) then raise exception 'CLIENT_REQUEST_CONFLICT' using errcode='22023'; end if;
  return to_jsonb(c)-'request_id';
 end if;
 insert into public.agency_client_organisations(company_id,name,contact_name,contact_email,contact_phone,notes,request_id,created_by_profile_id,created_by_name,updated_by_profile_id,updated_by_name)
 values(actor.company_id,content->>'name',content->>'contact_name',content->>'contact_email',content->>'contact_phone',content->>'notes',p_request_id,actor.id,actor.display_name,actor.id,actor.display_name) returning to_jsonb(agency_client_organisations.*)-'request_id' into result;
 insert into public.agency_client_events(client_id,company_id,actor_profile_id,actor_name,state) values((result->>'id')::uuid,actor.company_id,actor.id,actor.display_name,result);
 return result;
end; $$;

create function public.update_agency_client(p_client_id uuid,p_name text,p_contact_name text,p_contact_email text,p_contact_phone text,p_notes text,p_status text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(true); c public.agency_client_organisations; content jsonb; previous jsonb; result jsonb;
begin
 select * into c from public.agency_client_organisations where id=p_client_id and company_id=actor.company_id for update;
 if not found then raise exception 'CLIENT_UNAVAILABLE' using errcode='42501'; end if;
 if public.demo_workspace_is_writable(actor.company_id) is not true then raise exception 'CLIENT_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform public.validate_agency_client(p_name,p_contact_name,p_contact_email,p_contact_phone,p_notes);
 if p_status is null or p_status not in('active','archived') then raise exception 'CLIENT_STATUS_INVALID' using errcode='22023'; end if;
 if p_expected_version is null or p_expected_version<>c.version then raise exception 'CLIENT_VERSION_CONFLICT' using errcode='40001'; end if;
 content:=jsonb_build_object('name',btrim(p_name,E' \t\n\r'),'contact_name',btrim(coalesce(p_contact_name,''),E' \t\n\r'),'contact_email',btrim(coalesce(p_contact_email,''),E' \t\n\r'),'contact_phone',btrim(coalesce(p_contact_phone,''),E' \t\n\r'),'notes',btrim(coalesce(p_notes,''),E' \t\n\r'))||jsonb_build_object('status',p_status);
 previous:=to_jsonb(c)-'request_id';
 if previous @> content then return previous; end if;
 update public.agency_client_organisations set name=content->>'name',contact_name=content->>'contact_name',contact_email=content->>'contact_email',contact_phone=content->>'contact_phone',notes=content->>'notes',status=p_status,version=version+1,updated_by_profile_id=actor.id,updated_by_name=actor.display_name,updated_at=now() where id=c.id returning to_jsonb(agency_client_organisations.*)-'request_id' into result;
 insert into public.agency_client_events(client_id,company_id,actor_profile_id,actor_name,previous_state,state) values(c.id,actor.company_id,actor.id,actor.display_name,previous,result);
 return result;
end; $$;

create function public.get_job_client_context(p_job_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(false); j public.job_roles; context public.job_client_context; client jsonb;
begin
 select * into j from public.job_roles where id=p_job_id and company_id=actor.company_id;
 if not found then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 select * into context from public.job_client_context where job_id=j.id and company_id=actor.company_id;
 select jsonb_build_object('id',c.id,'name',c.name,'status',c.status) into client from public.agency_client_organisations c where id=context.client_id and company_id=actor.company_id;
 return jsonb_build_object('job_id',j.id,'client_id',context.client_id,'version',coalesce(context.version,0),'client',client,'can_manage',actor.role in('admin','recruiter') and public.demo_workspace_is_writable(actor.company_id) is true);
end; $$;

create function public.update_job_client_context(p_job_id uuid,p_client_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(true); j public.job_roles; context public.job_client_context; client public.agency_client_organisations; previous jsonb; result jsonb;
begin
 select * into j from public.job_roles where id=p_job_id and company_id=actor.company_id for update;
 if not found then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 if public.demo_workspace_is_writable(actor.company_id) is not true then raise exception 'CLIENT_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
 select * into context from public.job_client_context where job_id=j.id and company_id=actor.company_id;
 if p_expected_version is null or p_expected_version<>coalesce(context.version,0) then raise exception 'CLIENT_VERSION_CONFLICT' using errcode='40001'; end if;
 previous:=public.get_job_client_context(j.id)-'can_manage';
 if context.job_id is not null and context.client_id is not distinct from p_client_id then return public.get_job_client_context(j.id); end if;
 if p_client_id is not null then
  select * into client from public.agency_client_organisations where id=p_client_id and company_id=actor.company_id for share;
  if not found or client.status<>'active' then raise exception 'CLIENT_UNAVAILABLE' using errcode='42501'; end if;
 end if;
 insert into public.job_client_context(job_id,company_id,client_id,version,updated_by_profile_id,updated_by_name) values(j.id,actor.company_id,p_client_id,coalesce(context.version,0)+1,actor.id,actor.display_name)
 on conflict(job_id) do update set client_id=excluded.client_id,version=excluded.version,updated_by_profile_id=excluded.updated_by_profile_id,updated_by_name=excluded.updated_by_name,updated_at=now();
 result:=public.get_job_client_context(j.id);
 insert into public.job_client_context_events(job_id,company_id,actor_profile_id,actor_name,previous_state,state) values(j.id,actor.company_id,actor.id,actor.display_name,previous,result-'can_manage');
 return result;
end; $$;

create function public.list_agency_client_events(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(true); result jsonb;
begin
 if not exists(select 1 from public.agency_client_organisations where id=p_client_id and company_id=actor.company_id) then raise exception 'CLIENT_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]'::jsonb) into result from public.agency_client_events e where client_id=p_client_id and company_id=actor.company_id;
 return result;
end; $$;
create function public.list_job_client_context_events(p_job_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare actor public.recruiter_profiles:=public.agency_client_actor(false); result jsonb;
begin
 if not exists(select 1 from public.job_roles where id=p_job_id and company_id=actor.company_id) then raise exception 'JOB_UNAVAILABLE' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]'::jsonb) into result from public.job_client_context_events e where job_id=p_job_id and company_id=actor.company_id;
 return result;
end; $$;
revoke all on function public.list_agency_clients() from public,anon;
grant execute on function public.list_agency_clients() to authenticated;
revoke all on function public.create_agency_client(text,text,text,text,text,uuid) from public,anon;
grant execute on function public.create_agency_client(text,text,text,text,text,uuid) to authenticated;
revoke all on function public.update_agency_client(uuid,text,text,text,text,text,text,integer) from public,anon;
grant execute on function public.update_agency_client(uuid,text,text,text,text,text,text,integer) to authenticated;
revoke all on function public.get_job_client_context(uuid) from public,anon;
grant execute on function public.get_job_client_context(uuid) to authenticated;
revoke all on function public.update_job_client_context(uuid,uuid,integer) from public,anon;
grant execute on function public.update_job_client_context(uuid,uuid,integer) to authenticated;
revoke all on function public.list_agency_client_events(uuid) from public,anon;
grant execute on function public.list_agency_client_events(uuid) to authenticated;
revoke all on function public.list_job_client_context_events(uuid) from public,anon;
grant execute on function public.list_job_client_context_events(uuid) to authenticated;
