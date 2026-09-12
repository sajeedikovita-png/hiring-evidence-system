# Hiring Evidence Admin Login Handoff — 2026-08-13

## Confirmed work

- Resend's `hiringevidence.com` sending domain was verified.
- A Resend sending-only API key was created and entered into Supabase's Custom SMTP form. The form used `noreply@hiringevidence.com`, sender name `Hiring Evidence`, host `smtp.resend.com`, port `465`, and username `resend`.
- The Supabase form's **Save changes** action was pressed. A separate end-to-end password-reset email test is still required before treating SMTP delivery as verified.
- A Supabase Auth user for `myriadlooptech@gmail.com` was created in the `hiring-evidence-system-dev` project. The owner selected a strong password and saved it in Safari/iCloud Keychain. Never record or request that password.

## Not completed

- The new Auth user has **not** been linked to an active `recruiter_profiles` admin profile. Do not treat it as an application administrator yet.
- The intended company workspace must be chosen before granting access. The existing options observed in the live database are `Northstar Digital`, `Rival Talent Review`, and `QA Other Company`. The approved project implementation plan identifies `Northstar Digital` as the original owner workspace, but the owner has not yet explicitly confirmed that choice for this new business login.
- The website login page exists at `/login`, but the current project checkout has no implemented `/admin/access-requests` or `/set-password` page. Those appear only in saved planning documents.
- The complete browser test is still pending: sign in with the business email, confirm an active company context, and load `/dashboard`.

## Safe next steps

1. Ask the owner to confirm the target company workspace (recommended: `Northstar Digital`).
2. In Supabase SQL Editor, link the new Auth user's UUID to one active `recruiter_profiles` row with role `admin` for that company. Use an idempotent `insert ... on conflict` statement; do not create a duplicate company.
3. Open the deployed site's `/login` page. The owner enters the Keychain-managed password themselves.
4. Verify the dashboard loads and that the company context is present.
5. Only after successful login, test one password-recovery email to prove the Resend/Supabase SMTP connection.

## Security notes

- Do not paste API keys, passwords, reset links, or database credentials into chat, source control, or this handoff.
- Do not remove or alter the existing `sajeedikovita@gmail.com` account until the new business login is verified end to end.
