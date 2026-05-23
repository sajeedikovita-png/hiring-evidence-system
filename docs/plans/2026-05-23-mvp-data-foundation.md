# MVP Data Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the recruiter prototype from hardcoded report preview data into a structured front-end MVP foundation with job-based bulk CV upload.

**Architecture:** Keep the Vite React app front-end only. Add TypeScript domain models, schema metadata, structured seed data, and a local repository service that can later be swapped for a real database, resume parser, evidence matcher, background queue, and PDF export.

**Tech Stack:** Vite, React, TypeScript, structured mock data, local service functions.

---

### Task 1: Verification Guard

**Files:**
- Modify: `tests/design-system.test.tsx`

Add smoke coverage for the required schema tables, candidate report service, job candidate list filters, and bulk upload page. Run the test before implementation to verify it fails because the new data layer is missing.

### Task 2: Data Foundation

**Files:**
- Modify: `src/types/hiring.ts`
- Create: `src/data/schema.ts`
- Modify: `src/data/mockHiringData.ts`
- Create: `src/services/hiringRepository.ts`

Add models for organizations, users, jobs, criteria, candidates, applications, documents, consents, questionnaire records, evidence, reports, decisions, audit logs, bulk upload batches, and bulk upload files. Keep all mock records structured and relation-ready.

### Task 3: Screen Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/CandidateEvidenceReportPage.tsx`
- Modify: `src/components/landing/SampleReportPreview.tsx`
- Modify: `src/pages/DashboardPage.tsx`

Read report, landing preview, dashboard links, and job records from the repository/data objects instead of hardcoded JSX text.

### Task 4: Bulk Upload MVP UI

**Files:**
- Create: `src/components/bulk-upload/BulkUploadCandidatesPanel.tsx`
- Create: `src/pages/BulkUploadCandidatesPage.tsx`
- Create: `src/pages/JobCandidateListPage.tsx`
- Modify: `src/styles.css`

Add a job-scoped bulk upload panel with PDF/DOCX validation, privacy confirmation, progress counters, uploaded files table, and a candidate list grouped by evidence level. Do not add ranking or automated decision language.

### Task 5: Verification and Handoff

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `docs/DATABASE_SCHEMA.md`

Add a `typecheck` script, remove the incremental TypeScript setting that hangs in this workspace, document bulk upload tables, run tests, typecheck, build, start the app locally, then commit and push.
