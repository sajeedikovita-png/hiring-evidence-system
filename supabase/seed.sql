insert into public.companies (id, name, status, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'Northstar Digital', 'active', '2026-05-01T08:00:00Z', '2026-05-01T08:00:00Z')
on conflict (id) do nothing;

insert into public.recruiter_profiles (id, company_id, user_id, display_name, email, role, status, created_at, updated_at)
values
  (
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    'Sarah Tan',
    'sarah@northstar.example',
    'recruiter',
    'active',
    '2026-05-01T08:10:00Z',
    '2026-05-01T08:10:00Z'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333332',
    'Maya Chen',
    'maya@northstar.example',
    'recruiter',
    'active',
    '2026-05-02T09:30:00Z',
    '2026-05-02T09:30:00Z'
  )
on conflict (company_id, user_id) do nothing;

insert into public.job_roles (id, company_id, created_by_profile_id, title, department, location, employment_type, status, created_at, updated_at)
values
  (
    '44444444-4444-4444-8444-444444444441',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222221',
    'Frontend Developer',
    'Product Engineering',
    'Singapore / Remote',
    'Full-time',
    'open',
    '2026-05-18T09:00:00Z',
    '2026-05-23T03:00:00Z'
  )
on conflict (id) do nothing;

insert into public.job_requirements (id, company_id, job_id, label, description, priority, sort_order, created_at)
values
  (
    '55555555-5555-4555-8555-555555555551',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444441',
    'React production experience',
    'Evidence of shipping and maintaining production React interfaces.',
    'required',
    1,
    '2026-05-18T09:10:00Z'
  ),
  (
    '55555555-5555-4555-8555-555555555552',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444441',
    'AWS deployment work',
    'Evidence that the candidate has owned or supported AWS deployment workflows.',
    'preferred',
    2,
    '2026-05-18T09:11:00Z'
  ),
  (
    '55555555-5555-4555-8555-555555555553',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444441',
    'Role-related collaboration',
    'Evidence of working with product, design, or customer-facing teams.',
    'required',
    3,
    '2026-05-18T09:12:00Z'
  )
on conflict (id) do nothing;

insert into public.candidates (id, company_id, name, email, source, created_at, updated_at)
values
  (
    '66666666-6666-4666-8666-666666666661',
    '11111111-1111-4111-8111-111111111111',
    'Amanda Lee',
    'amanda@example.com',
    'bulk_upload',
    '2026-05-21T06:00:00Z',
    '2026-05-21T06:00:00Z'
  )
on conflict (id) do nothing;

insert into public.candidate_applications (id, company_id, job_id, candidate_id, status, consent_status, applied_at, created_at, updated_at)
values
  (
    '77777777-7777-4777-8777-777777777771',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444441',
    '66666666-6666-4666-8666-666666666661',
    'report_ready',
    'recorded',
    '2026-05-21T06:00:00Z',
    '2026-05-21T06:00:00Z',
    '2026-05-21T08:15:00Z'
  )
on conflict (job_id, candidate_id) do nothing;

insert into public.uploaded_documents (
  id,
  company_id,
  application_id,
  candidate_id,
  uploaded_by_profile_id,
  file_name,
  storage_path,
  file_type,
  file_size_bytes,
  upload_status,
  parsing_status,
  created_at,
  updated_at
)
values
  (
    '88888888-8888-4888-8888-888888888881',
    '11111111-1111-4111-8111-111111111111',
    '77777777-7777-4777-8777-777777777771',
    '66666666-6666-4666-8666-666666666661',
    '22222222-2222-4222-8222-222222222221',
    'Amanda Lee resume.pdf',
    'companies/11111111-1111-4111-8111-111111111111/jobs/44444444-4444-4444-8444-444444444441/applications/77777777-7777-4777-8777-777777777771/amanda-lee-resume.pdf',
    'pdf',
    1048576,
    'accepted',
    'parsed',
    '2026-05-21T06:00:00Z',
    '2026-05-21T06:05:00Z'
  )
on conflict (id) do nothing;

insert into public.parsed_cvs (
  id,
  company_id,
  document_id,
  application_id,
  status,
  extracted_name,
  extracted_email,
  extracted_skills,
  extracted_experience,
  parse_warnings,
  created_at,
  updated_at
)
values
  (
    '99999999-9999-4999-8999-999999999991',
    '11111111-1111-4111-8111-111111111111',
    '88888888-8888-4888-8888-888888888881',
    '77777777-7777-4777-8777-777777777771',
    'parsed',
    'Amanda Lee',
    'amanda@example.com',
    '["React", "TypeScript", "Dashboard delivery"]'::jsonb,
    '["Shipped production dashboards", "Worked with product and design teams"]'::jsonb,
    '["AWS ownership needs verification"]'::jsonb,
    '2026-05-21T06:02:00Z',
    '2026-05-21T06:05:00Z'
  )
on conflict (id) do nothing;

insert into public.evidence_reports (
  id,
  company_id,
  job_id,
  application_id,
  candidate_id,
  public_report_code,
  status,
  evidence_summary,
  missing_evidence,
  verification_needed,
  suggested_interview_questions,
  recruiter_notes,
  fairness_check,
  generated_at,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444441',
    '77777777-7777-4777-8777-777777777771',
    '66666666-6666-4666-8666-666666666661',
    'HER-2026-0521-AL',
    'Human review required',
    '[{"label":"Evidence match","value":"Good evidence, verification needed","detail":"Evidence is organized by job-related criteria."}]'::jsonb,
    '["No clear evidence that Amanda owned AWS deployment decisions."]'::jsonb,
    '["AWS deployment work: Ask candidate directly"]'::jsonb,
    '["What AWS deployment work did you personally own, and what parts were handled by others?"]'::jsonb,
    '["Verify AWS ownership before moving past interview review."]'::jsonb,
    '{"status":"Fairness check passed","protectedCharacteristicsStatus":"Protected characteristics not used","decisionWordingWarning":"None","reminder":"Human review reminder: verify evidence and decision wording before saving a final outcome."}'::jsonb,
    '2026-05-21T08:15:00Z',
    '2026-05-21T08:15:00Z',
    '2026-05-21T08:15:00Z'
  )
on conflict (company_id, public_report_code) do nothing;

insert into public.evidence_items (
  id,
  company_id,
  report_id,
  application_id,
  requirement_id,
  requirement,
  candidate_evidence,
  source,
  confidence,
  verification_needed,
  status_label,
  status_tone,
  created_at
)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '77777777-7777-4777-8777-777777777771',
    '55555555-5555-4555-8555-555555555551',
    'React production experience',
    'Resume shows two shipped dashboard projects using React',
    'Resume',
    'High',
    'Ask architecture question',
    'Strong evidence',
    'success',
    '2026-05-21T08:15:00Z'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '77777777-7777-4777-8777-777777777771',
    '55555555-5555-4555-8555-555555555552',
    'AWS deployment work',
    'No clear deployment ownership found',
    'Resume',
    'Low',
    'Ask candidate directly',
    'Needs verification',
    'warning',
    '2026-05-21T08:15:00Z'
  )
on conflict (id) do nothing;

insert into public.human_review_decisions (
  id,
  company_id,
  report_id,
  application_id,
  recruiter_profile_id,
  decision,
  reason,
  status,
  created_at
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '77777777-7777-4777-8777-777777777771',
    '22222222-2222-4222-8222-222222222221',
    'Request more information',
    'AWS deployment ownership needs interview verification.',
    'draft',
    '2026-05-21T08:20:00Z'
  )
on conflict (id) do nothing;

insert into public.audit_log_entries (
  id,
  company_id,
  actor_profile_id,
  entity_type,
  entity_id,
  action,
  metadata,
  created_at
)
values
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222221',
    'evidence_report',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'evidence_report_read',
    '{"source":"seed"}'::jsonb,
    '2026-05-21T08:21:00Z'
  )
on conflict (id) do nothing;
