-- Keep approved Guide facts aligned with agency-owned client context.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select
  'agency-client-records-and-role-context',
  'Agency clients and role context',
  'Open Clients from the main authenticated company navigation. An agency administrator or recruiter can create a client organisation record with an optional contact name, contact email, contact phone and internal notes. These are agency-owned records inside the existing company workspace. Creating one does not create or merge an independent Hiring Evidence platform company, add a paid internal user, create a client portal, grant report access or send an invitation. Hiring managers can see the client name and status but not private contact fields or internal client notes. Use Active and Archived to organise records. Archiving preserves history and existing role context but prevents the client from being newly assigned. In Assign a client to a role, choose one company job and either an active client or No client, then save. A role has at most one optional client context. This does not move candidates, change evidence, alter a human decision or bypass company isolation. Client edits and role assignments keep attributed version history; stale saves are blocked and should be reloaded before retrying. The Guide can explain these steps but cannot create, edit, archive or assign a client for the user.',
  'approved', owner.user_id, now(), now()
from (
  select user_id from public.platform_change_owners
  where status = 'active' order by created_at limit 1
) owner
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    approved_by_platform_user_id = excluded.approved_by_platform_user_id,
    approved_at = excluded.approved_at,
    updated_at = excluded.updated_at;
