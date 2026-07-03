# Supabase Access Approval Design

## Goal

Make Hiring Evidence System authentication operational for the owner first, then replace the browser-only pilot request with a secure, auditable Supabase access approval workflow.

## Product and Security Principles

- AI assists. Human decides. Evidence explains.
- Access is granted by an authenticated human administrator.
- Supabase Auth administration runs only on the server.
- The Supabase `service_role` key must never enter browser code, Vite environment variables, client logs, or committed files.
- Existing company and starter records must be reused. The workflow must not create a duplicate company.

## Sequence

### Phase 1: Owner Login First

1. Invite `sajeedikovita@gmail.com` through the existing `hiring-evidence-system-dev` Supabase project.
2. Link the resulting Auth user UUID to an active `admin` recruiter profile in the existing Northstar Digital company.
3. Use an invitation/password setup flow so no shared temporary password is required.
4. Sign in at `/login`.
5. Verify the live dashboard, candidate list, report, human decision save, and audit record before starting the broader approval feature.

`supabase/bootstrap.sql` is not present in the current checkout or either tracked branch. The live project already has the Northstar company and starter data. Therefore Codex will provision the first admin against the existing company and will not create a company.

## Approaches Considered

### Manual Supabase Management Only

An operator creates every user and recruiter profile in the Supabase dashboard.

This is fast for the first login but does not make the website's request-access flow functional.

### Browser-Side Approval

The web app directly creates Auth users after an administrator clicks Approve.

This is rejected because Supabase user administration requires the `service_role` key. Putting that key in frontend code would expose full administrative access.

### Server-Side Approval Workflow

The public app stores a pending request in Supabase. An authenticated administrator reviews it. Approval calls a Supabase Edge Function that verifies the administrator, invites the user through the Admin Auth API, creates the recruiter profile, and records the action.

This is the selected approach.

## Data Model

Add `public.access_requests` with:

- `id`
- `company_name`
- `work_email`
- `requester_role`
- `hiring_volume`
- `first_role_to_review`
- `note`
- `status`: `pending`, `approved`, or `rejected`
- `requested_at`
- `reviewed_at`
- `reviewed_by_profile_id`
- `approved_company_id`
- `approved_role`: `admin`, `recruiter`, or `hiring_manager`
- `auth_user_id`
- `review_note`

Email addresses are normalized to lowercase. Duplicate pending requests for the same email are rejected or returned as the existing pending request.

## Permissions

- Anonymous visitors may create an access request through a narrow server-side request endpoint.
- Anonymous and ordinary recruiter users cannot list access requests.
- Only active recruiter profiles with role `admin` may list or review requests.
- Only the Edge Function may use `service_role`.
- The Edge Function independently verifies the calling user's Supabase session and active admin profile. It never trusts a role supplied by the browser.
- Existing company membership remains enforced by Row Level Security.

## Server-Side Functions

### `request-access`

- Accepts the public request form payload.
- Validates and normalizes inputs.
- Creates or returns a pending request.
- Returns accurate confirmation text without exposing other requests.

### `approve-access-request`

- Requires an authenticated Supabase user.
- Verifies the caller has an active `admin` recruiter profile.
- Loads the pending request.
- Uses the server-only Admin Auth API to invite the requested email.
- Creates or updates a recruiter profile in the selected existing company.
- Marks the request approved and stores the Auth user ID.
- Writes an audit entry.
- Is idempotent so a retry does not create duplicate users or profiles.

### `reject-access-request`

- Requires the same admin verification.
- Marks the request rejected with a human-entered review note.
- Writes an audit entry.

## Web Application

### Public Request Page

`/request-pilot` submits to `request-access` instead of `localStorage`. The confirmation states that the request is pending human review.

### Admin Access Page

`/admin/access-requests`:

- shows pending, approved, and rejected requests;
- is visible only to active admins;
- lets the admin choose the existing company and recruiter role;
- provides Approve and Reject actions;
- displays clear server errors without exposing secrets.

### Invitation and Password Setup

The invite directs the user to `/set-password`. The page confirms the Supabase invitation session, lets the invited user choose a password, and then routes them to `/login` or `/dashboard`.

## Failure Handling

- Missing or expired invitation links show recovery guidance.
- Duplicate approvals return the existing provisioned user instead of creating another.
- Missing company or admin profile blocks approval.
- Partial provisioning is retried safely.
- Email delivery failure leaves the request pending and shows a clear admin error.
- The UI never reports approval until the Edge Function confirms Auth invitation, profile provisioning, and request update.

## Verification

Phase 1 is complete only when the owner can sign in and:

- load the Supabase-backed dashboard;
- open the live candidate list and evidence report;
- save a human decision with a human-entered reason;
- observe the corresponding audit entry.

The full workflow is complete only when:

- a new browser submits an access request;
- the request appears in the admin queue;
- a non-admin cannot view or approve it;
- the admin approval sends an invitation;
- the invited user sets a password and signs in;
- the user sees only the assigned company workspace;
- duplicate approval is safe;
- typecheck, tests, build, and `npm audit --audit-level=high` have been run and their actual results reported.

## Email Boundary

Supabase's built-in email delivery is acceptable for the initial owner and small testing volume. Production tester onboarding will require configured SMTP before the workflow is treated as production-ready.
