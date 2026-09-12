# Owner test guide — 10 September 2026

Use the [customer site](https://hiringevidence.com). The professional marketing interface and current application release are live on the production custom domain.

Record every live finding and retest result in `docs/OWNER_ACCEPTANCE_TEST_FINDINGS_2026-09-11.md`.

## Test sequence

1. Open `/login` and sign in with the existing owner account, `myriadlooptech@gmail.com`. Platform-only owners should reach `/admin/access-requests`.
   If the password is unknown, choose **Forgot your password?**, request a recovery email, and open its link before entering the new password. Opening `/set-password` directly does not create a recovery session.
2. In a separate browser profile, open `/request-pilot`. Check the S$500 one-time pilot, three S$800 founding ongoing terms, and disclosed S$1,400 standard price from term four. Submit a test request using an email account you control.
3. Return to the owner profile. Review that request and approve it. New customers receive their own company workspace. Approval may send a real invitation to the requested email; use only your controlled test address.
   Repeating a request with the same email does not create another pending request or workspace. If the email already has active access, direct the person to sign in or reset their password.
4. Open the invitation, set a password of at least 12 characters, and sign in. Open **Pilot access** and intentionally start it. Expect 30 days, one role, 50 documents, and two users for a new pilot.
5. Open **Jobs**, create a role and at least one required job-related criterion. Create a second role to confirm the pilot quota prevents it.
6. Upload a synthetic PDF or DOCX under the first job. Confirm the uploader attestation, open the private source, and choose **Manual review**. On that page, choose **Extract source text for review**. Check the preview, acknowledge the provider disclosure, and explicitly send the text for an AI evidence report. This button uses the configured provider and can incur a provider charge. The manual form remains available if you prefer to enter the evidence and source reference yourself.
7. Open the resulting report. Confirm **Consent missing** and unverified safeguards remain honest. Select a human outcome: saving must require a reason. Save it, reload, and confirm the recorded decision and reason persist.
8. From **Pilot access**, accept the ongoing-access terms and submit a request. In the owner profile, open **Ongoing access**, enter the review note and payment-agreement confirmation, and approve. For a test workspace, clearly record that confirmation is simulated; this does not collect money.
9. Back in the customer profile, intentionally start the approved term. Expect 10 total roles, 500 new documents per 30-day term, and 5 users. Existing data remains visible. A new request is required after expiry; there is no automatic renewal charge.
10. Sign out and confirm protected routes require authentication. Record any issue with the route, steps, expected behavior, and actual behavior. Do not put passwords, invitation links, or candidate documents into an issue.

## Company access administration

- One email identifies one person, and each person has one active company membership in this release.
- Use **Special company access** on the administrator access-request page to add a separate employee to an existing company. Select the company and role, then enter a specific written reason.
- Select the transfer checkbox only after verifying that the person should lose access to their previous company. A successful transfer disables the previous membership and records the platform administrator, reason, role, and previous company in the audit trail.
- The target company's user limit still applies: two users for the pilot and five for ongoing access.
- Multi-company access and shared logins are not supported. Renewals and ongoing access use the existing company rather than creating another pilot workspace.

## What was verified before handover

Primary-agent tests exercised the complete manual workflow against the linked Supabase project, including public request/isolated approval, private upload and source download, persisted decision plus audit, ongoing approval/start, anonymous and cross-company denial, and expired-write denial. Browser password setup was tested with a generated recovery link and a disposable account, then sign-out and password sign-in. No invitation email was sent during automated acceptance.

All required repository checks passed: typecheck, the full 11-script test chain, production build, and high-severity dependency audit. Seven document-analysis Edge Function tests passed in addition to the earlier access-function tests. Database rollback checks covered lifecycle, workflow, access isolation, storage, and membership quotas. The production build retains a size advisory for its main JavaScript bundle.

AI verification used exactly one authorized live synthetic text request, which returned successfully from the configured model. The new uploaded-document pipeline was then tested in the built browser with real private Supabase storage/auth/database and an injected recorded provider response; no second external provider call was made. Fourteen handler integration assertions and seventeen database assertions passed. Saving a human decision on that AI-draft report, reloading its reason, and verifying its database audit also passed. This distinguishes provider connectivity from full live-provider acceptance of the new report contract.

## Release boundaries

- AI-assisted evidence authoring and manual fallback are available. PDF/DOCX extraction is limited to 10 MB, 25 PDF pages, and 24,000 characters. Truncated, scanned/image-only, password-protected, or unreadable sources require manual review. Each document allows at most two processing attempts; a completed retry reuses its report. 
- Ongoing payment is an explicit manual agreement/approval workflow. There is no online collection, automatic charging, or automatic renewal.
- Additional company members require operator-managed onboarding; no self-service team-invitation screen was added.
- Actual invitation email delivery remains a test for an address you control. Supabase's invitation app URL and allowed redirects now point to the production domain.
- These checks do not establish Singapore legal compliance, government endorsement, customer willingness to pay, or suitability for real candidate data at commercial scale.
