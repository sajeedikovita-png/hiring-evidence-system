# Release checkpoint — 19 September 2026

## Review target

Preview: https://hiring-evidence-system-9bj74co3e-sajeewas-projects-b911d5d0.vercel.app

Current status: production publication was subsequently authorized and completed at https://hiringevidence.com. All four pending migrations applied. The preview link remains an earlier review artifact. No customer payment, email, or report share has been sent.

## Implemented

- S$149 per company per 30-day term; 2 named users, 2 active roles, 50 new documents; initial 30-minute setup and email support; manual renewal.
- Versioned legacy agreement preservation, auditable first-five payment confirmations and 12-month price protection.
- Close/reopen roles, retain evidence and decisions, reject uploads to closed roles.
- Client summary preview, selective decision inclusion, browser print/save PDF, expiry/revocation.
- Draft outreach and founder script with the same offer. No message sent.

## Sharing boundary

The implementation uses a random secret bearer link, not recipient login. Anyone holding a valid link may view the approved snapshot. This differs from the stronger recipient-bound requirement in the original plan and must not be advertised as identity-verified sharing. Internal notes, private source links and document downloads are excluded; saved copies cannot be recalled. Revoke and reissue after corrections.

## Verification evidence

- npm run typecheck, npm run test, npm run build, npm audit --audit-level=high passed; audit zero vulnerabilities.
- Isolated PostgreSQL suites cover pricing, legacy terms, quota overflow, sharing scope/expiry/revocation, role closure, permissions and preserved evidence.
- All three September 19 migrations plus actual share create/read/revoke ran against the linked schema inside BEGIN/ROLLBACK. Nothing persisted.
- Local browser inspection verified public sample handoff preview and invalid-link unavailable state. After the token-refresh fix, the local Jobs page loaded and close-role confirmation/cancel controls worked; no live role was changed.
- Existing PDF font and large bundle warnings remain; no claim of unrestricted launch readiness.

## Remaining release work

1. Completed: auth-loading fix, regression tests, local Jobs browser check, full required checks, and refreshed preview.
2. Completed: owner authorized publication, four ordered migrations applied, and production frontend deployed.
3. Completed in part: live homepage pricing/workspace/invalid-link checked; deployed database close/reopen/share create/read/revoke passed in rollback transactions. Quota and expiry behavior covered by isolated database tests. Full fresh-customer UI journey remains open.
4. Verify fresh invitation/recovery and support email delivery, plus actual privacy data operations.
5. Completed: downloaded narration extracted, chapter 13 normalized to -19.27 LUFS, interactive audio refreshed, and detailed master rebuilt (524.328 seconds). Pricing recap is a steady original branded slide. Previous versions are backed up.
6. Record new handoff visuals only after the deployed backend is verified. Recipient authentication remains a separate improvement.

The short homepage overview contains no price claims and is unchanged. The downloaded ElevenLabs ZIP was found and processed successfully; detailed chapter 13 now uses the new S$149 narration. Full MP4 decoded without errors. The new sharing-feature insert is specified but not yet recorded.

## Owner release decision

The owner initially chose preview, then explicitly authorized publication. The later instruction supersedes the preview-only decision. See production verification below.


## Production authorization and release — later 19 September

Owner subsequently authorized publication: "we can publish evething if no bugs". Required typecheck/test/build/high audit passed; zero dependency vulnerabilities. All four pending migrations (September 18 pricing, September 19 pricing, report shares, role status) applied successfully. Vercel production deployment aliased hiringevidence.com successfully.

Post-release verification: refreshed live homepage shows S$149; authenticated Jobs loads with Close role control; invalid share shows only Summary unavailable. Actual deployed database share create/read/revoke and role close/reopen/report retention passed inside rolled-back transactions. No test shares or role changes persisted. This verifies those paths, not every customer onboarding/email/privacy operation.

Detailed approved-voice video is published as a homepage link at /media/hiring-evidence-detailed-walkthrough-149.mp4. Live browser confirmed duration 524.328 seconds, readyState 4, controls enabled, and no media error. Final production deployment: hiring-evidence-system-qx3jv92z9-sajeewas-projects-b911d5d0.vercel.app (aliased hiringevidence.com). Company-specific feature switches are not implemented; custom development remains separately scoped work. Outstanding: fresh-inbox delivery, data-operation proof, recipient-bound authentication, and a recorded demonstration of the new sharing controls.
