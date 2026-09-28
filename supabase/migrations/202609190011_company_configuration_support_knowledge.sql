-- Keep approved Guide facts aligned with company configuration controls.
insert into public.support_knowledge_base_articles (
  slug, title, body, status, approved_by_platform_user_id, approved_at, updated_at
)
select
  'company-settings-feature-packages-and-custom-work',
  'Company settings, feature packages, and custom work',
  'Open Company from the main signed-in navigation. Company administrators can change the supported company display name, a secure logo URL, one of the supplied readable accent colours, labels for the five fixed workflow stages, up to five job-related custom field definitions, review instructions, and client-summary heading and footer. The page shows a live preview and can reset supported settings to defaults. Each save creates an attributable settings version; resetting or changing settings does not rewrite earlier candidate, interview, decision, or template records. Review and report templates are immutable versions. Selecting a new version changes the future default and retains earlier versions. Recruiters and hiring managers can read the company settings but only a company administrator can save them. Expired or read-only company access also prevents saving. Separately agreed feature packages appear on the same page, but only an authorised platform administrator can enable or disable them with a written reason and optional dates. Disabling a package prevents future use where the package is enforced and does not silently delete earlier company records. The current package keys are custom report branding, custom workflow labels, review and report templates, and bespoke extensions. A custom-work request records the problem, desired job-related outcome, and expected data impact. Submission does not approve development, accept a quote, charge the company, or deploy a change. Platform progress is recorded through request, clarification, feasibility, written scope and quote, preview, acceptance, enablement, maintenance, and closed stages. Production changes still require owner review. The Guide can explain these controls but cannot change settings, enable packages, accept work, or deploy changes for the user.',
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
  'Privacy and data records candidate information requests for human handling. Support records problems and feature requests.',
  'Company holds supported workspace settings, controlled feature-package status, and reviewed custom-work requests. Privacy and data records candidate information requests for human handling. Support records problems and general feature requests.'
), updated_at = now()
where slug = 'product-navigation';
