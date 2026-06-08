# Demo Test Lab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an internal demo test lab that generates a controlled 60-resume dataset and shows expected evidence outcomes for the Northstar Digital Frontend Developer role.

**Architecture:** Add a dedicated service for synthetic resume scenarios and summary calculations. Add a `/demo-test-lab` page that reads from the service and presents the test setup, metrics, category breakdown, and candidate outcome table using safe hiring language.

**Tech Stack:** Vite, React, TypeScript, React Router, existing UI components, existing CSS, node assert-based tests.

---

### Task 1: Service Tests

**Files:**
- Modify: `tests/design-system.test.tsx`
- Create: `src/services/demoTestLabService.ts`

**Step 1:** Import `getDemoTestLabViewModel`.

**Step 2:** Assert the generated dataset has 60 synthetic resumes.

**Step 3:** Assert all eight scenario categories are present.

**Step 4:** Assert summary metrics match the generated rows.

**Step 5:** Run `npm run test` and verify the test fails because the service does not exist.

### Task 2: Demo Test Lab Service

**Files:**
- Create: `src/services/demoTestLabService.ts`

**Step 1:** Define scenario category, synthetic resume record, category summary, and view model types.

**Step 2:** Generate 60 deterministic synthetic resumes for the Frontend Developer role.

**Step 3:** Calculate summary metrics and category breakdown from the generated records.

**Step 4:** Run `npm run test` and verify service assertions pass or move to the next missing route failure.

### Task 3: Route and Page

**Files:**
- Create: `src/pages/DemoTestLabPage.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/design-system.test.tsx`

**Step 1:** Add route smoke assertions for `/demo-test-lab`.

**Step 2:** Add the page using `getDemoTestLabViewModel`.

**Step 3:** Render setup explanation, summary metrics, category breakdown, and candidate table.

**Step 4:** Run `npm run test`.

### Task 4: Navigation and Styling

**Files:**
- Modify: `src/components/layout/PublicHeader.tsx`
- Modify: `src/pages/LandingPage.tsx`
- Modify: `src/styles.css`
- Modify: `tests/design-system.test.tsx`

**Step 1:** Add a public nav link and landing CTA to the demo test lab.

**Step 2:** Add responsive styles matching the existing product UI.

**Step 3:** Run `npm run test`.

### Task 5: Required Verification

**Files:**
- No implementation files.

**Step 1:** Run `npm run typecheck`.

**Step 2:** Run `npm run test`.

**Step 3:** Run `npm run build`.

**Step 4:** Run `npm audit --audit-level=high`.
