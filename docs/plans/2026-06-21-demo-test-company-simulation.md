# Demo Test Company Simulation — Plan & Handoff

**Date:** 2026-06-21
**Status:** Planning captured. Build not started yet.
**Why this file exists:** To preserve the goal and plan across sessions so we never
lose this conversation. Any new session (Claude Code or otherwise) should read this
first, then the linked files in `docs/` and `src/`.

---

## 1. The goal in one paragraph

We do **not** have a real customer company yet. The real purpose of this work is for
**the founder to gain genuine, first-hand confidence that the Hiring Evidence System
actually works** — end to end, the way a real recruiting company would use it — so they
can honestly promote it (email outreach first, then 1:1 conversations) and speak about
it with conviction. So we will build a **Test Company Simulation**: a self-contained,
realistic, *fictional* company that "behaves like a company" — real-looking jobs,
recruiters, a candidate pipeline, and the full workflow — running on top of our actual
application, in a **separate demo/test version** isolated from anything we would ship to
real customers. Because the goal is *confidence that it works* (not just nice screens),
the simulation should genuinely **function**: clicking through really performs the steps.
It doubles as a **continuous test harness** and as **marketing material** (screens/clips
for the email promotion).

> Plain version: "Pretend a company called *Northstar Digital* bought our product and is
> using it for real. Make every step actually work, in a safe sandbox, so that *I* can
> see with my own eyes that the product does what I'll be selling — and so I have proof to
> show in emails and later conversations."

---

## 2. Why this matters (context to not lose)

- The core need is **founder confidence**: being able to see, first-hand, that the product
  truly works for a company — so the founder can promote it honestly and sell it with
  conviction. You can't confidently sell something you've never watched work.
- The **go-to-market** is **email outreach first**, then possibly **1:1 conversations**.
  There is **no single scheduled meeting** driving this — it's about being *ready and sure*.
- The system should work at **100%** — no broken screens, no placeholder gaps, no
  compliance-language slips — and it should **actually function** when clicked, not just
  look right in a screenshot.
- We have **no real company / no real data**, so we *manufacture* a believable company and
  run our software against it.
- It must be a **separate version** — a sandbox — so the demo data and flows never
  contaminate the real product or the production data path. The same sandbox can produce
  **marketing assets** (screens/short clips) for the email promotion.
- This document is the **safety net**: if the session resets, the intent and plan live here.

---

## 3. What "behaves like a company" means (the simulation spec)

A convincing simulated company is more than seed rows. It needs all of this, coherent
with one story:

1. **Company profile** — name, industry, size, location (Singapore), the hiring team.
   - Reuse the existing fictional company: **Northstar Digital** (already referenced in
     `src/services/demoTestLabService.ts` and the mock data).
2. **The hiring team (users/recruiters)** — at least one recruiter + one hiring manager,
   with names, roles, and the "human decides" responsibility.
3. **Open roles (jobs)** — start with **Frontend Developer** (already wired), ideally 2–3
   roles so the dashboard looks like a real pipeline, each with defined **job criteria**.
4. **A candidate pipeline** — a realistic spread of candidates per role that covers the
   real range of outcomes, not just "good" ones. The existing demo test lab already
   defines these categories — reuse them:
   - Strong frontend evidence
   - Good evidence, verification needed
   - Missing key evidence
   - Needs human review
   - Failed or unreadable resume
   - Wrong role
   - Incomplete resume
   - Over-claiming, needs verification
5. **The end-to-end workflow, walkable on screen**:
   1. Request pilot access (`/request-pilot`)
   2. Set job criteria
   3. Collect / upload candidate evidence (`/jobs/.../candidates/upload`)
   4. Review candidate list (`/jobs/.../candidates`)
   5. Open a **Candidate Evidence Report** (`/reports/candidate-evidence`)
   6. See evidence found / missing / needs-verification + suggested interview questions
   7. **Fairness check** panel
   8. **Human decision** with a **required written reason**
   9. **Audit trail** entry recorded (`auditLogService`)
6. **Compliance correctness everywhere** — never the banned phrases ("best candidate",
   "AI selected/rejected/decides", "auto reject", "bias-free", "guaranteed fair",
   "perfect match"); always keep the line *"AI-assisted analysis. Human review required
   before any hiring decision."* See `docs/SAFETY_AND_COMPLIANCE_RULES.md` and
   `docs/UX_COPY_RULES.md`.

---

## 4. What already exists (build on this, don't rebuild)

Grounded in the current codebase on branch `codex/demo-test-lab`:

**Routes** (`src/App.tsx`):
`/`, `/login`, `/request-pilot`, `/demo-presentation`, `/demo-test-lab`, `/dashboard`,
`/jobs/frontend-developer/candidates`, `/jobs/frontend-developer/candidates/upload`,
`/reports/candidate-evidence`, `/reports/:reportId`.

**Pages** (`src/pages/`): Landing, Login, RequestPilot, DemoPresentation,
**DemoTestLab**, Dashboard, JobCandidateList, BulkUploadCandidates,
CandidateEvidenceReport.

**Services** (`src/services/`): `auditLogService`, `authService`,
`companyContextService` (resolves active company = Northstar Digital),
`compliance`, `connectionStatusService`, **`demoTestLabService`** (the 8 resume
categories + expected vs. actual evidence levels + recommended recruiter actions),
`hiringRepository` + `supabaseHiringRepository` (repo seam over mock/real data),
`mockSelectors`, `pilotRequestService`, `reportService`, `uploadService`,
`supabaseClient` / `supabaseConfig`.

**Data / types**: `src/data/mockHiringData.ts` (`organizations`, `users`),
`src/data/schema.ts`, `src/types/hiring.ts`.

**Existing demo assets**:
- `/demo-presentation` — demo slideshow.
- `/demo-test-lab` — categorized resume test set ("Frontend evidence pilot set" for
  Northstar Digital / Frontend Developer) with per-category expected-outcome matching.
- Prior plans: `docs/plans/2026-06-08-demo-test-lab-design.md` and
  `docs/plans/2026-06-08-demo-test-lab-implementation.md`.

**Key gap:** the current demo-test-lab proves *report categorization* in isolation. The
new **Test Company Simulation** is broader: it ties the **whole company story together**
(team → multiple jobs → full candidate pipeline → end-to-end walk → audit trail) into one
coherent, demo-ready, isolated version that we can drive live in front of a person.

---

## 5. Isolation strategy (the "separate version")

The simulation must not touch real/production data and must be obviously safe. Decide one
of these (see Open Decisions §8) — current recommendation in **bold**:

- **(A) In-app demo namespace + seeded demo company (recommended to start):** keep one
  codebase; route everything under a clear demo space (e.g. `/demo-test-lab/company`),
  drive it entirely from in-memory/mock data behind the existing repository seam, with a
  visible "DEMO / SANDBOX" banner. Fastest, zero infra risk, fully offline-safe.
- (B) Separate Supabase project / "demo" environment: real DB path but isolated project +
  keys, seeded with the simulated company. More realistic, more setup, more ways to break
  live.
- (C) Separate build/deploy (e.g. `demo.` subdomain) off the same code with a demo flag.

Whichever we pick: **no banned compliance language**, a persistent **demo banner**, and a
**one-command reseed** so the demo always starts from a known-perfect state.

---

## 6. Build plan (phased)

> Each phase ends green: `npm run typecheck && npm test && npm run build` all pass, and
> the relevant screen is walkable in `npm run dev`.

- **Phase 0 — Lock scope & story** (this doc + answers to §8). Confirm who the 1:1 is for
  and exactly which screens get shown.
- **Phase 1 — Simulated company data layer.** Flesh out Northstar Digital: team (2–3
  users), 2–3 jobs with criteria, and a full candidate pipeline per job reusing the 8
  categories. Keep it behind the repository seam so pages don't change shape.
- **Phase 2 — Demo company control surface.** A "Test Company" entry/landing inside the
  demo space: company overview, jobs, pipeline health, and a **"Run the full walkthrough"**
  path that visits every step in order.
- **Phase 3 — End-to-end walk wired.** Make every step in §3.5 navigable with real-looking
  data, including the **human decision + required reason** and the **audit trail** entry.
- **Phase 4 — Fairness + compliance pass.** Verify fairness panel, banned-language scan
  across all demo copy, and the persistent disclaimer/banner.
- **Phase 5 — Reseed + reliability.** One-command reset to a pristine demo state; smoke
  test that drives the whole walkthrough so it can't silently break before the meeting.
- **Phase 6 — Dry run.** Rehearse the exact 1:1 click-path end to end; fix any rough edge.

---

## 7. Definition of "100% working" (acceptance criteria)

- [ ] Every route used in the demo renders with realistic, coherent Northstar Digital data
      (no lorem, no empty states shown by accident, no console errors).
- [ ] The full workflow (§3.5, steps 1–9) is walkable start to finish without a dead end.
- [ ] A human decision **cannot** be recorded without a written reason; doing so writes an
      **audit trail** entry that is visible.
- [ ] Fairness check panel is present and reads correctly.
- [ ] **Zero** banned compliance phrases anywhere in demo copy; disclaimer line present on
      hero + report.
- [ ] Demo data is isolated from any production/real path; a visible DEMO banner is shown.
- [ ] One command reseeds the demo to a known-good state.
- [ ] `npm run typecheck`, `npm test`, `npm run build` all pass; an automated smoke test
      walks the whole demo path.
- [ ] A full rehearsal of the exact 1:1 click-path completed with no issues.

---

## 8. Open decisions (confirm with user before/within Phase 1)

1. ~~Audience of the 1:1~~ — **Resolved (2026-06-21):** there is no single meeting. The
   goal is **founder confidence** + an **email-first promotion**. Build it to genuinely
   function end to end and to produce sharable proof (screens/clips).
2. **Isolation approach** — §5 (A) in-app demo namespace [recommended], (B) separate
   Supabase env, or (C) separate build/subdomain?
3. **Data realism** — fully scripted static data (safest, fastest) vs. a lightweight
   "engine" that reacts to clicks (more impressive, more build/risk)?
4. **Scope of roles** — just Frontend Developer, or 2–3 roles for a fuller dashboard?
5. **Where it lives** — extend the existing `/demo-test-lab`, or a new `/demo` company
   space alongside it?

---

## 9. Status & next steps

- **Done:** plan captured (this file). Codebase surveyed and grounded.
- **Done — Phase 1, increment 1 (2026-06-21): Frontend Developer role fully walkable.**
  Added openable, distinct evidence reports for the previously dead-ending candidates so
  every Frontend candidate now resolves correctly:
  - Priya Shah → **Strong evidence** (`HER-2026-0521-PS`) — clean, well-evidenced report.
  - Daniel Morris → **Needs human review** (`HER-2026-0521-DM`) — unreadable-file case.
  - Amanda Lee → Good evidence, verification needed (`HER-2026-0521-AL`, pre-existing).
  - Marcus Wong → Report failed — correctly stays on the list (failure handling shown).
  Each new report has 3 job-related evidence rows + an audit-trail entry. The human
  decision loop (decision + required reason → audit) already functions for all of them.
  Pure data additions in `src/data/mockHiringData.ts` (no new candidates, no new draft
  decisions) so all locked test counts stay intact. `typecheck`, `test`, `build` all green.
- **Done — Manual test kit (2026-06-21):** built `demo-test-kit/` so the founder can
  test the product as an external user. Contains: `sample-cvs/` — 15 realistic CV files
  (real .docx + .pdf) organized by job (frontend-developer, customer-success-manager,
  data-analyst) and by category (strong / good-verify / missing-evidence / over-claiming /
  wrong-role / incomplete), plus `invalid-files/` (wrong type + oversized) to test upload
  validation; `generate-sample-cvs.sh` — re-runnable generator/reset (uses macOS `textutil`
  + `cupsfilter`); `MANUAL_TEST_GUIDE.md` — a numbered click-by-click runbook with DO/EXPECT
  steps, honest about live vs. simulated. Dev server boot verified (`npm run dev` → :3000).
- **Done — Bulk resume inbox (2026-06-21):** `demo-test-kit/bulk-resumes/` — 72 realistic
  resume files (24 per role × 3 roles), named like a real inbox (`Name_Resume.pdf`, category
  hidden), mixed PDF/DOCX, spread across the real quality mix (strong 5 / good-verify 6 /
  missing 5 / over-claiming 3 / wrong-role 3 / incomplete 2 per role). `bulk-manifest.csv` is
  the answer key (file → job → intended category). Generated by `generate-bulk-resumes.mjs`
  (deterministic, re-runnable; `node ... <countPerRole>` scales the pile). Lets the founder
  test bulk upload at volume, the way a real company's resume list looks.
- **Done — Demo upload engine (2026-06-22): uploads now produce per-file evidence reports.**
  `src/services/demoUploadEngine.ts` categorizes each uploaded file (bundled
  `src/data/demoBulkManifest.ts` for bulk files → curated filename suffix → deterministic
  fallback for any other CV), then generates a full evidence report against the real job
  criteria (resolves to the file's intended job, e.g. a CSM file → CSM criteria). Reports
  are stored in sessionStorage so `/reports/:reportId` can open them; the report page falls
  back to that store and shows a **"Demo preview report"** banner. Recording a human decision
  works on these (validates reason → appends an audit entry). Upload panel
  (`BulkUploadCandidatesPanel`) now calls `createDemoUploadFile` with the real file size, so
  wrong-type → "Unsupported file type" and >10 MB → "File too large" both reject correctly;
  accepted files show **Report ready** + a working **View report** link. Clearly labelled as
  scripted demo, not real AI parsing. `typecheck`/`test`/`build`/dev-boot all green.
- **Done — Increment 2 (2026-06-22): all three roles fully walkable.** Added full candidate
  pipelines for **Customer Success Manager** (Elena Garcia=strong, David Lim=good-verify,
  Hannah Cole=missing, Marcus Vance=failed) and **Data Analyst** (Nadia Hassan=strong,
  Ben Carter=good-verify, Sofia Ruiz=missing) — candidates, applications, documents, batches,
  bulk files, reports + evidence + audit entries, all in `mockHiringData.ts`. Routes
  parameterized to `/jobs/:jobSlug/candidates` + `/upload` (slug = `jobSlug(title)`,
  resolved via `getJobIdBySlug`); `JobCandidateListPage` + `BulkUploadCandidatesPage` read
  the slug; dashboard `getRecentJobs` links every role to its own list/upload. Seed now has
  11 candidates / 11 applications / 9 reports; updated the `candidates.length` test assertion
  (5 → 11); no new draft decisions so "Decisions needing sign-off" stays 1. Each role's upload
  page categorizes against its own job criteria. `typecheck`/`test`/`build`/dev-boot all green.
- **Then:** §8 decisions (isolation approach, demo banner, reseed command), fairness +
  compliance sweep, and a full rehearsal click-path.
- **Handoff pointers:** `docs/PROJECT_STATE.md`, `docs/SAFETY_AND_COMPLIANCE_RULES.md`,
  `docs/UX_COPY_RULES.md`, `docs/plans/2026-06-08-demo-test-lab-*.md`,
  `src/services/demoTestLabService.ts`, `src/services/companyContextService.ts`,
  `src/data/mockHiringData.ts`.

> Reminder for any future session: this is a **demo/test simulation of a fictional
> company (Northstar Digital)** to prove the Hiring Evidence System works at 100% before a
> serious 1:1. It is **not** real customer data and must stay isolated from production.
