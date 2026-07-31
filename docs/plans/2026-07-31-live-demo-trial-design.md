# Live Demo Trial Design

**Status:** Approved for implementation on 2026-07-31.

## Customer lifecycle

1. A platform administrator approves a company's demo request and sends its owner an invitation.
2. Approval and invitation delivery do not start the trial.
3. The company's first successful dashboard visit activates a server-recorded 14-day trial.
4. During the trial, the company can use the workspace normally. The UI displays the remaining time, with stronger daily reminders in the final four days.
5. At expiry, the workspace becomes view-only. Customers can still view and share work created during the trial but cannot upload CVs, create jobs, or change data.
6. The view-only period lasts seven days. The product shows the remaining time to upgrade and the exact scheduled deletion date.
7. Unless the workspace is upgraded, the system securely removes its demo CV files, candidate data, reports, and company workspace records after the view-only period. Retain only the minimum non-personal operational record that the trial ended.

## Technical requirements

- Enforce lifecycle state, expiry, access restrictions, and deletion server-side; browser state must not be trusted.
- Keep all customer data company-scoped.
- Ensure the expiry policy applies consistently to UI actions, APIs, storage, and background processing.
- Provide a clear in-product notice at expiry: the workspace is view-only for seven more days, including the exact deletion date.
- Preserve the product rule that AI assists and humans make hiring decisions.

## Verification

- Test approval, invitation, activation, active trial, reminder thresholds, expiry, view-only enforcement, upgrade exemption, and scheduled purge.
- Verify database policies prevent writes after expiry and prevent cross-company access.
- Run the repository's typecheck, test suite, production build, and high-severity dependency audit before declaring completion.
