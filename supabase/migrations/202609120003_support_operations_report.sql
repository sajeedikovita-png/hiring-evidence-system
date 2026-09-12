-- Owner operations reporting for the controlled support workflow.
-- These records report agent work; they do not grant repository or deployment access.

create table if not exists public.support_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null unique references public.support_issues(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','investigating','blocked','fix_prepared','preview_ready','released','failed','closed')),
  risk_level text not null default 'unclassified' check (risk_level in ('unclassified','low','medium','high')),
  automation_scope text not null default 'prepare_only' check (automation_scope in ('prepare_only','low_risk_release')),
  classification text,
  investigation_summary text,
  fix_summary text,
  test_results jsonb not null default '[]'::jsonb,
  branch_name text,
  preview_url text,
  release_url text,
  blocked_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_agent_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.support_agent_jobs(id) on delete cascade,
  issue_id uuid not null references public.support_issues(id) on delete cascade,
  event_type text not null check (event_type in ('queued','status_changed','report_updated')),
  status text not null,
  summary text not null check (length(summary) between 1 and 800),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_agent_jobs_status_updated on public.support_agent_jobs(status, updated_at desc);
create index if not exists support_agent_events_created on public.support_agent_events(created_at desc);

alter table public.support_agent_jobs enable row level security;
alter table public.support_agent_events enable row level security;
revoke all on public.support_agent_jobs, public.support_agent_events from public, anon, authenticated;
grant all on public.support_agent_jobs, public.support_agent_events to service_role;

create or replace function public.queue_support_agent_job()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_job public.support_agent_jobs;
begin
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

drop trigger if exists support_issue_queues_agent_job on public.support_issues;
create trigger support_issue_queues_agent_job
  after insert on public.support_issues
  for each row execute function public.queue_support_agent_job();

insert into public.support_agent_jobs(issue_id,company_id)
select i.id,i.company_id from public.support_issues i
on conflict(issue_id) do nothing;

insert into public.support_agent_events(job_id,issue_id,event_type,status,summary)
select j.id,j.issue_id,'queued',j.status,'Existing support request added to the controlled developer queue.'
from public.support_agent_jobs j
where not exists(select 1 from public.support_agent_events e where e.job_id=j.id);

create or replace function public.get_support_operations_report()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.is_current_user_admin() then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generatedAt',now(),
    'counts',jsonb_build_object(
      'openIssues',(select count(*) from public.support_issues where review_status in ('open','escalated')),
      'notificationsPending',(select count(*) from public.support_notification_deliveries where status <> 'sent'),
      'agentActive',(select count(*) from public.support_agent_jobs where status in ('queued','investigating','fix_prepared','preview_ready')),
      'blocked',(select count(*) from public.support_agent_jobs where status in ('blocked','failed')),
      'released',(select count(*) from public.support_agent_jobs where status='released')
    ),
    'issues',coalesce((
      select jsonb_agg(jsonb_build_object(
        'issueId',i.id,'reference',upper(left(i.id::text,8)),'companyName',c.name,
        'category',i.reported_category,'severity',coalesce(nullif(i.diagnostics->>'severity',''),'low'),
        'title',i.title,'affectedPage',coalesce(nullif(i.diagnostics->>'affected_page',''),'workspace'),
        'reviewStatus',i.review_status,'triageStatus',i.triage_status,
        'notificationStatus',coalesce(n.status,'not_queued'),'notificationSentAt',n.sent_at,'notificationError',n.last_error,
        'agentStatus',coalesce(j.status,'not_queued'),'riskLevel',coalesce(j.risk_level,'unclassified'),
        'automationScope',coalesce(j.automation_scope,'prepare_only'),'classification',j.classification,
        'investigationSummary',j.investigation_summary,'fixSummary',j.fix_summary,
        'testResults',coalesce(j.test_results,'[]'::jsonb),'previewUrl',j.preview_url,'releaseUrl',j.release_url,
        'blockedReason',j.blocked_reason,'approvalStatus',coalesce(d.status,'not_requested'),
        'createdAt',i.created_at,'updatedAt',greatest(i.updated_at,coalesce(j.updated_at,i.updated_at))
      ) order by i.created_at desc)
      from public.support_issues i
      join public.companies c on c.id=i.company_id
      left join public.support_notification_deliveries n on n.issue_id=i.id
      left join public.support_agent_jobs j on j.issue_id=i.id
      left join lateral (select status from public.developer_change_requests d where d.issue_id=i.id order by d.created_at desc limit 1) d on true
    ),'[]'::jsonb),
    'events',coalesce((
      select jsonb_agg(jsonb_build_object('id',e.id,'reference',upper(left(e.issue_id::text,8)),'eventType',e.event_type,'status',e.status,'summary',e.summary,'createdAt',e.created_at) order by e.created_at desc)
      from (select * from public.support_agent_events order by created_at desc limit 40) e
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;

revoke all on function public.get_support_operations_report() from public, anon;
grant execute on function public.get_support_operations_report() to authenticated;

