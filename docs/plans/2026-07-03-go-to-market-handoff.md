# Go-To-Market Handoff — Current Situation (2026-07-03)

**Read this first.** This file captures the full state of the project and every
decision made in the sales-launch phase, so any new session (Claude Code or other)
can continue without losing context. It follows on from
`docs/plans/2026-06-21-demo-test-company-simulation.md` (demo build — done) and
starts the **selling phase**.

---

## 1. Where the project stands (product)

- **Working:** full demo of the Hiring Evidence System on branch `codex/demo-test-lab`.
  Three roles (Frontend Developer, Customer Success Manager, Data Analyst), full
  candidate pipelines, evidence reports, mandatory-reason human decisions, audit
  trail, upload validation (PDF/DOCX, 10 MB, consent gate), bulk upload with
  per-file generated reports, demo test lab (60 categorized resumes), demo
  presentation slideshow. `typecheck`/`test`/`build` green as of last build phase.
- **Not built (intentionally, do NOT build these now):** real AI parsing (demo
  reports are scripted by category), real database persistence, real auth,
  **payments/billing (deliberately deferred — see §6)**, PDF export.
- **Test assets:** `demo-test-kit/` — MANUAL_TEST_GUIDE.md (click-by-click runbook),
  sample-cvs/ (15 curated), bulk-resumes/ (72 files + manifest), regeneration scripts.

## 2. The decision that ended the "on hold" period

The project stalled for ~2 weeks (founder attention drifted to other projects; the
demo kept getting polished instead of shown to anyone). Diagnosis: not a code
problem — an avoidance problem. Decision made (Path A): **sell the demo now via
free design-partner pilots; build the real engine for whoever says yes.**
Do not add features before the first pilot exists.

## 3. Market strategy (decided)

- **One product, two doors:**
  - **Door 1 (START):** small/mid **Singapore recruiting agencies** — pain: volume
    screening + proving shortlist quality to clients. Owners decide fast.
  - **Door 2 (LATER):** employers/in-house teams — pain: wasted interviews on
    mismatched candidates (validated first-hand: founder's husband works at a large
    SG employer that wastes many interviews on unsuitable candidates).
  - **The bridge:** every evidence report an agency sends its client is a live demo
    of the product inside that employer. Agencies are the distribution channel.
- **Do NOT target enterprises first** (LSEG-type firms = 6–18 month procurement).
- **Prospect source:** MOM Employment Agency Directory —
  https://service2.mom.gov.sg/eadirectory/ — every licensed SG agency, public.
  Target agencies placing professional/tech roles; skip giants (Michael Page etc.).
- **Milestone ladder:** 1 pilot → 3 pilots → first paid → 10 paying agencies.

## 4. Competitive landscape + regulation (researched 2026-07)

- **X0PA AI** (SG, enterprise, ~US$36k/yr, AI-Verify certified) — sells "AI-powered
  scoring", "automated shortlisting", "cultural fit matching", **"bias-free hiring"**
  — i.e., exactly the black-box claims our compliance rules ban.
- **impress.ai** (SG, enterprise chatbot screening), Interviewer.AI, Xobin.
- **Manatal** (SEA ATS, US$15–55/user/mo) — the commodity floor; not an evidence tool.
- **Our gap:** small/mid agencies can't afford enterprise tools; cheap ATS doesn't do
  evidence/defensibility. We sit between.
- **KEY WEAPON — Workplace Fairness Act 2025 (SG, commencing ~2026–27):** requires
  traceable/checkable AI outputs before employment decisions, human oversight,
  retained documentation proving fairness; burden of proof on employer. Our product
  (evidence report + required human reason + audit trail) matches this point by
  point. TAFEP campaign: "Fair Hiring First, AI Second."
  **Language rule:** say "designed to support WFA readiness" — never "guarantees
  compliance". Positioning sentence vs competitors: "They automate shortlisting for
  enterprises; we help small agencies make defensible human decisions at a price
  they can afford."

## 5. Pricing (decided — volume bands by resume count)

Unit of value = one resume → one evidence report. Fixed monthly bands (SGD),
no metered surprise fees; outgrow a band → move up next month.

| Plan | Price | Resumes/month |
|---|---|---|
| Starter | **S$249/mo** | up to 200 (~S$1.25/report) |
| Growth | **S$499/mo** | up to 600 |
| Scale | **S$999/mo** | up to 2,000 |
| Enterprise | custom | unlimited |

- **Founding partner offer:** first 10 agencies ~50% off **locked forever**
  (Starter = **S$129/mo**). "Locked forever" is a promise — never raise a price a
  customer signed at; increases apply to NEW customers only.
- **Pilots are FREE** (design partners, one real role). Price talk happens at the
  END of a successful pilot.
- **First revenue goal: 10 founding × S$129 = S$1,290/month recurring.**
- Value math + the "make-them-calculate-it" sales script live in
  `docs/FOUNDER_PLAYBOOK.md` §10. Price is a hypothesis; pilots are the research.

## 6. Payments — deliberately NOT building

No checkout/billing/subscriptions exist and none should be built now. First money
= agreed price in conversation + Stripe Payment Link / PayNow invoice (no code).
Build billing automation only at ~10 paying customers. Any session asked to "add
payments" before then should push back and cite this file.

## 7. Files created in this phase (the kit)

- **`docs/SALES_OUTREACH_KIT.md`** — 3 cold-email templates (defensibility /
  volume / design-partner angles), one-pager pitch, prospect-finding guide (MOM
  directory + LinkedIn), touch sequence (email → LinkedIn → one follow-up → stop),
  honest-selling guardrail. Every email needs a **[LOOM LINK]** — the 2-minute demo
  video is the main missing asset.
- **`docs/FOUNDER_PLAYBOOK.md`** — the founder's study book: pitch in 3 sizes,
  4 pain stories, two-door strategy, demo click-path with what-to-say lines,
  plain-word vocabulary, objection Q&A, banned language, honest status,
  5-day study plan, §10 competitors/WFA/pricing + value-math script.
- **`docs/FOUNDER_SCREEN_GUIDE.md`** — MAY exist: founder was given a prompt to run
  in another session that audits every page element-by-element and produces this
  file with ✅ WORKS / 🔶 NOT BUILT YET / ❌ BROKEN classifications. If it exists,
  the ❌ list is the pre-rehearsal punch-list. If not, the prompt is in this
  session's history; founder reported "some tabs not working properly" — unverified.

## 8. The founder's timeline (agreed)

- **Fri–Sun (Jul 3–5):** compressed study plan — operate the demo via
  MANUAL_TEST_GUIDE, learn playbook (pains, vocabulary, Q&A), practice pitch on
  husband, Sunday full dress rehearsal recorded on phone.
- **Mon (Jul 6):** record clean 2-min Loom; build list of 20 agencies (MOM
  directory + LinkedIn, owner names, one personalization fact each). Claude
  session should HELP build this list if asked.
- **Tue (Jul 7):** first 5–10 personalized emails sent (send Tue–Thu mornings).
- **Then:** LinkedIn touches, one follow-up after 3–4 days, track replies.
  Expectation set: 15–18 of 20 will not reply — normal; goal of round 1 is
  replies/conversations, not sales. Zero replies after 20 → revise message, next 20.

## 9. Rules for any session picking this up

1. **Don't build features. Don't build payments. Don't redesign.** The bottleneck
   is outreach, not code. The only justified code work right now: fixing ❌ BROKEN
   items found in the screen audit (§7) before the demo rehearsal.
2. **Compliance language is sacred** (docs/SAFETY_AND_COMPLIANCE_RULES.md,
   docs/UX_COPY_RULES.md): never "best candidate", "AI selected/rejected",
   "auto reject", "bias-free", "perfect match", "cultural fit", "candidate score".
   This applies to emails and marketing copy too — it IS the differentiation.
3. **Honest selling:** pitch = working pilot + design partners, never "finished
   product" or "fully automated". Pilots may be delivered assisted/manually behind
   the scenes; never promise instant self-serve AI. Say "saves screening and
   documentation time", never "replaces your recruiter".
4. **Keep the founder moving, not planning.** The failure mode of this project is
   another two weeks of polishing. Bias every answer toward the next concrete
   action on the §8 timeline.

## 10. Founder context (how to work with her)

- Non-native English speaker — use simple, clear language; short sentences.
- She provided the idea; AI built the system. She is actively studying it via the
  playbook to be able to explain/demo it herself ("founder confidence" is the
  point — see docs/plans/2026-06-21 file and project memory).
- Motivated by concrete numbers and goals (e.g., "10 × S$129 = S$1,290/mo").
- Prone to discouragement on seeing competitors — the useful reframe that worked:
  competitors prove the market pays; her customer (small agency) isn't served by
  them; her real competitor is "manual screening / no paper trail".
- Pushes back when answers feel like echoes of her own numbers — good instinct;
  give independently derived reasoning with shown math.
- Household insight channel: husband works at a large SG employer — source of the
  wasted-interviews pain story and possible warm intros.
