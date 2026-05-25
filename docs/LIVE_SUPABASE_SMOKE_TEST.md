# Live Supabase Smoke Test

## Purpose

This checklist proves the Hiring Evidence System can run against a real Supabase development backend instead of only the seed fallback.

This is still a development smoke test. It does not add real upload storage, AI parsing, payment, email, PDF export, or analytics.

Core principle:

AI assists. Human decides. Evidence explains.

## Setup Steps

1. Create a Supabase development project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. Create or invite a development auth user in Supabase Auth.
6. Copy the auth user UUID.
7. Update the seeded recruiter profile so it belongs to that auth user:

```sql
update public.recruiter_profiles
set user_id = 'PASTE_AUTH_USER_UUID_HERE'
where email = 'sarah@northstar.example';
```

8. Copy `.env.example` to `.env.local`.
9. Add the Supabase browser credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

10. Start the app:

```bash
npm run dev
```

11. Open `http://localhost:3000/dashboard`.

## Development Connection Status

The app shows a development-only backend status panel in recruiter pages.

Expected states:

- `Seed fallback mode`: Supabase env vars are missing and the app is using local seed data.
- `Supabase connected mode`: Supabase env vars exist and the app is using the Supabase repository.
- `Missing env vars`: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `Auth user missing`: sign in with a Supabase development auth user.
- `Company context missing`: create or update a matching `recruiter_profiles` row for the auth user.

## Manual Smoke-Test Checklist

- Login/auth user is detected by Supabase.
- Active company context loads from `recruiter_profiles`.
- Dashboard loads from Supabase tables.
- Report route `/reports/:reportId` loads from Supabase.
- Human decision saves into `human_review_decisions`.
- Audit entry saves into `audit_log_entries` when the human decision is saved.
- Another company workspace cannot load this company report.

## Suggested Smoke-Test Queries

Check the active recruiter profile:

```sql
select id, company_id, user_id, display_name, email, status
from public.recruiter_profiles
where email = 'sarah@northstar.example';
```

Check the seeded report code:

```sql
select id, company_id, public_report_code, status
from public.evidence_reports
where public_report_code = 'HER-2026-0521-AL';
```

After saving a human decision in the app:

```sql
select id, company_id, report_id, application_id, decision, reason, created_at
from public.human_review_decisions
order by created_at desc
limit 5;
```

Confirm the audit entry:

```sql
select id, company_id, entity_type, entity_id, action, created_at
from public.audit_log_entries
where action = 'human_review_decision_saved'
order by created_at desc
limit 5;
```

## Cross-Company Isolation Check

Create a second company and a second recruiter profile for a different auth user. Then try to open the first company's report route while signed in as the second company user.

Expected result:

- The report does not load.
- The app shows a safe report access message.
- No candidate evidence from the first company is shown.

## Troubleshooting

- If the panel shows `Missing env vars`, confirm `.env.local` exists and restart `npm run dev`.
- If the panel shows `Auth user missing`, confirm the browser session is signed in with Supabase Auth.
- If the panel shows `Company context missing`, confirm `recruiter_profiles.user_id` matches the auth user UUID.
- If the dashboard or report cannot load, confirm `supabase/schema.sql` and `supabase/seed.sql` were run in the same project.
- If decision save fails, confirm the active user has a matching recruiter profile and RLS policies are enabled from `supabase/schema.sql`.
