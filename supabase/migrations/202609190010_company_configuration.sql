-- Company configuration, platform-controlled feature packages, and bespoke work requests.
-- Existing hiring records are never rewritten by configuration changes.

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  display_name text not null,
  logo_url text,
  accent_color text not null,
  stage_labels jsonb not null,
  custom_fields jsonb not null default '[]'::jsonb,
  review_defaults jsonb not null,
  report_branding jsonb not null,
  active_review_template_id uuid,
  active_report_template_id uuid,
  version integer not null check (version > 0),
  updated_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  updated_by_name text not null,
  updated_at timestamptz not null default now()
);

create table public.company_settings_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  actor_name text not null,
  previous_state jsonb,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create table public.company_template_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_kind text not null check (template_kind in ('review','report')),
  template_name text not null check (char_length(btrim(template_name)) between 1 and 80),
  version integer not null check (version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, template_kind, template_name, version)
);

alter table public.company_settings
  add constraint company_settings_review_template_fk foreign key (active_review_template_id) references public.company_template_versions(id) on delete set null,
  add constraint company_settings_report_template_fk foreign key (active_report_template_id) references public.company_template_versions(id) on delete set null;

create table public.company_feature_entitlements (
  company_id uuid not null references public.companies(id) on delete cascade,
  feature_key text not null check (feature_key in ('custom_branding','custom_stage_labels','custom_review_templates','bespoke_extensions')),
  enabled boolean not null,
  reason text not null check (char_length(btrim(reason)) between 12 and 1000),
  starts_at timestamptz,
  ends_at timestamptz,
  configured_by_platform_user_id uuid,
  configured_by_name text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, feature_key),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.company_feature_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  feature_key text not null,
  platform_user_id uuid,
  platform_name text not null,
  previous_state jsonb,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create table public.custom_work_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  requested_by_name text not null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  problem text not null check (char_length(btrim(problem)) between 20 and 3000),
  desired_outcome text not null check (char_length(btrim(desired_outcome)) between 20 and 3000),
  data_impact text not null default '' check (char_length(data_impact) <= 2000),
  stage text not null default 'request' check (stage in ('request','clarification','feasibility','scope_quote','preview','acceptance','enabled','maintenance','closed')),
  request_id uuid not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, request_id)
);

create table public.custom_work_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_work_requests(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_kind text not null check (actor_kind in ('company','platform')),
  actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  actor_user_id uuid,
  actor_name text not null,
  note text not null check (char_length(btrim(note)) between 1 and 3000),
  previous_stage text,
  stage text not null,
  created_at timestamptz not null default now()
);

create index company_settings_events_company_idx on public.company_settings_events(company_id, created_at);
create index company_template_versions_company_idx on public.company_template_versions(company_id, template_kind, template_name, version);
create index company_feature_events_company_idx on public.company_feature_entitlement_events(company_id, feature_key, created_at);
create index custom_work_requests_company_idx on public.custom_work_requests(company_id, updated_at);
create index custom_work_request_events_request_idx on public.custom_work_request_events(company_id, request_id, created_at);

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'company_settings','company_settings_events','company_template_versions',
    'company_feature_entitlements','company_feature_entitlement_events',
    'custom_work_requests','custom_work_request_events'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated', v_table);
    execute format('grant select on public.%I to authenticated', v_table);
    execute format('create policy %I on public.%I for select to authenticated using (company_id in (select public.current_company_ids()))', v_table || '_company_read', v_table);
  end loop;
end $$;

create function public.default_company_stage_labels()
returns jsonb language sql immutable set search_path=public as $$
  select '[{"key":"new","label":"New"},{"key":"evidence_review","label":"Evidence review"},{"key":"interview","label":"Interview"},{"key":"client_review","label":"Client review"},{"key":"closed","label":"Closed"}]'::jsonb
$$;

create function public.default_company_configuration(p_company_name text)
returns jsonb language sql immutable set search_path=public as $$
  select jsonb_build_object(
    'display_name', coalesce(nullif(btrim(p_company_name),''),'Company workspace'),
    'logo_url', null,
    'accent_color', '#28543f',
    'stage_labels', public.default_company_stage_labels(),
    'custom_fields', '[]'::jsonb,
    'review_defaults', jsonb_build_object('heading','Evidence review','instructions','Review job-related evidence and record what still needs verification.'),
    'report_branding', jsonb_build_object('heading','Candidate evidence summary','footer','AI assists. Human decides. Evidence explains.'),
    'active_review_template_id', null,
    'active_report_template_id', null,
    'version', 0,
    'updated_by_name', null,
    'updated_at', null
  )
$$;

create function public.company_configuration_actor(p_admin_only boolean default false)
returns public.recruiter_profiles language plpgsql stable security definer set search_path=public as $$
declare v_actor public.recruiter_profiles;
begin
  select p.* into v_actor
  from public.recruiter_profiles p join public.companies c on c.id=p.company_id
  where p.user_id=auth.uid() and p.status='active' and c.status='active'
    and p.role in ('admin','recruiter','hiring_manager');
  if v_actor.id is null or (p_admin_only and v_actor.role<>'admin') then
    raise exception 'COMPANY_CONFIGURATION_ADMIN_REQUIRED' using errcode='42501';
  end if;
  return v_actor;
end $$;
revoke all on function public.company_configuration_actor(boolean) from public,anon,authenticated;

create function public.validate_company_configuration_payload(p_company_id uuid,p_payload jsonb)
returns void language plpgsql stable security definer set search_path=public as $$
declare v_stages jsonb; v_fields jsonb; v_review jsonb; v_report jsonb; v_logo text; v_accent text;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'COMPANY_CONFIGURATION_INVALID' using errcode='22023'; end if;
  if char_length(btrim(coalesce(p_payload->>'display_name',''))) not between 2 and 100 then raise exception 'COMPANY_DISPLAY_NAME_INVALID' using errcode='22023'; end if;
  v_logo:=nullif(btrim(coalesce(p_payload->>'logo_url','')),'');
  if v_logo is not null and (char_length(v_logo)>500 or v_logo !~ '^https://') then raise exception 'COMPANY_LOGO_URL_INVALID' using errcode='22023'; end if;
  v_accent:=coalesce(p_payload->>'accent_color','');
  if v_accent not in ('#28543f','#234f48','#59406f','#7a3b2e','#6b4f16','#324d6b') then raise exception 'COMPANY_ACCENT_INVALID' using errcode='22023'; end if;
  v_stages:=p_payload->'stage_labels';
  if jsonb_typeof(v_stages)<>'array' or jsonb_array_length(v_stages)<>5 then raise exception 'COMPANY_STAGE_LABELS_INVALID' using errcode='22023'; end if;
  if (select count(distinct e->>'key') from jsonb_array_elements(v_stages)e where e->>'key' in('new','evidence_review','interview','client_review','closed') and char_length(btrim(coalesce(e->>'label',''))) between 1 and 40)<>5 then raise exception 'COMPANY_STAGE_LABELS_INVALID' using errcode='22023'; end if;
  v_fields:=coalesce(p_payload->'custom_fields','[]'::jsonb);
  if jsonb_typeof(v_fields)<>'array' or jsonb_array_length(v_fields)>5 then raise exception 'COMPANY_CUSTOM_FIELDS_INVALID' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(v_fields)e where coalesce(e->>'key','') !~ '^[a-z][a-z0-9_]{1,29}$' or char_length(btrim(coalesce(e->>'label',''))) not between 1 and 60 or char_length(coalesce(e->>'help_text',''))>240 or coalesce((e->>'max_length')::integer,0) not between 1 and 2000) then raise exception 'COMPANY_CUSTOM_FIELDS_INVALID' using errcode='22023'; end if;
  if (select count(distinct e->>'key') from jsonb_array_elements(v_fields)e)<>jsonb_array_length(v_fields) then raise exception 'COMPANY_CUSTOM_FIELDS_INVALID' using errcode='22023'; end if;
  v_review:=p_payload->'review_defaults'; v_report:=p_payload->'report_branding';
  if jsonb_typeof(v_review)<>'object' or char_length(btrim(coalesce(v_review->>'heading',''))) not between 1 and 100 or char_length(coalesce(v_review->>'instructions',''))>2000 then raise exception 'COMPANY_REVIEW_DEFAULTS_INVALID' using errcode='22023'; end if;
  if jsonb_typeof(v_report)<>'object' or char_length(btrim(coalesce(v_report->>'heading',''))) not between 1 and 100 or char_length(coalesce(v_report->>'footer',''))>500 then raise exception 'COMPANY_REPORT_BRANDING_INVALID' using errcode='22023'; end if;
  if nullif(p_payload->>'active_review_template_id','') is not null and not exists(select 1 from public.company_template_versions where id=(p_payload->>'active_review_template_id')::uuid and company_id=p_company_id and template_kind='review') then raise exception 'COMPANY_TEMPLATE_UNAVAILABLE' using errcode='22023'; end if;
  if nullif(p_payload->>'active_report_template_id','') is not null and not exists(select 1 from public.company_template_versions where id=(p_payload->>'active_report_template_id')::uuid and company_id=p_company_id and template_kind='report') then raise exception 'COMPANY_TEMPLATE_UNAVAILABLE' using errcode='22023'; end if;
end $$;
revoke all on function public.validate_company_configuration_payload(uuid,jsonb) from public,anon,authenticated;

create function public.get_company_configuration()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor public.recruiter_profiles; v_company public.companies; v_settings public.company_settings; v_payload jsonb; v_history jsonb; v_templates jsonb; v_features jsonb; v_requests jsonb;
begin
  v_actor:=public.company_configuration_actor(false);
  select * into v_company from public.companies where id=v_actor.company_id;
  select * into v_settings from public.company_settings where company_id=v_actor.company_id;
  if v_settings.company_id is null then v_payload:=public.default_company_configuration(v_company.name);
  else v_payload:=to_jsonb(v_settings)-'company_id'-'updated_by_profile_id'; end if;
  select coalesce(jsonb_agg(to_jsonb(e)-'company_id'-'actor_profile_id' order by e.created_at desc,e.id desc),'[]'::jsonb) into v_history from public.company_settings_events e where e.company_id=v_actor.company_id;
  select coalesce(jsonb_agg(to_jsonb(t)-'company_id'-'created_by_profile_id' order by t.template_kind,t.template_name,t.version desc),'[]'::jsonb) into v_templates from public.company_template_versions t where t.company_id=v_actor.company_id;
  select coalesce(jsonb_agg(to_jsonb(f)-'company_id'-'configured_by_platform_user_id' order by f.feature_key),'[]'::jsonb) into v_features from public.company_feature_entitlements f where f.company_id=v_actor.company_id;
  select coalesce(jsonb_agg((to_jsonb(r)-'company_id'-'requested_by_profile_id') || jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(e)-'company_id'-'actor_profile_id'-'actor_user_id' order by e.created_at,e.id),'[]'::jsonb) from public.custom_work_request_events e where e.request_id=r.id)) order by r.updated_at desc,r.id desc),'[]'::jsonb) into v_requests from public.custom_work_requests r where r.company_id=v_actor.company_id;
  return jsonb_build_object('company_id',v_company.id,'company_name',v_company.name,'role',v_actor.role,'can_edit',v_actor.role='admin' and coalesce(public.demo_workspace_is_writable(v_company.id),false),'settings',v_payload,'history',v_history,'templates',v_templates,'features',v_features,'custom_work_requests',v_requests);
end $$;

create function public.update_company_configuration(p_payload jsonb,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor public.recruiter_profiles; v_company public.companies; v_current public.company_settings; v_previous jsonb; v_result jsonb;
begin
  v_actor:=public.company_configuration_actor(true);
  if public.demo_workspace_is_writable(v_actor.company_id) is not true then raise exception 'COMPANY_CONFIGURATION_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
  select * into v_company from public.companies where id=v_actor.company_id for update;
  select * into v_current from public.company_settings where company_id=v_actor.company_id for update;
  if p_expected_version is null or p_expected_version<>coalesce(v_current.version,0) then raise exception 'COMPANY_CONFIGURATION_VERSION_CONFLICT' using errcode='40001'; end if;
  perform public.validate_company_configuration_payload(v_actor.company_id,p_payload);
  v_previous:=case when v_current.company_id is null then null else to_jsonb(v_current)-'company_id'-'updated_by_profile_id' end;
  insert into public.company_settings(company_id,display_name,logo_url,accent_color,stage_labels,custom_fields,review_defaults,report_branding,active_review_template_id,active_report_template_id,version,updated_by_profile_id,updated_by_name)
  values(v_actor.company_id,btrim(p_payload->>'display_name'),nullif(btrim(coalesce(p_payload->>'logo_url','')),''),p_payload->>'accent_color',p_payload->'stage_labels',coalesce(p_payload->'custom_fields','[]'::jsonb),p_payload->'review_defaults',p_payload->'report_branding',nullif(p_payload->>'active_review_template_id','')::uuid,nullif(p_payload->>'active_report_template_id','')::uuid,coalesce(v_current.version,0)+1,v_actor.id,v_actor.display_name)
  on conflict(company_id) do update set display_name=excluded.display_name,logo_url=excluded.logo_url,accent_color=excluded.accent_color,stage_labels=excluded.stage_labels,custom_fields=excluded.custom_fields,review_defaults=excluded.review_defaults,report_branding=excluded.report_branding,active_review_template_id=excluded.active_review_template_id,active_report_template_id=excluded.active_report_template_id,version=excluded.version,updated_by_profile_id=excluded.updated_by_profile_id,updated_by_name=excluded.updated_by_name,updated_at=now()
  returning to_jsonb(company_settings.*)-'company_id'-'updated_by_profile_id' into v_result;
  insert into public.company_settings_events(company_id,actor_profile_id,actor_name,previous_state,state) values(v_actor.company_id,v_actor.id,v_actor.display_name,v_previous,v_result);
  return v_result;
end $$;

create function public.create_company_template_version(p_kind text,p_name text,p_content jsonb,p_activate boolean,p_expected_settings_version integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor public.recruiter_profiles; v_company public.companies; v_template public.company_template_versions; v_settings public.company_settings; v_payload jsonb; v_version integer;
begin
  v_actor:=public.company_configuration_actor(true);
  if public.demo_workspace_is_writable(v_actor.company_id) is not true then raise exception 'COMPANY_CONFIGURATION_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
  if p_kind not in('review','report') or char_length(btrim(coalesce(p_name,''))) not between 1 and 80 or jsonb_typeof(p_content)<>'object' or char_length(coalesce(p_content->>'instructions',p_content->>'footer',''))>4000 then raise exception 'COMPANY_TEMPLATE_INVALID' using errcode='22023'; end if;
  select coalesce(max(version),0)+1 into v_version from public.company_template_versions where company_id=v_actor.company_id and template_kind=p_kind and template_name=btrim(p_name);
  insert into public.company_template_versions(company_id,template_kind,template_name,version,content,created_by_profile_id,created_by_name) values(v_actor.company_id,p_kind,btrim(p_name),v_version,p_content,v_actor.id,v_actor.display_name) returning * into v_template;
  if p_activate then
    select * into v_company from public.companies where id=v_actor.company_id;
    select * into v_settings from public.company_settings where company_id=v_actor.company_id;
    if p_expected_settings_version<>coalesce(v_settings.version,0) then raise exception 'COMPANY_CONFIGURATION_VERSION_CONFLICT' using errcode='40001'; end if;
    v_payload:=case when v_settings.company_id is null then public.default_company_configuration(v_company.name) else to_jsonb(v_settings)-'company_id'-'updated_by_profile_id' end;
    if p_kind='review' then v_payload:=jsonb_set(v_payload,'{active_review_template_id}',to_jsonb(v_template.id::text)); else v_payload:=jsonb_set(v_payload,'{active_report_template_id}',to_jsonb(v_template.id::text)); end if;
    perform public.update_company_configuration(v_payload,p_expected_settings_version);
  end if;
  return to_jsonb(v_template)-'company_id'-'created_by_profile_id';
end $$;

create function public.submit_custom_work_request(p_title text,p_problem text,p_desired_outcome text,p_data_impact text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor public.recruiter_profiles; v_existing public.custom_work_requests; v_result public.custom_work_requests;
begin
  v_actor:=public.company_configuration_actor(true);
  if public.demo_workspace_is_writable(v_actor.company_id) is not true then raise exception 'COMPANY_CONFIGURATION_WRITE_ACCESS_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or char_length(btrim(coalesce(p_title,''))) not between 3 and 120 or char_length(btrim(coalesce(p_problem,''))) not between 20 and 3000 or char_length(btrim(coalesce(p_desired_outcome,''))) not between 20 and 3000 or char_length(coalesce(p_data_impact,''))>2000 then raise exception 'CUSTOM_WORK_REQUEST_INVALID' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtext(v_actor.company_id::text),hashtext(p_request_id::text));
  select * into v_existing from public.custom_work_requests where company_id=v_actor.company_id and request_id=p_request_id;
  if found then
    if v_existing.requested_by_profile_id is distinct from v_actor.id or v_existing.title<>btrim(p_title) or v_existing.problem<>btrim(p_problem) or v_existing.desired_outcome<>btrim(p_desired_outcome) or v_existing.data_impact<>btrim(coalesce(p_data_impact,'')) then raise exception 'CUSTOM_WORK_REQUEST_CONFLICT' using errcode='22023'; end if;
    return to_jsonb(v_existing)-'company_id'-'requested_by_profile_id'-'request_id';
  end if;
  insert into public.custom_work_requests(company_id,requested_by_profile_id,requested_by_name,title,problem,desired_outcome,data_impact,request_id) values(v_actor.company_id,v_actor.id,v_actor.display_name,btrim(p_title),btrim(p_problem),btrim(p_desired_outcome),btrim(coalesce(p_data_impact,'')),p_request_id) returning * into v_result;
  insert into public.custom_work_request_events(request_id,company_id,actor_kind,actor_profile_id,actor_name,note,stage) values(v_result.id,v_actor.company_id,'company',v_actor.id,v_actor.display_name,'Request submitted for platform review.','request');
  return to_jsonb(v_result)-'company_id'-'requested_by_profile_id'-'request_id';
end $$;

create function public.platform_company_configuration_controls()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if public.current_user_is_platform_administrator() is not true then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('company_id',c.id,'company_name',c.name,'features',(select coalesce(jsonb_agg(to_jsonb(f)-'company_id'-'configured_by_platform_user_id' order by f.feature_key),'[]'::jsonb) from public.company_feature_entitlements f where f.company_id=c.id),'custom_work_requests',(select coalesce(jsonb_agg(to_jsonb(r)-'company_id'-'requested_by_profile_id'-'request_id' order by r.updated_at desc),'[]'::jsonb) from public.custom_work_requests r where r.company_id=c.id)) order by c.name,c.id),'[]'::jsonb) into v_result from public.companies c where c.status='active';
  return v_result;
end $$;

create function public.set_company_feature_entitlement(p_company_id uuid,p_feature_key text,p_enabled boolean,p_reason text,p_starts_at timestamptz,p_ends_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_name text; v_previous public.company_feature_entitlements; v_result public.company_feature_entitlements;
begin
  if public.current_user_is_platform_administrator() is not true then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  select display_name into v_name from public.platform_admins where user_id=auth.uid() and status='active';
  if not exists(select 1 from public.companies where id=p_company_id and status='active') or p_feature_key not in('custom_branding','custom_stage_labels','custom_review_templates','bespoke_extensions') or char_length(btrim(coalesce(p_reason,''))) not between 12 and 1000 or (p_starts_at is not null and p_ends_at is not null and p_ends_at<=p_starts_at) then raise exception 'FEATURE_ENTITLEMENT_INVALID' using errcode='22023'; end if;
  select * into v_previous from public.company_feature_entitlements where company_id=p_company_id and feature_key=p_feature_key for update;
  insert into public.company_feature_entitlements(company_id,feature_key,enabled,reason,starts_at,ends_at,configured_by_platform_user_id,configured_by_name,version)
  values(p_company_id,p_feature_key,p_enabled,btrim(p_reason),p_starts_at,p_ends_at,auth.uid(),coalesce(v_name,'Platform administrator'),coalesce(v_previous.version,0)+1)
  on conflict(company_id,feature_key) do update set enabled=excluded.enabled,reason=excluded.reason,starts_at=excluded.starts_at,ends_at=excluded.ends_at,configured_by_platform_user_id=excluded.configured_by_platform_user_id,configured_by_name=excluded.configured_by_name,version=excluded.version,updated_at=now() returning * into v_result;
  insert into public.company_feature_entitlement_events(company_id,feature_key,platform_user_id,platform_name,previous_state,state) values(p_company_id,p_feature_key,auth.uid(),coalesce(v_name,'Platform administrator'),case when v_previous.company_id is null then null else to_jsonb(v_previous)-'configured_by_platform_user_id' end,to_jsonb(v_result)-'configured_by_platform_user_id');
  return to_jsonb(v_result)-'company_id'-'configured_by_platform_user_id';
end $$;

create function public.advance_custom_work_request(p_request_id uuid,p_stage text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_name text; v_request public.custom_work_requests;
begin
  if public.current_user_is_platform_administrator() is not true then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  select display_name into v_name from public.platform_admins where user_id=auth.uid() and status='active';
  if p_stage not in('request','clarification','feasibility','scope_quote','preview','acceptance','enabled','maintenance','closed') or char_length(btrim(coalesce(p_note,''))) not between 1 and 3000 then raise exception 'CUSTOM_WORK_REVIEW_INVALID' using errcode='22023'; end if;
  select * into v_request from public.custom_work_requests where id=p_request_id for update;
  if not found then raise exception 'CUSTOM_WORK_REQUEST_UNAVAILABLE' using errcode='42501'; end if;
  insert into public.custom_work_request_events(request_id,company_id,actor_kind,actor_user_id,actor_name,note,previous_stage,stage) values(v_request.id,v_request.company_id,'platform',auth.uid(),coalesce(v_name,'Platform administrator'),btrim(p_note),v_request.stage,p_stage);
  update public.custom_work_requests set stage=p_stage,version=version+1,updated_at=now() where id=v_request.id returning * into v_request;
  return to_jsonb(v_request)-'company_id'-'requested_by_profile_id'-'request_id';
end $$;

create function public.company_feature_is_enabled(p_company_id uuid,p_feature_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.company_feature_entitlements f where f.company_id=p_company_id and f.feature_key=p_feature_key and f.enabled and (f.starts_at is null or f.starts_at<=now()) and (f.ends_at is null or f.ends_at>now()))
$$;
revoke all on function public.company_feature_is_enabled(uuid,text) from public,anon,authenticated;

revoke all on function public.get_company_configuration() from public,anon;
grant execute on function public.get_company_configuration() to authenticated;
revoke all on function public.update_company_configuration(jsonb,integer) from public,anon;
grant execute on function public.update_company_configuration(jsonb,integer) to authenticated;
revoke all on function public.create_company_template_version(text,text,jsonb,boolean,integer) from public,anon;
grant execute on function public.create_company_template_version(text,text,jsonb,boolean,integer) to authenticated;
revoke all on function public.submit_custom_work_request(text,text,text,text,uuid) from public,anon;
grant execute on function public.submit_custom_work_request(text,text,text,text,uuid) to authenticated;
revoke all on function public.platform_company_configuration_controls() from public,anon;
grant execute on function public.platform_company_configuration_controls() to authenticated;
revoke all on function public.set_company_feature_entitlement(uuid,text,boolean,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.set_company_feature_entitlement(uuid,text,boolean,text,timestamptz,timestamptz) to authenticated;
revoke all on function public.advance_custom_work_request(uuid,text,text) from public,anon;
grant execute on function public.advance_custom_work_request(uuid,text,text) to authenticated;
