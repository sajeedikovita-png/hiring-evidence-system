-- Keep approved Guide facts aligned with the candidate workflow release.
-- As in the existing knowledge seed, no active platform owner means no approval.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select
  'candidate-workflow-and-next-actions',
  'Candidate workflow, reviewer and next action',
  'In Jobs, open a role and its Candidates page (/jobs/:jobId/candidates). The Candidate workflow panel is also available in the private evidence report (/reports/:reportId). Select Manage beside a candidate to edit Stage, Assigned reviewer, Next action, and optional Due date and time, then select Save workflow. Stages are New, Evidence review, Interview, Client review and Closed. These stages organise follow-up; they are separate from document processing, report readiness, and the human hiring decision. Moving to Interview or Client review does not schedule an interview or share a report. Closing a workflow does not record a hiring outcome. A hiring decision still requires the separate human review and written reason. Assign only an active reviewer from the same company, or choose Unassigned. An inactive or former assigned reviewer is marked Reassignment needed; choose an active reviewer or Unassigned before saving. Next action accepts up to 500 characters. Example: Ask the candidate to explain their role in the payment integration. Due dates use the browser time zone shown beside the field and are stored in UTC. No reminder email or automatic notification is sent by this feature. Use the Stage filter, My work for candidates assigned to you, and Overdue for open workflows with a past due time. Closed workflows are excluded from Overdue. Workflow activity records saved changes, the reviewer who changed them, and the time; it is not a general team-notes or interview-answer workspace. If another user saves first, the outdated save is blocked and your draft remains in the form. Copy anything you need to retain before selecting Discard draft and reload latest workflows, then review the latest record and re-enter your intended change. Expired access allows reading workflows and View history but prevents saving. Company isolation still applies. The Guide can explain these steps but cannot change workflow records for the user.',
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
