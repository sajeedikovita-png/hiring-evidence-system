-- ============================================================================
-- Hiring Evidence System — REAL BACKEND BOOTSTRAP
-- Run this AFTER schema.sql, and AFTER you have created your login user.
--
-- 1. Edit ONLY the one line marked  << REPLACE  below: put in the SAME email you
--    used when you created your login (Authentication -> Users).
-- 2. Paste the whole file into the Supabase SQL Editor and click Run.
--
-- It finds your login by that email automatically (no UID to copy), creates your
-- company, links your login to it (so row-level security lets you see your data),
-- and loads a little starter data so the app is not empty. Run it ONCE.
-- ============================================================================
do $$
declare
  v_email   text := 'myriadlooptech@gmail.com';   -- login email (bootstrap finds this user automatically)
  v_user_id uuid;
  v_company_id uuid;
  v_profile_id uuid;
  v_job_id uuid;
  v_req1_id uuid;
  v_req2_id uuid;
  v_cand1_id uuid;
  v_cand2_id uuid;
  v_app1_id uuid;
  v_app2_id uuid;
  v_report_id uuid;
begin
  -- Find your login account by email (created under Authentication -> Users).
  select id into v_user_id from auth.users where lower(email) = lower(trim(v_email));

  if v_user_id is null then
    raise exception 'No login found for "%". Create the user under Authentication -> Users first (with Auto Confirm ON), then run this again.', v_email;
  end if;

  -- Safety: if this login is already set up, stop instead of making a duplicate company.
  if exists (select 1 from public.recruiter_profiles where user_id = v_user_id) then
    raise exception 'This login is already set up. You can sign in now — no need to run bootstrap again.';
  end if;

  -- Company
  insert into public.companies (name)
  values ('Northstar Digital')
  returning id into v_company_id;

  -- Your recruiter profile — this is what links your login to the company.
  -- Row-level security uses it to decide what data you can see.
  insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
  values (v_company_id, v_user_id, 'Sarah Tan', v_email, 'recruiter', 'active')
  returning id into v_profile_id;

  -- A job + its requirements
  insert into public.job_roles (company_id, created_by_profile_id, title, department, location, employment_type, status)
  values (v_company_id, v_profile_id, 'Frontend Developer', 'Product Engineering', 'Singapore / Remote', 'Full-time', 'open')
  returning id into v_job_id;

  insert into public.job_requirements (company_id, job_id, label, description, priority, sort_order)
  values (v_company_id, v_job_id, 'React production experience', 'Evidence of shipping and maintaining production React interfaces.', 'required', 1)
  returning id into v_req1_id;

  insert into public.job_requirements (company_id, job_id, label, description, priority, sort_order)
  values (v_company_id, v_job_id, 'AWS deployment work', 'Evidence of owning or supporting AWS deployment workflows.', 'preferred', 2)
  returning id into v_req2_id;

  -- Two candidates
  insert into public.candidates (company_id, name, email, source)
  values (v_company_id, 'Priya Shah', 'priya.shah@example.com', 'bulk_upload')
  returning id into v_cand1_id;

  insert into public.candidates (company_id, name, email, source)
  values (v_company_id, 'Daniel Morris', null, 'bulk_upload')
  returning id into v_cand2_id;

  -- Their applications to the job
  insert into public.candidate_applications (company_id, job_id, candidate_id, status, consent_status)
  values (v_company_id, v_job_id, v_cand1_id, 'report_ready', 'recorded')
  returning id into v_app1_id;

  insert into public.candidate_applications (company_id, job_id, candidate_id, status, consent_status)
  values (v_company_id, v_job_id, v_cand2_id, 'needs_review', 'recorded')
  returning id into v_app2_id;

  -- An uploaded resume for candidate 1
  insert into public.uploaded_documents (
    company_id, application_id, candidate_id, uploaded_by_profile_id,
    file_name, storage_path, file_type, file_size_bytes, upload_status, parsing_status
  )
  values (
    v_company_id, v_app1_id, v_cand1_id, v_profile_id,
    'Priya Shah resume.pdf', 'demo/priya-shah-resume.pdf', 'pdf', 220000, 'accepted', 'parsed'
  );

  -- A strong evidence report for candidate 1
  insert into public.evidence_reports (
    company_id, job_id, application_id, candidate_id, public_report_code, status,
    evidence_summary, missing_evidence, verification_needed,
    suggested_interview_questions, recruiter_notes, fairness_check
  )
  values (
    v_company_id, v_job_id, v_app1_id, v_cand1_id, 'HER-LIVE-0001', 'Evidence report ready',
    '[{"label":"Evidence match","value":"Strong evidence","detail":"Every required criterion has job-related evidence.","tone":"success"},
      {"label":"Verification needed","value":"1 area to confirm","detail":"Confirm AWS deployment depth in the interview.","tone":"warning"},
      {"label":"Missing evidence","value":"No major gaps","detail":"All required criteria are supported by evidence.","tone":"success"},
      {"label":"Human decision","value":"Decision reason required","detail":"Final decisions stay with the hiring team.","tone":"info"}]'::jsonb,
    '["No major evidence gaps. Confirm AWS deployment depth during the interview."]'::jsonb,
    '["AWS deployment work: confirm depth of deployment ownership in the interview"]'::jsonb,
    '["Walk us through a production React app you shipped and maintained.","Which parts of the AWS deployment pipeline did you personally own?","How did you partner with product and design on a recent release?"]'::jsonb,
    '["Strong, well-evidenced React delivery.","Confirm AWS ownership depth, then consider shortlisting for interview."]'::jsonb,
    '{"status":"Fairness check passed","protectedCharacteristicsStatus":"Protected characteristics not used","decisionWordingWarning":"None","reminder":"Human review reminder: verify the evidence and decision wording before saving a final outcome.","protectedCharacteristics":["Age","Gender","Race","Religion","Marital status","Pregnancy or caregiving status","Disability or mental health status","Photo","Nationality unless job-relevant"]}'::jsonb
  )
  returning id into v_report_id;

  -- Evidence rows for that report
  insert into public.evidence_items (
    company_id, report_id, application_id, requirement_id, requirement,
    candidate_evidence, source, confidence, verification_needed, status_label, status_tone
  )
  values
    (v_company_id, v_report_id, v_app1_id, v_req1_id, 'React production experience',
     'Resume shows four years shipping production React apps and leading a shared component library used across three products.',
     'Resume', 'High', 'None', 'Strong evidence', 'success'),
    (v_company_id, v_report_id, v_app1_id, v_req2_id, 'AWS deployment work',
     'Resume lists owning the CI/CD pipeline that deploys the web app to AWS (S3 and CloudFront).',
     'Resume', 'Medium', 'Confirm depth of deployment ownership in the interview', 'Needs verification', 'warning');

  raise notice 'Bootstrap complete. company_id=%, profile_id=%, report_code=HER-LIVE-0001', v_company_id, v_profile_id;
end $$;
