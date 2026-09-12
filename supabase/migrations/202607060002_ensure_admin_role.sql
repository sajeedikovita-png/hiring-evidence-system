-- Ensure the founder's profile is an active admin (so they can view/approve access requests).
update public.recruiter_profiles
set role = 'admin', status = 'active'
where user_id = '77560c26-93bc-4b8e-a13b-29ebb14b1d3c';
