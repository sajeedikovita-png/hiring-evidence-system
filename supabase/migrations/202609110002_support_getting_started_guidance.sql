-- Approved product guidance for common first-use questions. The support assistant
-- may explain these workflows but cannot change hiring records or make decisions.

insert into public.support_knowledge_base_articles (
  slug,
  title,
  body,
  status,
  approved_by_platform_user_id,
  approved_at,
  updated_at
)
select
  seed.slug,
  seed.title,
  seed.body,
  'approved',
  owner.user_id,
  now(),
  now()
from (
  select user_id
  from public.platform_change_owners
  where status = 'active'
  order by created_at
  limit 1
) owner
cross join (
  values
    (
      'workspace-getting-started',
      'Getting started in Hiring Evidence',
      'When a customer asks how to start, use the current page context and give the relevant first action. For a new review: 1. Open Jobs. 2. Create one role using the role title and department. 3. Add each observable, job-related requirement separately. 4. Open Candidates for that role and upload an authorised PDF or DOCX candidate document. 5. Review the extracted source text before requesting an AI-assisted evidence report. 6. Check every source reference, missing-evidence note, and verification question. 7. A human recruiter records the final outcome with a written job-related reason. On the Jobs page, begin with creating the role and its first requirement. On the Pilot access page, begin by reviewing the active term, limits, and named users. On an Evidence report page, begin by checking the source-linked evidence and items needing verification. AI assists; the hiring team decides.'
    ),
    (
      'job-requirement-examples',
      'Writing useful job requirements',
      'A job requirement is one observable skill, responsibility, qualification, or type of experience that the hiring team needs to verify. Add one requirement at a time. For a Frontend Developer, useful examples include: Experience building React applications; Experience integrating REST APIs; Evidence of testing production user interfaces; Experience improving web accessibility; and Experience deploying or maintaining production web applications. Use requirements connected to the work. Do not use personal characteristics such as age, race, religion, nationality, marital status, disability, or family responsibilities. Different job titles can describe similar work; the evidence review uses the requirements entered for the role rather than relying only on an exact title match.'
    ),
    (
      'candidate-document-workflow',
      'Uploading and reviewing candidate documents',
      'Open Candidates from the relevant job, then choose Upload. Confirm that the organisation has permission or another valid basis to process the candidate document. Upload a supported PDF or DOCX file up to the displayed limit. Extracted text must be reviewed before it is sent to the configured AI provider. An AI-assisted report is a draft for human review. Check the source references and verify missing or uncertain information before recording any hiring outcome.'
    ),
    (
      'pilot-access-overview',
      'Understanding pilot access',
      'The controlled paid pilot lasts 30 days and covers one role, up to 50 candidate documents, and up to two named company users. Access is approved for one company context. The customer should use Pilot access to review the term dates, limits, and account rule. Special company access is a controlled, auditable exception approved by the platform owner. Customers should contact support when their displayed access details do not match their written agreement.'
    )
) as seed(slug, title, body)
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    status = 'approved',
    approved_by_platform_user_id = excluded.approved_by_platform_user_id,
    approved_at = excluded.approved_at,
    updated_at = excluded.updated_at;
