-- Keep approved Guide facts aligned with candidate identity, public evidence,
-- and controlled client sharing.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select seed.slug, seed.title, seed.body, 'approved', owner.user_id, now(), now()
from (
  select user_id from public.platform_change_owners
  where status = 'active' order by created_at limit 1
) owner
cross join (
  values
    (
      'candidate-identity-on-reports',
      'Candidate name used in reports',
      'On an authenticated private evidence report, use Confirm candidate name to record the display name that should appear in reports. Check it against an authorised source, enter the name and a job-related reason, then select Record candidate name. The system keeps the reviewer, time, reason, version, previous name and new name in Name history. This records the report label only. It does not independently verify identity, qualifications, consent or sharing permission. If no name has been human-recorded, the private report shows Name not recorded instead of substituting the uploaded filename. A newly created client-summary snapshot uses the recorded name. Changing the name later does not rewrite an earlier immutable shared snapshot.'
    ),
    (
      'candidate-confirmed-public-professional-evidence',
      'Candidate-confirmed public professional evidence',
      'On an authenticated evidence report, Public professional evidence can compare candidate-confirmed LinkedIn, GitHub, portfolio, app-store, publication or other public-source text with the role criteria and uploaded evidence. Enter the source type, a clear title, an HTTPS URL and the relevant pasted public text, then confirm that the candidate supplied or confirmed the link and that the organisation is authorised to use the job-related information. The AI analyses only the pasted text. It does not open or read the URL, search the web, scrape a profile, inspect photographs or social activity, rank candidates, or make the hiring decision. Results show supporting facts, differences from resume evidence and verification questions. Supporting evidence still needs human source checking. The pasted text is removed after analysis, while the result and source reference remain available after reload.'
    ),
    (
      'candidate-sharing-authority-and-client-links',
      'Candidate sharing authority and controlled client links',
      'Before creating an expiring client link, open Prepare a client summary on the authenticated evidence report and record the authority for sharing that candidate summary. Choose Candidate confirmation, Documented recruitment process, or Other documented authority, add the source or reference and an optional note, then save. This is separate from the upload-processing acknowledgement. Hiring Evidence records the reviewer, time, basis and version but does not decide whether sharing is legally permitted. Preview the client summary before creating the link. Choose an expiry from 1 to 30 days and whether to include the latest recorded human decision and reason. The resulting URL is a bearer link: anyone holding it can open the frozen summary until it expires or is revoked, and it does not require named-recipient sign-in. Internal notes, interview records, private document links and audit records are excluded. Revoking the candidate sharing authority permanently revokes every active link for that candidate application. Recording authority again later does not revive an older revoked link. A saved or printed copy cannot be revoked.'
    )
) as seed(slug, title, body)
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    status = 'approved',
    approved_by_platform_user_id = excluded.approved_by_platform_user_id,
    approved_at = excluded.approved_at,
    updated_at = excluded.updated_at;
