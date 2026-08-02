# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Hiring Evidence System** — a B2B recruiter/company web app for evidence-led hiring review, live at `hiringevidence.com`. It is a **real product being sold**, not a demo, and it is **separate from the ReResume applicant-side ATS checker** — never connect the two or reuse applicant-side logic.

Core principle, quoted verbatim throughout the UI and docs: **AI assists. Human decides. Evidence explains.**

`AGENTS.md` is the product contract and its rules are **enforced by a test** (`tests/quality-gate.test.ts` asserts specific sentences exist in it). Read `AGENTS.md` and `docs/CODEX_RULES.md` before changing product behaviour.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:3000
npm run build        # production build to dist/
npm run preview      # serve the built bundle on :3000
npm run typecheck    # tsc --noEmit (covers src/ and components/ only — not tests/)
npm test             # runs all four test files in sequence via tsx
npm audit --audit-level=high
```

Run a single test file directly (there is no test runner or filter flag):

```bash
npx tsx tests/quality-gate.test.ts
npx tsx tests/design-system.test.tsx
```

**Every task must end with all four:** `npm run typecheck`, `npm test`, `npm run build`, `npm audit --audit-level=high`. CI (`.github/workflows/ci.yml`) runs exactly these on Node 22.

## Testing model

There is **no Vitest/Jest**. Each file in `tests/` is a plain script executed by `tsx` that uses `node:assert/strict` at the top level and prints a success line at the end; a failed assertion throws and fails the run. React components are checked by rendering with `renderToStaticMarkup` and asserting on the HTML string — `App` accepts a `path` prop that renders through `MemoryRouter` specifically so routes can be rendered in Node without a browser.

**A new test file only runs if you add it to the `test` script chain in `package.json`.**

`tests/quality-gate.test.ts` is a repo-policy test, not a unit test. It fails the build if:
- `AGENTS.md` or the CI workflow is missing a required rule/command,
- any forbidden hiring phrase (from `src/services/compliance.ts`) appears anywhere under `src/` (only `compliance.ts` itself is exempt),
- `JobCandidateListPage` or `BulkUploadCandidatesPage` imports `services/mockSelectors` directly instead of going through `getAsyncHiringRepository`.

## Architecture

Vite + React 19 + react-router-dom SPA. **No Next.js, no Tailwind, no shadcn** despite what the parent workspace CLAUDE.md says about other projects here — styling is hand-written CSS custom properties in `src/styles.css` plus four layered stylesheets imported in `src/main.tsx`. Imports are relative; there is no `@/` alias.

Two component roots, deliberately:
- `components/` (repo root) — the design-system primitives (`Button`, `Card`, `Badge`, `DataTable`, `EmptyState`, `WarningCard`, `NoteTextArea`) and `AppShell`.
- `src/components/` — feature components (report panels, bulk upload, landing, layout shells).

### The repository seam (the most important structural rule)

Pages never import mock data. They call `getAsyncHiringRepository()` from `src/services/hiringRepository.ts`, which returns one of two implementations behind the identical `AsyncHiringRepository` interface:

- `"seed"` — in-memory data from `src/data/mockHiringData.ts` via `mockSelectors`.
- `"supabase"` — `createSupabaseHiringRepository()` over the real database.

The switch is in `getHiringRepositoryMode()`: Supabase **only** when env config exists *and* a recruiter has an active session (`hasActiveSupabaseSession()` reads the `sb-*-auth-token` key out of localStorage synchronously). No session → the login-free seed demo. This is what keeps the public demo unbreakable while a signed-in founder sees real per-account data.

Every repository method takes a `companyId` first and runs it through `requireCompanyId()`; pages get it from `repository.getActiveCompanyContext()`. Workspace isolation is the security boundary — cross-company reads must fail.

### Demo / upload / AI pipeline

Three layers, each falling back to the next:

1. `resumeAnalysis.ts` — real path. Extracts text (`resumeTextExtraction.ts`, pdfjs-dist + mammoth) → invokes the `analyze-resume` Supabase edge function → OpenRouter → builds a real `EvidenceReport`.
2. `demoUploadEngine.ts` — scripted fallback. Derives a category from the bulk manifest or filename and builds a report against the *real* job criteria. Always labelled "Demo preview report" in the UI.
3. Seed reports from `mockHiringData.ts`.

Any failure (no Supabase config, unreadable file, model error) silently degrades to the scripted report so an upload always produces something viewable. Uploaded reports persist in browser storage and are merged to the top of the candidate list so the demo behaves like a real pipeline.

### Supabase

Two clients on the same project, on purpose:
- `supabaseClient.ts` — recruiter workspace; reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, **falling back to `VITE_PUBLIC_*`** (`supabaseConfig.ts`).
- `publicSupabaseClient.ts` — public sign-up / set-password / admin approval; `VITE_PUBLIC_*` only, independent of seed-vs-supabase mode.

SQL lives in `supabase/schema.sql` (full schema + RLS), `supabase/seed.sql`, and `supabase/migrations/`. Edge functions: `analyze-resume` (works with the anon key so the login-free demo gets real analysis), `approve-request` (admin-only; provisions a company workspace + trial), `invite-user`, `ping`. Function secrets (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) live in Supabase, never in git.

`docs/LIVE_SUPABASE_SMOKE_TEST.md` is the step-by-step for pointing a local dev session at a real Supabase project, including the connection-status panel states (`Seed fallback mode`, `Missing env vars`, `Auth user missing`, `Company context missing`).

## Product rules that constrain code and copy

- **The system must never make the final hiring decision.** AI may summarize evidence, flag missing evidence, map evidence to criteria, and suggest questions. It may not decide, rank, reject, accept, or score as final truth.
- **A human decision requires a human-entered reason** and writes an audit entry (`reportService.saveHumanReviewDecision` → `auditLogService`).
- **Forbidden phrases** (test-enforced): "best candidate", "AI selected", "AI rejected", "AI decides", "auto reject", "automatic hiring decision", "bias-free", "guaranteed fair", "perfect match". Prefer: "Evidence report ready", "Human review required", "Needs verification", "Missing evidence", "Decision reason required".
- **Do not build without an explicit ask:** payments, real email sending, real PDF export, mobile app, advanced analytics, job board, sourcing/scraping, AI ranking, automatic rejection.
- Visual direction is calm professional B2B — no robots, sparkles, neon gradients, or "magic" language (`docs/DESIGN_SYSTEM.md`).

## Deployment (Vercel) — read this before claiming something is live

Pushing a branch creates a **Preview** deployment only, and merging to `main` does **nothing** — production is not fed from `main`. The public site updates only when a deployment is promoted:

```bash
vercel ls
vercel promote <deployment-url> --yes
```

Working branch is `codex/demo-test-lab`; `main` is behind and unused for deploys. Full account/domain/DNS/cost reference is `docs/INFRASTRUCTURE.md` — including that **OpenRouter is the only real per-use cost**, the demo needs no login so anyone can trigger paid AI calls, and the kill switch is lowering the OpenRouter spending cap (the app then falls back to scripted reports rather than breaking).

## Start here every session

Read these two before changing anything, and update them before you finish:

- **`docs/DECISION_LOG.md`** — why each non-obvious change was made, what was considered
  and rejected, and what it would break to undo. Git says what changed; this says why.
  **Append a new entry after any non-trivial change.** Newest first, never rewrite an
  old entry — supersede it instead.
- **`docs/plans/2026-07-31-live-demo-trial-STATUS.md`** — the live task board: what is
  DONE vs PENDING, what is committed vs deployed, and what only the founder can do.
  **Mark a task's status the moment it changes**, not at the end of the session.
- **`docs/DEPLOYMENT_RUNBOOK.md`** — the founder-executed deployment and rehearsal
  sequence. Agents do not run it. If you change a migration, an Edge Function, or the
  upload path, update the runbook in the same commit.

Chat sessions are disposable and the reasoning behind a change lives nowhere else. A
change landed without a decision-log entry is a change the next person has to reverse-
engineer.

Active work on the demo-trial lifecycle lives on branch `feature/live-demo-trial`
(worktree `.worktrees/live-demo-trial`), not on `codex/demo-test-lab`. Nothing from it
is deployed.

## Docs map

- `AGENTS.md` — operating contract (test-enforced).
- `docs/INFRASTRUCTURE.md` — every account, domain, deploy step, and cost. Start here for anything operational.
- `docs/PROJECT_STATE.md` — what is built vs. not built.
- `docs/CODEX_RULES.md`, `docs/SAFETY_AND_COMPLIANCE_RULES.md`, `docs/UX_COPY_RULES.md` — product/AI/copy boundaries.
- `docs/plans/` — dated handoffs; the newest describe the live 14-day trial work and what is implemented locally but **not yet deployed**.
- `demo-test-kit/` — sample CVs, a bulk generator, and `MANUAL_TEST_GUIDE.md`, a click-by-click walkthrough that states exactly which parts are real vs. simulated.

## Repo-root noise

Many root-level markdown files (`Lost_Story_*`, `MIND_LOOP_MASTER.md`, `Mysteries_*`, `UNSOLVED*`, `Educational_*`) are unrelated YouTube-content notes that happen to live in this directory. They are untracked and are **not** part of the product — do not stage, edit, or reason about them when working on the app.
