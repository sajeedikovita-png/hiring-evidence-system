-- Controlled support is a record-and-review workflow. Customer content can create
-- support records only; it has no path to repository, deployment, or provider-secret mutation.

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  subject text not null check (length(subject) between 1 and 160),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  author_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  author_kind text not null check (author_kind in ('customer','assistant','support')),
  body text not null check (length(body) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.support_issues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid references public.support_conversations(id) on delete set null,
  submitted_by_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  reported_category text not null check (reported_category in ('question','bug','feature')),
  title text not null check (length(title) between 1 and 180),
  description text not null check (length(description) between 1 and 4000),
  diagnostics jsonb not null default '{}'::jsonb,
  triage_category text check (triage_category in ('question','bug','feature')),
  developer_recommendation text,
  triage_status text not null default 'not_requested' check (triage_status in ('not_requested','processing','draft','escalated')),
  review_status text not null default 'open' check (review_status in ('open','reviewed','closed','escalated')),
  reviewed_by_platform_user_id uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.developer_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  issue_id uuid not null references public.support_issues(id) on delete restrict,
  requested_by_profile_id uuid references public.recruiter_profiles(id) on delete restrict,
  requested_by_platform_user_id uuid references auth.users(id) on delete restrict,
  request_summary text not null check (length(request_summary) between 1 and 1600),
  recommendation_snapshot text not null check (length(recommendation_snapshot) between 1 and 1200),
  recommendation_hash text not null,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','rejected')),
  risk_level text check (risk_level in ('low','medium','high')),
  affected_scope text,
  test_plan text,
  approved_by_platform_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approval_expires_at timestamptz,
  reviewed_by_profile_id uuid references public.recruiter_profiles(id) on delete restrict,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (num_nonnulls(requested_by_profile_id,requested_by_platform_user_id)=1),
  check ((status = 'pending_approval' and reviewed_by_profile_id is null and review_note is null and reviewed_at is null and approved_by_platform_user_id is null and approved_at is null and approval_expires_at is null and risk_level is null and affected_scope is null and test_plan is null) or
         (status = 'rejected' and reviewed_by_profile_id is not null and length(trim(coalesce(review_note,''))) > 0 and reviewed_at is not null and approved_by_platform_user_id is null and approved_at is null and approval_expires_at is null) or
         (status = 'approved' and approved_by_platform_user_id is not null and approved_at is not null and approval_expires_at > approved_at and risk_level is not null and length(trim(coalesce(affected_scope,''))) > 0 and length(trim(coalesce(test_plan,''))) > 0))
);
create table if not exists public.platform_change_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- This is a one-time bootstrap. Later changes to the owner allowlist are intentionally separate from platform_admins.
insert into public.platform_change_owners(user_id,status)
select user_id,'active' from public.platform_admins where status='active'
on conflict (user_id) do nothing;
create table if not exists public.support_knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,100}$'),
  title text not null check (length(title) between 1 and 180),
  body text not null check (length(body) between 1 and 6000),
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  approved_by_platform_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status = 'approved' and approved_by_platform_user_id is not null and approved_at is not null) or status <> 'approved')
);
insert into public.support_knowledge_base_articles(slug,title,body,status,approved_by_platform_user_id,approved_at)
select seed.slug,seed.title,seed.body,'approved',owner.user_id,now()
from (select user_id from public.platform_admins where status='active' order by user_id limit 1) owner
cross join (values
  ('evidence-report-review','Evidence report review','Evidence reports support human review. Check source references and record a job-related decision reason before changing a candidate status.'),
  ('support-boundaries','Support boundaries','Support requests are recorded for review. A support conversation, issue, triage draft, or approved work order does not itself change code, deployment, account access, or candidate data.')
) as seed(slug,title,body)
on conflict (slug) do nothing;
create table if not exists public.support_assistant_runs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  message_id uuid not null unique references public.support_messages(id) on delete cascade,
  actor_profile_id uuid not null references public.recruiter_profiles(id) on delete restrict,
  status text not null check (status in ('processing','completed','escalated')),
  lease_token uuid, lease_expires_at timestamptz,
  knowledge_base_article_ids jsonb not null default '[]'::jsonb,
  response_message_id uuid references public.support_messages(id) on delete set null,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.support_triage_runs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  issue_id uuid not null unique references public.support_issues(id) on delete cascade,
  actor_profile_id uuid references public.recruiter_profiles(id) on delete restrict,
  actor_platform_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('processing','completed','escalated')),
  lease_token uuid, lease_expires_at timestamptz,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.support_change_event_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_profile_id uuid references public.recruiter_profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('support_conversation','support_message','support_issue','developer_change_request','support_assistant_run','support_triage_run')),
  entity_id uuid not null,
  event_type text not null check (event_type in ('conversation_created','message_created','issue_created','issue_reviewed','issue_closed','issue_escalated','change_requested','change_approved','change_rejected','assistant_answered','assistant_escalated','triage_drafted','triage_escalated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_company_conversation_created on public.support_messages(company_id, conversation_id, created_at);
create index if not exists support_issues_company_created on public.support_issues(company_id, created_at desc);
create index if not exists support_assistant_runs_actor_created on public.support_assistant_runs(actor_profile_id, created_at desc);
create index if not exists support_triage_runs_actor_created on public.support_triage_runs(actor_profile_id, created_at desc);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_issues enable row level security;
alter table public.developer_change_requests enable row level security;
alter table public.support_knowledge_base_articles enable row level security;
alter table public.support_assistant_runs enable row level security;
alter table public.support_triage_runs enable row level security;
alter table public.support_change_event_ledger enable row level security;
alter table public.platform_change_owners enable row level security;
revoke all on public.support_conversations, public.support_messages, public.support_issues, public.developer_change_requests, public.support_knowledge_base_articles, public.support_assistant_runs, public.support_triage_runs, public.support_change_event_ledger, public.platform_change_owners from public, anon, authenticated;
grant select on public.support_conversations, public.support_messages, public.support_issues to authenticated;
grant select on public.developer_change_requests to authenticated;
create policy support_conversations_company_select on public.support_conversations for select to authenticated using (company_id in (select public.current_company_ids()));
create policy support_messages_company_select on public.support_messages for select to authenticated using (company_id in (select public.current_company_ids()));
create policy support_issues_company_select on public.support_issues for select to authenticated using (company_id in (select public.current_company_ids()));
create policy developer_change_requests_admin_select on public.developer_change_requests for select to authenticated using (company_id in (select public.current_company_ids()) and exists (select 1 from public.recruiter_profiles p where p.company_id=developer_change_requests.company_id and p.user_id=auth.uid() and p.status='active' and p.role='admin'));

create or replace function public.support_actor_profile(p_require_admin boolean default false)
returns public.recruiter_profiles language plpgsql stable security definer set search_path=public as $$
declare v_count integer; v_profile public.recruiter_profiles;
begin
  select count(*) into v_count from public.current_company_ids();
  if v_count <> 1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  select * into v_profile from public.recruiter_profiles p where p.user_id=auth.uid() and p.company_id in (select public.current_company_ids()) and p.status='active' and p.role in ('admin','recruiter','hiring_manager');
  if v_profile.id is null or (p_require_admin and v_profile.role <> 'admin') then raise exception 'SUPPORT_ADMIN_REQUIRED' using errcode='42501'; end if;
  return v_profile;
end; $$;

create or replace function public.is_current_user_change_owner()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.platform_change_owners where user_id=auth.uid() and status='active')
$$;

create or replace function public.redact_support_diagnostics(p_value jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare v_key text; v_value text; v_result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(coalesce(p_value,'{}'::jsonb)) <> 'object' or jsonb_object_length(coalesce(p_value,'{}'::jsonb)) > 12 then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
  for v_key, v_value in select key, value #>> '{}' from jsonb_each(coalesce(p_value,'{}'::jsonb)) loop
    if v_key !~ '^[a-zA-Z0-9_.-]{1,64}$' or length(coalesce(v_value,'')) > 240 then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
    if lower(v_key) ~ '(token|secret|password|authorization|cookie|key)' then continue; end if;
    v_result := v_result || jsonb_build_object(v_key, regexp_replace(coalesce(v_value,''), '(?i)(bearer[[:space:]]+|sk-[a-z0-9_-]+|eyJ[a-zA-Z0-9_-]+\.)[^[:space:]]+', '[redacted]', 'g'));
  end loop;
  return v_result;
end; $$;

create or replace function public.create_support_conversation(p_subject text, p_message text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles := public.support_actor_profile(false); v_conversation public.support_conversations; v_message public.support_messages; v_subject text:=trim(coalesce(p_subject,'')); v_body text:=trim(coalesce(p_message,''));
begin
  if length(v_subject) not between 1 and 160 or length(v_body) not between 1 and 4000 then raise exception 'SUPPORT_INPUT_INVALID' using errcode='22023'; end if;
  if (select count(*) from public.support_messages where author_profile_id=v_profile.id and author_kind='customer' and created_at>now()-interval '10 minutes') >= 20 then raise exception 'SUPPORT_RATE_LIMITED' using errcode='42900'; end if;
  insert into public.support_conversations(company_id,created_by_profile_id,subject) values(v_profile.company_id,v_profile.id,v_subject) returning * into v_conversation;
  insert into public.support_messages(company_id,conversation_id,author_profile_id,author_kind,body) values(v_profile.company_id,v_conversation.id,v_profile.id,'customer',v_body) returning * into v_message;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_profile.company_id,v_profile.id,'support_conversation',v_conversation.id,'conversation_created',jsonb_build_object('message_id',v_message.id));
  return jsonb_build_object('conversation_id',v_conversation.id,'message_id',v_message.id,'status',v_conversation.status);
end; $$;

create or replace function public.create_support_message(p_conversation_id uuid, p_message text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles := public.support_actor_profile(false); v_conversation public.support_conversations; v_message public.support_messages; v_body text:=trim(coalesce(p_message,''));
begin
  if p_conversation_id is null or length(v_body) not between 1 and 4000 then raise exception 'SUPPORT_INPUT_INVALID' using errcode='22023'; end if;
  if (select count(*) from public.support_messages where author_profile_id=v_profile.id and author_kind='customer' and created_at>now()-interval '10 minutes') >= 20 then raise exception 'SUPPORT_RATE_LIMITED' using errcode='42900'; end if;
  select * into v_conversation from public.support_conversations where id=p_conversation_id and company_id=v_profile.company_id and status='open' for update;
  if v_conversation.id is null then raise exception 'SUPPORT_CONVERSATION_NOT_IN_WORKSPACE' using errcode='23514'; end if;
  insert into public.support_messages(company_id,conversation_id,author_profile_id,author_kind,body) values(v_profile.company_id,v_conversation.id,v_profile.id,'customer',v_body) returning * into v_message;
  update public.support_conversations set updated_at=now() where id=v_conversation.id;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_profile.company_id,v_profile.id,'support_message',v_message.id,'message_created',jsonb_build_object('conversation_id',v_conversation.id));
  return jsonb_build_object('message_id',v_message.id,'conversation_id',v_conversation.id);
end; $$;

create or replace function public.create_support_issue(p_conversation_id uuid, p_category text, p_title text, p_description text, p_diagnostics jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles := public.support_actor_profile(false); v_conversation public.support_conversations; v_issue public.support_issues; v_category text:=lower(trim(coalesce(p_category,''))); v_title text:=trim(coalesce(p_title,'')); v_description text:=trim(coalesce(p_description,''));
begin
  if v_category not in ('question','bug','feature') or length(v_title) not between 1 and 180 or length(v_description) not between 1 and 4000 then raise exception 'SUPPORT_ISSUE_INPUT_INVALID' using errcode='22023'; end if;
  if (select count(*) from public.support_issues where submitted_by_profile_id=v_profile.id and created_at>now()-interval '10 minutes') >= 10 then raise exception 'SUPPORT_ISSUE_RATE_LIMITED' using errcode='42900'; end if;
  if p_conversation_id is not null then select * into v_conversation from public.support_conversations where id=p_conversation_id and company_id=v_profile.company_id; if v_conversation.id is null then raise exception 'SUPPORT_CONVERSATION_NOT_IN_WORKSPACE' using errcode='23514'; end if; end if;
  insert into public.support_issues(company_id,conversation_id,submitted_by_profile_id,reported_category,title,description,diagnostics) values(v_profile.company_id,p_conversation_id,v_profile.id,v_category,v_title,v_description,public.redact_support_diagnostics(p_diagnostics)) returning * into v_issue;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_profile.company_id,v_profile.id,'support_issue',v_issue.id,'issue_created',jsonb_build_object('reported_category',v_category));
  return jsonb_build_object('issue_id',v_issue.id,'triage_status',v_issue.triage_status);
end; $$;

create or replace function public.create_developer_change_request(p_issue_id uuid, p_request_summary text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles := public.support_actor_profile(true); v_issue public.support_issues; v_request public.developer_change_requests; v_summary text:=trim(coalesce(p_request_summary,'')); v_recommendation text;
begin
  if p_issue_id is null or length(v_summary) not between 1 and 1600 then raise exception 'DEVELOPER_CHANGE_REQUEST_INPUT_INVALID' using errcode='22023'; end if;
  select * into v_issue from public.support_issues where id=p_issue_id and company_id=v_profile.company_id for update; if v_issue.id is null then raise exception 'SUPPORT_ISSUE_NOT_IN_WORKSPACE' using errcode='23514'; end if;
  v_recommendation:=coalesce(nullif(trim(v_issue.developer_recommendation),''),v_summary);
  if length(v_recommendation) not between 1 and 1200 then raise exception 'DEVELOPER_CHANGE_RECOMMENDATION_INVALID' using errcode='22023'; end if;
  insert into public.developer_change_requests(company_id,issue_id,requested_by_profile_id,request_summary,recommendation_snapshot,recommendation_hash) values(v_profile.company_id,v_issue.id,v_profile.id,v_summary,v_recommendation,encode(extensions.digest(v_recommendation,'sha256'),'hex')) returning * into v_request;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_profile.company_id,v_profile.id,'developer_change_request',v_request.id,'change_requested',jsonb_build_object('issue_id',v_issue.id));
  return jsonb_build_object('id',v_request.id,'status',v_request.status);
end; $$;

create or replace function public.review_developer_change_request(p_request_id uuid, p_decision text, p_review_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles := public.support_actor_profile(true); v_request public.developer_change_requests; v_decision text:=lower(trim(coalesce(p_decision,''))); v_note text:=trim(coalesce(p_review_note,''));
begin
  if p_request_id is null or v_decision <> 'reject' or length(v_note) not between 1 and 1600 then raise exception 'DEVELOPER_CHANGE_REVIEW_INPUT_INVALID' using errcode='22023'; end if;
  select * into v_request from public.developer_change_requests where id=p_request_id and company_id=v_profile.company_id for update; if v_request.id is null or v_request.status <> 'pending_approval' then raise exception 'DEVELOPER_CHANGE_REQUEST_NOT_REVIEWABLE' using errcode='23514'; end if;
  update public.developer_change_requests set status='rejected', reviewed_by_profile_id=v_profile.id, review_note=v_note, reviewed_at=now(), updated_at=now() where id=v_request.id returning * into v_request;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_profile.company_id,v_profile.id,'developer_change_request',v_request.id,'change_rejected',jsonb_build_object('issue_id',v_request.issue_id));
  return jsonb_build_object('id',v_request.id,'status',v_request.status);
end; $$;

-- Edge-only preparation/finalization prevents a browser from writing assistant or triage output.
create or replace function public.prepare_support_assistant_response(p_conversation_id uuid,p_message_id uuid,p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.recruiter_profiles; v_count integer; v_conversation public.support_conversations; v_message public.support_messages; v_run public.support_assistant_runs; v_token uuid:=gen_random_uuid(); v_articles jsonb;
begin
  select count(*) into v_count from public.recruiter_profiles p join public.companies c on c.id=p.company_id where p.user_id=p_actor_user_id and p.status='active' and p.role in ('admin','recruiter','hiring_manager') and c.status='active'; if v_count<>1 then raise exception 'EXACTLY_ONE_ACTIVE_WORKSPACE_REQUIRED' using errcode='42501'; end if;
  select p.* into v_profile from public.recruiter_profiles p where p.user_id=p_actor_user_id and p.status='active' and p.role in ('admin','recruiter','hiring_manager');
  if (select count(*) from public.support_assistant_runs where actor_profile_id=v_profile.id and created_at>now()-interval '10 minutes') >= 10 then raise exception 'SUPPORT_ASSISTANT_RATE_LIMITED' using errcode='42900'; end if;
  select * into v_conversation from public.support_conversations where id=p_conversation_id and company_id=v_profile.company_id; if v_conversation.id is null then raise exception 'SUPPORT_CONVERSATION_NOT_IN_WORKSPACE'; end if;
  select * into v_message from public.support_messages where id=p_message_id and conversation_id=v_conversation.id and company_id=v_profile.company_id and author_profile_id=v_profile.id and author_kind='customer'; if v_message.id is null then raise exception 'SUPPORT_MESSAGE_NOT_OWNED'; end if;
  select * into v_run from public.support_assistant_runs where message_id=v_message.id for update;
  if v_run.id is not null and v_run.status in ('completed','escalated') then return jsonb_build_object('state',v_run.status,'response_message_id',v_run.response_message_id); end if;
  if v_run.id is not null and v_run.lease_expires_at>now() then return jsonb_build_object('state','processing'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'body',body) order by updated_at desc),'[]'::jsonb) into v_articles from (select id,title,body,updated_at from public.support_knowledge_base_articles where status='approved' order by updated_at desc limit 8) approved_articles;
  if v_run.id is null then insert into public.support_assistant_runs(company_id,conversation_id,message_id,actor_profile_id,status,lease_token,lease_expires_at,knowledge_base_article_ids) values(v_profile.company_id,v_conversation.id,v_message.id,v_profile.id,'processing',v_token,now()+interval '60 seconds',coalesce((select jsonb_agg(value->>'id') from jsonb_array_elements(v_articles) value),'[]'::jsonb)) returning * into v_run; else update public.support_assistant_runs set actor_profile_id=v_profile.id,status='processing',lease_token=v_token,lease_expires_at=now()+interval '60 seconds',knowledge_base_article_ids=coalesce((select jsonb_agg(value->>'id') from jsonb_array_elements(v_articles) value),'[]'::jsonb) where id=v_run.id returning * into v_run; end if;
  update public.support_conversations set updated_at=now() where id=v_conversation.id;
  return jsonb_build_object('state','claimed','run_id',v_run.id,'lease_token',v_run.lease_token,'message',v_message.body,'articles',v_articles);
end; $$;

create or replace function public.finalize_support_assistant_response(p_run_id uuid,p_actor_user_id uuid,p_lease_token uuid,p_response text,p_article_ids jsonb,p_escalated boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run public.support_assistant_runs; v_profile public.recruiter_profiles; v_response text:=trim(coalesce(p_response,'')); v_message public.support_messages;
begin
  select * into v_run from public.support_assistant_runs where id=p_run_id for update; if v_run.id is null or v_run.status<>'processing' or v_run.lease_expires_at<=now() or v_run.lease_token is distinct from p_lease_token then raise exception 'SUPPORT_ASSISTANT_RUN_NOT_FINALIZABLE'; end if;
  select * into v_profile from public.recruiter_profiles where id=v_run.actor_profile_id and user_id=p_actor_user_id and status='active'; if v_profile.id is null then raise exception 'SUPPORT_ASSISTANT_ACTOR_INVALID'; end if;
  if p_escalated then v_response:='I do not have approved guidance for this request. It has been recorded for human support review.'; p_article_ids:='[]'::jsonb; elsif length(v_response) not between 1 and 1600 or jsonb_typeof(coalesce(p_article_ids,'[]'::jsonb))<>'array' or jsonb_array_length(p_article_ids)=0 or exists(select 1 from jsonb_array_elements_text(p_article_ids) id where not exists(select 1 from jsonb_array_elements_text(v_run.knowledge_base_article_ids) allowed where allowed=id)) then raise exception 'SUPPORT_ASSISTANT_RESPONSE_INVALID'; end if;
  insert into public.support_messages(company_id,conversation_id,author_kind,body,metadata) values(v_run.company_id,v_run.conversation_id,'assistant',v_response,jsonb_build_object('article_ids',coalesce(p_article_ids,'[]'::jsonb),'escalated',p_escalated)) returning * into v_message;
  update public.support_assistant_runs set status=case when p_escalated then 'escalated' else 'completed' end,response_message_id=v_message.id,lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_run.company_id,v_profile.id,'support_assistant_run',v_run.id,case when p_escalated then 'assistant_escalated' else 'assistant_answered' end,jsonb_build_object('conversation_id',v_run.conversation_id));
  return jsonb_build_object('status',case when p_escalated then 'escalated' else 'completed' end,'message_id',v_message.id);
end; $$;

create or replace function public.prepare_support_triage(p_issue_id uuid,p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_issue public.support_issues; v_run public.support_triage_runs; v_token uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.platform_admins where user_id=p_actor_user_id and status='active') then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  if (select count(*) from public.support_triage_runs where actor_platform_user_id=p_actor_user_id and created_at>now()-interval '10 minutes') >= 5 then raise exception 'SUPPORT_TRIAGE_RATE_LIMITED' using errcode='42900'; end if;
  select * into v_issue from public.support_issues where id=p_issue_id for update; if v_issue.id is null then raise exception 'SUPPORT_ISSUE_NOT_FOUND'; end if;
  select * into v_run from public.support_triage_runs where issue_id=v_issue.id for update; if v_run.id is not null and v_run.status in ('completed','escalated') then return jsonb_build_object('state',v_run.status); end if; if v_run.id is not null and v_run.lease_expires_at>now() then return jsonb_build_object('state','processing'); end if;
  if v_run.id is null then insert into public.support_triage_runs(company_id,issue_id,actor_platform_user_id,status,lease_token,lease_expires_at) values(v_issue.company_id,v_issue.id,p_actor_user_id,'processing',v_token,now()+interval '60 seconds') returning * into v_run; else update public.support_triage_runs set actor_profile_id=null,actor_platform_user_id=p_actor_user_id,status='processing',lease_token=v_token,lease_expires_at=now()+interval '60 seconds' where id=v_run.id returning * into v_run; end if;
  update public.support_issues set triage_status='processing',updated_at=now() where id=v_issue.id;
  return jsonb_build_object('state','claimed','run_id',v_run.id,'lease_token',v_run.lease_token,'issue',jsonb_build_object('title',v_issue.title,'description',v_issue.description,'reported_category',v_issue.reported_category,'diagnostics',v_issue.diagnostics));
end; $$;

create or replace function public.finalize_support_triage(p_run_id uuid,p_actor_user_id uuid,p_lease_token uuid,p_category text,p_recommendation text,p_escalated boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run public.support_triage_runs; v_category text:=lower(trim(coalesce(p_category,''))); v_recommendation text:=trim(coalesce(p_recommendation,''));
begin
  select * into v_run from public.support_triage_runs where id=p_run_id for update; if v_run.id is null or v_run.status<>'processing' or v_run.lease_expires_at<=now() or v_run.lease_token is distinct from p_lease_token then raise exception 'SUPPORT_TRIAGE_RUN_NOT_FINALIZABLE'; end if;
  if v_run.actor_platform_user_id <> p_actor_user_id or not exists(select 1 from public.platform_admins where user_id=p_actor_user_id and status='active') then raise exception 'SUPPORT_TRIAGE_ACTOR_INVALID'; end if;
  if p_escalated then v_category:='question'; v_recommendation:='Needs human support review before any developer recommendation.'; elsif v_category not in ('question','bug','feature') or length(v_recommendation) not between 1 and 1200 or lower(v_recommendation) ~ '(deploy|execute|run migration|change code|delete data)' then raise exception 'SUPPORT_TRIAGE_RESPONSE_INVALID'; end if;
  update public.support_issues set triage_category=v_category,developer_recommendation=v_recommendation,triage_status=case when p_escalated then 'escalated' else 'draft' end,updated_at=now() where id=v_run.issue_id;
  update public.support_triage_runs set status=case when p_escalated then 'escalated' else 'completed' end,lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_run.company_id,null,'support_triage_run',v_run.id,case when p_escalated then 'triage_escalated' else 'triage_drafted' end,jsonb_build_object('issue_id',v_run.issue_id,'platform_user_id',p_actor_user_id));
  return jsonb_build_object('status',case when p_escalated then 'escalated' else 'draft' end,'issue_id',v_run.issue_id);
end; $$;

create or replace function public.invalidate_change_approval_on_recommendation_edit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_hash text;
begin
  if new.developer_recommendation is not distinct from old.developer_recommendation then return new; end if;
  v_hash:=encode(extensions.digest(coalesce(nullif(trim(new.developer_recommendation),''),''),'sha256'),'hex');
  update public.developer_change_requests
  set status='pending_approval', reviewed_by_profile_id=null, review_note=null, reviewed_at=null,
      risk_level=null, affected_scope=null, test_plan=null, approved_by_platform_user_id=null,
      approved_at=null, approval_expires_at=null, updated_at=now()
  where issue_id=new.id and status='approved' and recommendation_hash is distinct from v_hash;
  return new;
end; $$;
drop trigger if exists support_issue_recommendation_invalidates_approval on public.support_issues;
create trigger support_issue_recommendation_invalidates_approval
  after update of developer_recommendation on public.support_issues
  for each row execute function public.invalidate_change_approval_on_recommendation_edit();

create or replace function public.approve_developer_change_request(p_request_id uuid,p_risk_level text,p_affected_scope text,p_test_plan text,p_expiry_hours integer default 72)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_request public.developer_change_requests; v_issue public.support_issues; v_risk text:=lower(trim(coalesce(p_risk_level,''))); v_scope text:=trim(coalesce(p_affected_scope,'')); v_plan text:=trim(coalesce(p_test_plan,'')); v_current_recommendation text; v_hash text;
begin
  if not public.is_current_user_change_owner() then raise exception 'PLATFORM_CHANGE_OWNER_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or v_risk not in ('low','medium','high') or length(v_scope) not between 1 and 1200 or length(v_plan) not between 1 and 1600 or p_expiry_hours not between 1 and 168 then raise exception 'DEVELOPER_CHANGE_APPROVAL_INPUT_INVALID' using errcode='22023'; end if;
  select * into v_request from public.developer_change_requests where id=p_request_id for update; if v_request.id is null or v_request.status <> 'pending_approval' then raise exception 'DEVELOPER_CHANGE_REQUEST_NOT_APPROVABLE' using errcode='23514'; end if;
  select * into v_issue from public.support_issues where id=v_request.issue_id; if v_issue.id is null then raise exception 'SUPPORT_ISSUE_NOT_FOUND' using errcode='23514'; end if;
  v_current_recommendation:=coalesce(nullif(trim(v_issue.developer_recommendation),''),v_request.request_summary);
  v_hash:=encode(extensions.digest(v_current_recommendation,'sha256'),'hex');
  if v_request.recommendation_hash <> v_hash then raise exception 'RECOMMENDATION_CHANGED_REAPPROVAL_REQUIRED' using errcode='23514'; end if;
  update public.developer_change_requests set status='approved',risk_level=v_risk,affected_scope=v_scope,test_plan=v_plan,approved_by_platform_user_id=auth.uid(),approved_at=now(),approval_expires_at=now()+make_interval(hours=>p_expiry_hours),updated_at=now() where id=v_request.id returning * into v_request;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_request.company_id,null,'developer_change_request',v_request.id,'change_approved',jsonb_build_object('platform_change_owner_user_id',auth.uid(),'recommendation_hash',v_hash,'risk_level',v_risk,'approval_expires_at',v_request.approval_expires_at));
  return jsonb_build_object('id',v_request.id,'approvalStatus','approved','recommendationHash',v_hash,'riskLevel',v_risk,'affectedScope',v_scope,'testPlan',v_plan,'approvedAt',v_request.approved_at,'approvalExpiresAt',v_request.approval_expires_at);
end; $$;

create or replace function public.prepare_platform_change_request(p_issue_id uuid,p_request_summary text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_issue public.support_issues; v_request public.developer_change_requests; v_summary text:=trim(coalesce(p_request_summary,'')); v_recommendation text;
begin
  if not public.is_current_user_admin() then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_issue_id is null or length(v_summary) not between 1 and 1600 then raise exception 'DEVELOPER_CHANGE_REQUEST_INPUT_INVALID' using errcode='22023'; end if;
  select * into v_issue from public.support_issues where id=p_issue_id for update; if v_issue.id is null then raise exception 'SUPPORT_ISSUE_NOT_FOUND' using errcode='23514'; end if;
  v_recommendation:=coalesce(nullif(trim(v_issue.developer_recommendation),''),v_summary);
  if length(v_recommendation) not between 1 and 1200 then raise exception 'DEVELOPER_CHANGE_RECOMMENDATION_INVALID' using errcode='22023'; end if;
  insert into public.developer_change_requests(company_id,issue_id,requested_by_platform_user_id,request_summary,recommendation_snapshot,recommendation_hash) values(v_issue.company_id,v_issue.id,auth.uid(),v_summary,v_recommendation,encode(extensions.digest(v_recommendation,'sha256'),'hex')) returning * into v_request;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_issue.company_id,null,'developer_change_request',v_request.id,'change_requested',jsonb_build_object('platform_user_id',auth.uid(),'issue_id',v_issue.id));
  return jsonb_build_object('id',v_request.id,'approvalStatus','pending_approval','recommendationHash',v_request.recommendation_hash);
end; $$;

-- Compatibility RPCs expose a small camelCase contract for the customer panel
-- and a platform-owner inbox. They record support state only and never execute a change.
create or replace function public.submit_support_issue(p_issue jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_input jsonb:=coalesce(p_issue,'{}'::jsonb); v_kind text:=lower(trim(coalesce(v_input->>'category',v_input->>'type',''))); v_severity text:=lower(trim(coalesce(v_input->>'severity',''))); v_diagnostics jsonb:=coalesce(v_input->'diagnostics','{}'::jsonb); v_result jsonb;
begin
  if v_kind='problem' then v_kind:='bug'; end if;
  if v_kind not in ('question','bug','feature') then raise exception 'SUPPORT_ISSUE_INPUT_INVALID' using errcode='22023'; end if;
  if v_severity <> '' then
    if v_severity not in ('low','medium','high','critical') then raise exception 'SUPPORT_ISSUE_INPUT_INVALID' using errcode='22023'; end if;
    if jsonb_typeof(v_diagnostics)<>'object' then raise exception 'SUPPORT_DIAGNOSTICS_INVALID' using errcode='22023'; end if;
    v_diagnostics:=v_diagnostics || jsonb_build_object('severity',v_severity);
  end if;
  select public.create_support_issue(null,v_kind,coalesce(v_input->>'title',v_input->>'subject',''),coalesce(v_input->>'description',v_input->>'message',''),v_diagnostics) into v_result;
  return jsonb_build_object('issueId',v_result->>'issue_id','triageStatus',v_result->>'triage_status','approvalStatus','not_requested');
end; $$;

create or replace function public.list_support_inbox()
returns table(issue_id uuid, company_id uuid, company_name text, category text, severity text, title text, description text, affected_page text, triage_status text, review_status text, developer_recommendation text, approval_status text, approval_expires_at timestamptz, created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_current_user_admin() then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  return query
  select i.id,i.company_id,c.name,i.reported_category,coalesce(i.diagnostics->>'severity',''),i.title,i.description,coalesce(i.diagnostics->>'affected_page','workspace'),i.triage_status,i.review_status,i.developer_recommendation,
    coalesce((select d.status from public.developer_change_requests d where d.issue_id=i.id order by d.created_at desc limit 1),'not_requested'),(select d.approval_expires_at from public.developer_change_requests d where d.issue_id=i.id order by d.created_at desc limit 1),i.created_at
  from public.support_issues i join public.companies c on c.id=i.company_id
  order by case i.review_status when 'open' then 0 when 'escalated' then 1 else 2 end, i.created_at desc;
end; $$;

create or replace function public.review_support_issue(p_issue_id uuid,p_decision text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_issue public.support_issues; v_decision text:=lower(trim(coalesce(p_decision,''))); v_note text:=trim(coalesce(p_note,'')); v_status text; v_event text;
begin
  if not public.is_current_user_admin() then raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_issue_id is null or v_decision not in ('review','approve','close','escalate') or length(v_note) not between 1 and 1600 then raise exception 'SUPPORT_ISSUE_REVIEW_INPUT_INVALID' using errcode='22023'; end if;
  select * into v_issue from public.support_issues where id=p_issue_id for update; if v_issue.id is null then raise exception 'SUPPORT_ISSUE_NOT_FOUND' using errcode='23514'; end if;
  v_status:=case when v_decision='close' then 'closed' when v_decision='escalate' then 'escalated' else 'reviewed' end;
  v_event:=case when v_status='closed' then 'issue_closed' when v_status='escalated' then 'issue_escalated' else 'issue_reviewed' end;
  update public.support_issues set review_status=v_status,reviewed_by_platform_user_id=auth.uid(),review_note=v_note,reviewed_at=now(),updated_at=now() where id=v_issue.id;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata) values(v_issue.company_id,null,'support_issue',v_issue.id,v_event,jsonb_build_object('platform_user_id',auth.uid()));
  return jsonb_build_object('issueId',v_issue.id,'reviewStatus',v_status,'approvalStatus',coalesce((select status from public.developer_change_requests where issue_id=v_issue.id order by created_at desc limit 1),'not_requested'),'approvalExpiresAt',(select approval_expires_at from public.developer_change_requests where issue_id=v_issue.id order by created_at desc limit 1));
end; $$;

revoke all on function public.create_support_conversation(text,text), public.create_support_message(uuid,text), public.create_support_issue(uuid,text,text,text,jsonb), public.create_developer_change_request(uuid,text), public.review_developer_change_request(uuid,text,text) from public, anon;
revoke all on function public.prepare_support_assistant_response(uuid,uuid,uuid), public.finalize_support_assistant_response(uuid,uuid,uuid,text,jsonb,boolean), public.prepare_support_triage(uuid,uuid), public.finalize_support_triage(uuid,uuid,uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.support_actor_profile(boolean) from public, anon;
grant execute on function public.create_support_conversation(text,text), public.create_support_message(uuid,text), public.create_support_issue(uuid,text,text,text,jsonb), public.create_developer_change_request(uuid,text), public.review_developer_change_request(uuid,text,text) to authenticated;
revoke all on function public.submit_support_issue(jsonb), public.list_support_inbox(), public.review_support_issue(uuid,text,text) from public, anon;
grant execute on function public.submit_support_issue(jsonb), public.list_support_inbox(), public.review_support_issue(uuid,text,text) to authenticated;
revoke all on function public.approve_developer_change_request(uuid,text,text,text,integer), public.is_current_user_change_owner() from public, anon;
grant execute on function public.approve_developer_change_request(uuid,text,text,text,integer) to authenticated;
revoke all on function public.prepare_platform_change_request(uuid,text) from public, anon;
grant execute on function public.prepare_platform_change_request(uuid,text) to authenticated;
grant execute on function public.prepare_support_assistant_response(uuid,uuid,uuid), public.finalize_support_assistant_response(uuid,uuid,uuid,text,jsonb,boolean), public.prepare_support_triage(uuid,uuid), public.finalize_support_triage(uuid,uuid,uuid,text,text,boolean) to service_role;
