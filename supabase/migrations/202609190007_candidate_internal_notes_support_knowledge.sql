-- Keep approved Guide facts aligned with the private internal-notes release.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select
  'candidate-internal-recruiter-notes',
  'Private internal recruiter notes',
  'Open Workflow from the main company navigation, choose a role, and select Internal notes beside a candidate. The same notes are available on that candidate''s authenticated private evidence report. Internal notes are visible only to authorised active members of the same company. They are excluded from client summaries, shared reports, public samples and hiring decisions. Choose Candidate explanation for information the candidate provided, Reviewer observation for the recruiter''s own job-related observation, or Verification record for a check and its source. A label does not independently prove a claim; write what was checked, the source, and what remains unresolved. Notes accept plain text up to 4,000 characters. The author and time are recorded. Only the original active author can edit a note, edits are marked, and View note history shows attributed versions. Removed accounts retain a display-name snapshot for accountability without exposing the former account identifier. Another company cannot read or change the notes. Expired or read-only access permits reading but prevents new notes and edits. Notes never change workflow stage, evidence findings or the human hiring decision automatically. A final hiring decision still requires a separate human-entered reason. The Guide can explain notes but cannot create, edit or share them for the user.',
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

update public.support_knowledge_base_articles
set body = replace(
  body,
  'Workflow activity records saved changes, the reviewer who changed them, and the time; it is not a general team-notes or interview-answer workspace.',
  'Workflow activity records saved stage and task changes, the reviewer who changed them, and the time. Internal recruiter notes are a separate company-private record available from each candidate; interview answers remain a later workspace.'
), updated_at = now()
where slug = 'candidate-workflow-and-next-actions';
