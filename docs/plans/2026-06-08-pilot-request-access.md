# Pilot Request Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the necessary pilot-run details so recruiters can request pilot access from the public website.

**Architecture:** Add a public `/request-pilot` route, connect public CTAs to it, and keep form handling behind a service boundary. Store the request locally for the MVP and return a clear confirmation state without real email sending.

**Tech Stack:** Vite, React, TypeScript, React Router, local service function, existing CSS and tests.

---

### Task 1: Add Pilot Request Service Test

**Files:**
- Modify: `tests/design-system.test.tsx`
- Create: `src/services/pilotRequestService.ts`

**Step 1:** Add assertions for validating required pilot request fields and creating a local pending pilot request.

**Step 2:** Run `npm run test` and verify it fails because the service does not exist.

### Task 2: Implement Pilot Request Service

**Files:**
- Create: `src/services/pilotRequestService.ts`

**Step 1:** Define input, stored request, validation, and submit functions.

**Step 2:** Keep storage optional so server-side rendering tests can run without browser globals.

**Step 3:** Run `npm run test` and verify service assertions pass.

### Task 3: Add Pilot Request Page and Route

**Files:**
- Create: `src/pages/RequestPilotPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/components/layout/PublicHeader.tsx`
- Modify: `tests/design-system.test.tsx`

**Step 1:** Add route smoke assertions for `/request-pilot`.

**Step 2:** Build the public form with conservative pilot copy and no automated hiring claims.

**Step 3:** Update CTAs from `/dashboard` or inert buttons to `/request-pilot`.

### Task 4: Style and Verify

**Files:**
- Modify: `src/styles.css`

**Step 1:** Add responsive form styles that match the existing landing/login system.

**Step 2:** Run required verification:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --audit-level=high`
