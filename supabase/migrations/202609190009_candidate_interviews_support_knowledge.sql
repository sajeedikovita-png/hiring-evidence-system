-- Keep approved Guide facts aligned with the interview and verification workspace.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select
  'candidate-interview-and-verification-workspace',
  'Candidate interview and verification workspace',
  'Open Workflow from the main company navigation, choose a role, and select Interview & verification beside a candidate. Recruiters can save a planned interview date and job-related questions linked to the role criteria. Each record keeps the criterion wording that applied when the question was created. Record the candidate answer, the reviewer observation, a source or reference, and one of four states: Not checked, Candidate explained, Supporting evidence added, or Still unresolved. Candidate explained records what the candidate said and remains an outstanding check. Supporting evidence added requires a source or reference, but the label does not prove that every claim is verified; the reviewer must judge the source. Interview records show the original author, latest editor, dates, versions, and edit history. Schedule changes are also attributable. Another reviewer can edit a record, but stale edits are rejected instead of silently overwriting newer work. These records are private to authorised active members of the same company and are excluded from client summaries and shared reports. They do not change the candidate workflow stage, evidence report, or hiring decision automatically. A final hiring decision remains human-controlled and requires a separate human-entered reason. Saving a planned date does not send an invitation or reminder. Reusable company-wide interview templates and AI-generated interview drafts are not currently included. The Guide can explain this workspace but cannot save interview records for the user.',
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
  'Internal recruiter notes are a separate company-private record available from each candidate; interview answers remain a later workspace.',
  'Internal recruiter notes and Interview & verification are separate company-private records available from each candidate.'
), updated_at = now()
where slug = 'candidate-workflow-and-next-actions';
