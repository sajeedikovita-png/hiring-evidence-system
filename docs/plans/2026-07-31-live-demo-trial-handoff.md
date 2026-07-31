# Live Demo Trial Handoff

## Goal

Create a real, company-isolated Hiring Evidence trial: approval creates a workspace, the 14-day trial begins on the customer's first dashboard visit, access becomes read-only for 7 days after trial expiry, and then demo data is deleted unless the company continues.

## Confirmed decisions

- Trial length: 14 days.
- Start date: first successful dashboard visit, not approval or invitation.
- After 14 days: view-only; customers can still show their work internally.
- View-only grace period: 7 days.
- The product must show the expiry and deletion dates, with stronger reminders during the final 4 trial days.
- After the grace period: delete demo workspace data unless the company continues; retain only a minimal non-person operational record.

## Finished and live

- Existing `access_requests` approval table retained. It contains the earlier approval flow and was not duplicated or deleted.
- Added the `demo_entitlements` database table to store the trial state and dates for each company.
- Added server-side functions that activate a pending trial once, enforce the write boundary, and provision a company workspace atomically.
- Added database policies that allow expired trial companies to read their work while blocking inserts, updates, and deletes.
- Upgraded and deployed the live `approve-request` Edge Function. A new approval now creates an isolated company workspace, a customer administrator, and a pending trial entitlement.
- Verified the live database contains the trial table, all three trial functions, and all four candidate access policies.

## Implemented locally but not deployed to the website

- Dashboard activation call: on a Supabase-backed dashboard open, it activates the pending trial and reads the trial status.
- Trial banner: shows days remaining during the trial, states that the workspace becomes view-only for seven days, and warns of deletion during the view-only period.
- Local validation passed: demo lifecycle test, typecheck, test suite, and production build.

## Still pending

1. Deploy the website code containing the dashboard activation and visible trial banner.
2. Replace the current sample-style upload path with a real Supabase Storage upload path for customer CV files. The current code does not yet store real uploaded CV files in Supabase Storage.
3. Add the scheduled cleanup job for expired trials. It must remove database workspace records and the corresponding real storage files after the seven-day view-only period, then keep only a minimal non-person closure record.
4. Add an administrator-facing conversion path so a continuing company is marked `converted` and is excluded from trial expiry and deletion.
5. Run an end-to-end live test using a fresh test company:
   - submit a request-access form;
   - approve it as the platform administrator;
   - complete invitation and password setup;
   - open the customer dashboard and confirm the fourteen-day start is recorded;
   - verify company isolation;
   - simulate or safely test trial expiry and confirm writes are blocked while reads remain available;
   - confirm the seven-day deletion warning.
6. Only after the real upload path exists, test the cleanup with non-production test data. Do not delete existing customer data during that test.

## Important current limitations

- The user-facing countdown is not yet live because the website code has not been deployed.
- Automatic data deletion is not live because the real file-storage path and scheduled cleanup job do not exist yet.
- Do not claim an invitation/login flow is complete until password setup and dashboard login have been verified end to end.

