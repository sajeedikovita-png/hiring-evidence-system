# Transactional email copy

## Company workspace invitation

- **Supabase template:** Invite user
- **Subject:** `Your Hiring Evidence workspace invitation`
- **Version-controlled HTML:** `supabase/templates/invite.html`
- **Purpose:** Confirm that a platform administrator approved the access request and provide one clear account-setup action.

The message must remain transactional. It identifies the recipient, explains why the invitation arrived, warns against forwarding the secure link, links to the product website, and tells an unexpected recipient to ignore it. Do not add sales claims or expose the raw authentication-provider URL in the email body.

After changing the hosted Supabase template, send one controlled invitation and verify the subject, sender identity, desktop and mobile rendering, confirmation destination, and SPF/DKIM/DMARC results. Record placement and results in `docs/OWNER_ACCEPTANCE_TEST_FINDINGS_2026-09-11.md`.

## Password recovery

- **Supabase template:** Reset password
- **Subject:** `Hiring Evidence password reset`
- **Version-controlled HTML:** `supabase/templates/recovery.html`
- **Purpose:** Confirm that the recipient requested a password reset and provide one secure action back to the Hiring Evidence password page.

Keep this message transactional and concise. It must identify the requested account, explain that no password changes if the message is ignored, warn the recipient not to forward the one-time link, and provide a product support path. After changing the hosted template, send a controlled recovery message and record inbox or Spam placement, sender authentication, rendering, and redirect behavior.
