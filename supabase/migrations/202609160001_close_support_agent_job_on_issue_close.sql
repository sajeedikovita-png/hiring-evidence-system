-- Closing a support issue must withdraw any queued or leased developer work.
-- This keeps owner review state authoritative for the maintainer queue.

create or replace function public.close_support_agent_job_for_closed_issue()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.review_status = 'closed' and old.review_status is distinct from new.review_status then
    with closed_jobs as (
      update public.support_agent_jobs
      set status = 'closed', claim_token = null, lease_expires_at = null,
          completed_at = coalesce(completed_at, now()), updated_at = now(),
          blocked_reason = 'Support issue was closed by the platform administrator.'
      where issue_id = new.id
        and status not in ('closed', 'released')
      returning id, issue_id
    )
    insert into public.support_agent_events(job_id, issue_id, event_type, status, summary)
    select id, issue_id, 'status_changed', 'closed', 'Support issue was closed by the platform administrator.'
    from closed_jobs;
  end if;
  return new;
end; $$;

drop trigger if exists support_issue_closes_agent_job on public.support_issues;
create trigger support_issue_closes_agent_job
  after update of review_status on public.support_issues
  for each row execute function public.close_support_agent_job_for_closed_issue();

-- Reconcile any issue closed before this trigger was installed.
with closed_jobs as (
update public.support_agent_jobs j
set status = 'closed', claim_token = null, lease_expires_at = null,
    completed_at = coalesce(completed_at, now()), updated_at = now(),
    blocked_reason = 'Support issue was already closed by the platform administrator.'
from public.support_issues i
where i.id = j.issue_id
  and i.review_status = 'closed'
  and j.status not in ('closed', 'released')
returning j.id, j.issue_id
)
insert into public.support_agent_events(job_id, issue_id, event_type, status, summary)
select id, issue_id, 'status_changed', 'closed', 'Previously closed support issue reconciled with developer queue.'
from closed_jobs;

create or replace function public.guard_support_agent_job_for_closed_issue()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status <> 'closed' and exists (
    select 1 from public.support_issues where id = new.issue_id and review_status = 'closed'
  ) then
    raise exception 'CLOSED_SUPPORT_ISSUE_CANNOT_BE_QUEUED' using errcode = '23514';
  end if;
  return new;
end; $$;

drop trigger if exists support_agent_job_closed_issue_guard on public.support_agent_jobs;
create trigger support_agent_job_closed_issue_guard
  before insert or update of issue_id, status on public.support_agent_jobs
  for each row execute function public.guard_support_agent_job_for_closed_issue();

create or replace function public.guard_support_change_request_for_closed_issue()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (tg_op = 'INSERT' or new.status = 'approved') and exists (
    select 1 from public.support_issues where id = new.issue_id and review_status = 'closed'
  ) then
    raise exception 'CLOSED_SUPPORT_ISSUE_CANNOT_CREATE_CHANGE_REQUEST' using errcode = '23514';
  end if;
  return new;
end; $$;

drop trigger if exists support_change_request_closed_issue_guard on public.developer_change_requests;
create trigger support_change_request_closed_issue_guard
  before insert or update of status on public.developer_change_requests
  for each row execute function public.guard_support_change_request_for_closed_issue();

-- A closed issue must never create fresh developer work through the insert trigger.
create or replace function public.queue_support_agent_job()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_job public.support_agent_jobs;
begin
  if new.review_status = 'closed' then return new; end if;
  insert into public.support_agent_jobs(issue_id,company_id)
  values(new.id,new.company_id)
  on conflict(issue_id) do nothing
  returning * into v_job;
  if v_job.id is not null then
    insert into public.support_agent_events(job_id,issue_id,event_type,status,summary)
    values(v_job.id,new.id,'queued','queued','Support request entered the controlled developer queue.');
  end if;
  return new;
end; $$;

-- The worker claim remains service-only; this assertion documents the boundary.
revoke all on function public.close_support_agent_job_for_closed_issue() from public, anon, authenticated;
grant execute on function public.close_support_agent_job_for_closed_issue() to service_role;
revoke all on function public.guard_support_agent_job_for_closed_issue() from public, anon, authenticated;
grant execute on function public.guard_support_agent_job_for_closed_issue() to service_role;
revoke all on function public.guard_support_change_request_for_closed_issue() from public, anon, authenticated;
grant execute on function public.guard_support_change_request_for_closed_issue() to service_role;
