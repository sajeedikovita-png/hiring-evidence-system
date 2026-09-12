# Transactional email copy

## Company workspace invitation

- **Supabase template:** Invite user
- **Subject:** `Your Hiring Evidence workspace invitation`
- **Version-controlled HTML:** `supabase/templates/invite.html`
- **Purpose:** Confirm that a platform administrator approved the access request and provide one clear account-setup action.

The message must remain transactional. It identifies the recipient, explains why the invitation arrived, warns against forwarding the secure link, provides a visible fallback URL, links to the product website, and tells an unexpected recipient to ignore it. Do not add sales claims to an authentication email.

After changing the hosted Supabase template, send one controlled invitation and verify the subject, sender identity, desktop and mobile rendering, confirmation destination, and SPF/DKIM/DMARC results. Record placement and results in `docs/OWNER_ACCEPTANCE_TEST_FINDINGS_2026-09-11.md`.
