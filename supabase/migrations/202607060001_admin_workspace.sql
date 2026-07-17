-- Founder admin workspace: a company + an admin recruiter profile for the invited login,
-- so signing in lands on an admin who can view and approve access requests.
do $$
declare
  v_user_id uuid := '77560c26-93bc-4b8e-a13b-29ebb14b1d3c';
  v_email   text := 'sajeedikovita@gmail.com';
  v_company_id uuid;
begin
  if exists (select 1 from public.recruiter_profiles where user_id = v_user_id) then
    raise notice 'Admin profile already exists for %, skipping.', v_email;
    return;
  end if;

  insert into public.companies (name)
  values ('Northstar Digital')
  returning id into v_company_id;

  insert into public.recruiter_profiles (company_id, user_id, display_name, email, role, status)
  values (v_company_id, v_user_id, 'Sajeewa', v_email, 'admin', 'active');

  raise notice 'Admin workspace ready: company=%, user=%', v_company_id, v_user_id;
end $$;
