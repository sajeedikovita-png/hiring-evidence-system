# Database and Auth Plan

## Purpose

Hiring Evidence System is moving toward real database-backed company workspaces. The current mock data remains temporary development scaffolding behind services and repositories. The production path is Supabase Auth with PostgreSQL tables scoped by company.

Core principle:

AI assists. Human decides. Evidence explains.

## Current State

- Front-end pages are implemented with React routes.
- Mock hiring data exists as seed/dev data only.
- Repository and service methods now require company context for company-owned reads.
- Human review decision saving requires company ID, report ID, application ID, user ID, decision, reason, and timestamp.
- Empty decision reasons are rejected before any decision record is produced.

## Target Auth Model

- Supabase Auth owns login identity.
- `recruiter_profiles` maps an authenticated user to a company workspace.
- Each company-owned table stores `company_id`.
- Row Level Security limits reads and writes to companies associated with the authenticated user.
- App pages receive company context from `companyContextService`, not from mock data imports.

## Database Entities

- `companies`: B2B customer workspaces.
- `recruiter_profiles`: recruiter or hiring team profile tied to auth user and company.
- `job_roles`: company job roles under review.
- `job_requirements`: job-related requirements for evidence extraction and review.
- `candidates`: candidate identity records owned by a company.
- `candidate_applications`: a candidate applying to a specific role.
- `uploaded_documents`: source documents uploaded for an application.
- `parsed_cvs`: parsed CV output and warnings from the parsing pipeline.
- `evidence_reports`: report summary for a candidate application.
- `evidence_items`: requirement-by-requirement evidence rows.
- `human_review_decisions`: recruiter decisions with required human-entered reason.
- `audit_log_entries`: append-only activity trail for report access, uploads, and decision events.

## Upload and Report Flow

1. Recruiter opens a job role inside a company workspace.
2. Recruiter uploads PDF or DOCX candidate documents.
3. Upload service validates file type and size.
4. Accepted documents are stored and inserted into `uploaded_documents`.
5. Parser job creates `parsed_cvs` records with status and warnings.
6. Evidence generation creates `evidence_reports` and `evidence_items`.
7. Recruiter reviews evidence, missing proof, verification needs, and fairness reminders.
8. Recruiter records a human decision with a job-related reason.
9. `audit_log_entries` records safe action names for traceability.

## Safety Requirements

- The system supports review; it does not make the final hiring decision.
- Decisions require a human-entered reason.
- Product copy must follow `AGENTS.md` and `docs/SAFETY_AND_COMPLIANCE_RULES.md`.
- Evidence must stay tied to job requirements and document sources.
- Audit logs must use safe action names such as `evidence_report_read` and `human_review_decision_saved`.

## Privacy and Security Requirements

- Company data must be isolated through `company_id` and RLS.
- Uploaded documents must not be publicly readable.
- Document storage paths should include company, job, application, and document IDs.
- Parsed CV content and evidence reports should be treated as sensitive hiring records.
- Audit records should be append-only in production.
- Future API calls must validate company access server-side, even when RLS is enabled.

## Replacement Path

The current mock repository can be replaced by API/Supabase implementations without changing pages:

- `authService` becomes the Supabase Auth session adapter.
- `companyContextService` resolves active company membership.
- `hiringRepository` reads from database/API endpoints.
- `reportService` reads and writes evidence report and human decision records.
- `uploadService` coordinates real storage upload and pipeline status.
- `auditLogService` writes append-only audit records.

## Supabase Development Setup

1. Create a Supabase project for development.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` to create the initial company workspace records.
4. Create or invite a development auth user.
5. Update the seeded `recruiter_profiles.user_id` value so it matches the Supabase Auth user UUID.
6. Copy `.env.example` to `.env.local`.
7. Add:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

8. Start the app with `npm run dev`.

When both Supabase env vars are present, `hiringRepository` selects the Supabase repository. When either env var is missing, the app uses the seed repository so development can continue locally without a live backend. The fallback is only for development scaffolding and must stay behind service/repository boundaries.

## Supabase Repository Scope

The Supabase repository currently supports:

- active company context from `recruiter_profiles`
- dashboard metrics from `job_roles`, `candidate_applications`, `evidence_reports`, and `human_review_decisions`
- job reads from `job_roles`
- candidate application reads from `candidate_applications`
- evidence report reads from `evidence_reports`
- evidence matrix rows from `evidence_items`
- document sources from `uploaded_documents`
- audit preview from `audit_log_entries`
- human decision inserts into `human_review_decisions`
- audit log inserts when a human decision is saved
