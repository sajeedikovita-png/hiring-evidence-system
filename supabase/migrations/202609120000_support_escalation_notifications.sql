-- Every support issue creates a durable notification record. Email delivery is
-- best effort; the protected platform inbox remains the source of truth.

create table if not exists public.support_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null unique references public.support_issues(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sent')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.support_notification_deliveries enable row level security;
revoke all on public.support_notification_deliveries from public, anon, authenticated;
grant all on public.support_notification_deliveries to service_role;

create or replace function public.queue_support_owner_notification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.support_notification_deliveries(issue_id)
  values(new.id)
  on conflict (issue_id) do nothing;
  return new;
end; $$;
revoke all on function public.queue_support_owner_notification() from public, anon, authenticated;

drop trigger if exists support_issue_queues_owner_notification on public.support_issues;
create trigger support_issue_queues_owner_notification
  after insert on public.support_issues
  for each row execute function public.queue_support_owner_notification();

-- Convert an unanswered Guide conversation into one visible inbox item. The
-- function is service-only and validates the authenticated actor bound to the
-- assistant run before inserting anything.
create or replace function public.create_support_issue_from_assistant_escalation(
  p_run_id uuid,
  p_actor_user_id uuid
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_run public.support_assistant_runs;
  v_profile public.recruiter_profiles;
  v_conversation public.support_conversations;
  v_customer_message public.support_messages;
  v_issue public.support_issues;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_run_id::text, 0));
  select * into v_run from public.support_assistant_runs where id=p_run_id and status='escalated';
  if v_run.id is null then raise exception 'SUPPORT_ASSISTANT_ESCALATION_REQUIRED' using errcode='23514'; end if;

  select * into v_profile from public.recruiter_profiles
  where id=v_run.actor_profile_id and user_id=p_actor_user_id and company_id=v_run.company_id and status='active';
  if v_profile.id is null then raise exception 'SUPPORT_ASSISTANT_ACTOR_INVALID' using errcode='42501'; end if;

  select * into v_issue from public.support_issues
  where conversation_id=v_run.conversation_id and reported_category='question'
  order by created_at desc limit 1;
  if v_issue.id is not null then return jsonb_build_object('issue_id',v_issue.id,'created',false); end if;

  select * into v_conversation from public.support_conversations where id=v_run.conversation_id and company_id=v_run.company_id;
  select * into v_customer_message from public.support_messages where id=v_run.message_id and conversation_id=v_run.conversation_id and author_kind='customer';
  if v_conversation.id is null or v_customer_message.id is null then raise exception 'SUPPORT_CONVERSATION_INVALID' using errcode='23514'; end if;

  insert into public.support_issues(company_id,conversation_id,submitted_by_profile_id,reported_category,title,description,diagnostics,review_status)
  values(v_run.company_id,v_run.conversation_id,v_profile.id,'question',v_conversation.subject,v_customer_message.body,jsonb_build_object('affected_page','Guide conversation','source','assistant_escalation'),'escalated')
  returning * into v_issue;
  insert into public.support_change_event_ledger(company_id,actor_profile_id,entity_type,entity_id,event_type,metadata)
  values(v_run.company_id,v_profile.id,'support_issue',v_issue.id,'issue_escalated',jsonb_build_object('conversation_id',v_run.conversation_id,'assistant_run_id',v_run.id));
  return jsonb_build_object('issue_id',v_issue.id,'created',true);
end; $$;

revoke all on function public.create_support_issue_from_assistant_escalation(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_support_issue_from_assistant_escalation(uuid,uuid) to service_role;
