# Founder Playbook — Know Your Own Product

**Who this is for:** You, the founder. Study this until you can say every section
out loud without reading it. This is the material for explaining the product to a
recruiter, an agency owner, or a hiring manager — in an email, a call, or a demo.

**How to study it:** don't memorize — *operate*. Run the demo yourself every day for
5 days (plan at the bottom), and after each run, explain one section of this document
out loud in your own words, as if a recruiter is sitting in front of you. If you get
stuck, that's the part to re-read. This is the fastest way to stop feeling clueless
about your own system.

---

## 1. What the product is (three sizes — memorize these)

**10 seconds (elevator):**
> "It reads resumes against your job requirements and gives your team a one-page
> evidence report per candidate — what's proven, what's missing, what to verify in
> the interview. A human still makes every decision, with a reason on record."

**30 seconds (adds the 'why'):**
> "Hiring teams either drown in CVs or use AI screeners that reject people in a
> black box — which nobody can defend if it's challenged. We do the opposite: the
> system organizes the *evidence* — skills proven, gaps, what to verify — and the
> recruiter decides, with a written reason and an audit trail. Hire with evidence,
> not guesswork."

**2 minutes (the full story):** the 10-second version, plus:
- Walk through one report: evidence matrix → missing evidence → suggested interview
  questions → fairness check → human decision with required reason → audit trail.
- End with: "So when anyone asks 'why did you shortlist her and not him?', the answer
  is on record, and it's about the job — nothing else."

**The three lines that ARE the product (never deviate):**
1. **AI assists. Human decides. Evidence explains.**
2. **Hire with evidence, not guesswork.**
3. "AI-assisted analysis. Human review is required before making any hiring decision."

---

## 2. The pain points — WHY anyone needs this

You must be able to tell these as *stories*, not features.

### Pain 1 — The resume pile (recruiters & agencies feel this daily)
One open role gets 100–300 applications. A recruiter gives each CV a ~6-second skim.
Good people get missed; weak-but-well-formatted CVs get through. Nobody can honestly
say the screening was thorough.
**What we do about it:** every CV becomes a structured evidence report against the
*actual job criteria* — so the skim becomes a review, and nothing is judged on
formatting or gut feel.

### Pain 2 — Wasted interviews (employers feel this — your strongest story)
When a mismatched candidate reaches the interview stage, the company pays for it:
a recruiter screen (~30 min) + a hiring-manager interview (~60 min) + scheduling,
prep, and debrief. **One wasted interview ≈ 3–5 staff hours**, and the hiring
manager's hours are the expensive ones. If a company interviews 10 people per role
and half were never a real match, that's **15–25 hours burned per role** — and
senior people's frustration on top.
**What we do about it:** the mismatch is visible *before* the interview is booked.
The report shows "missing key evidence" or "wrong role" on paper, in minutes.
*(You know this pain is real — you've heard it first-hand from a large Singapore
employer. Use that story, without naming anyone, when you pitch.)*

### Pain 3 — Indefensible decisions (the compliance angle — growing fast)
"AI hiring tools" that score or auto-reject candidates are becoming a legal and
reputation risk (the EU already classifies hiring AI as high-risk; New York requires
bias audits). If a rejected candidate — or a regulator — asks "why?", "the algorithm
said so" is the worst possible answer.
**What we do about it:** the AI never decides. Every decision is made by a named
human, requires a written job-related reason, and is logged with a timestamp. The
fairness check flags risky wording. Protected characteristics (age, gender, race,
photo…) are never used. **This is the moat — competitors selling "AI picks the best
candidate" cannot copy this without changing what they are.**

### Pain 4 — Agencies can't *prove* their shortlist quality
An agency's product is "trust us, these five are good." Clients push back, second-
guess, or go around them.
**What we do about it:** the agency attaches an evidence report to every candidate
they submit. The shortlist arrives with *proof*. This upgrades the agency's own
product — and (bonus for us) every report a client receives is a demonstration of
our system inside that company.

---

## 3. Who it's for — the two doors (one product, two pitches)

| | **Door 1: Recruiting agencies** (START HERE) | **Door 2: Employers / in-house teams** (NEXT) |
|---|---|---|
| Their daily pain | Volume screening + proving shortlist quality to clients | Wasted interviews on mismatched candidates |
| What they buy | "Screen faster, and send clients shortlists **with evidence attached**" | "Stop interviewing people who were never a match" |
| Why first/second | Small firms, owner decides fast, feel the pain every day | Real pain but slower buyers; big firms (banks, exchanges) take 6–18 months of procurement |
| The bridge | Every evidence report an agency sends a client **advertises the product inside that employer** | They arrive already having *seen* reports from their agencies |

**Product changes needed for the two doors: almost none.** Same reports, same
workflow. The one future feature that unlocks the bridge is **"share report with
client"** (a clean, read-only link an agency can send). Note it on the roadmap; don't
build it before the first pilot asks.

**Sequence:** Singapore recruiting agencies (small/mid) → their clients see reports →
mid-size Singapore employers → only then enterprise. Use the large-employer story
(wasted interviews) as *evidence the pain exists* in every pitch, not as the first
sales target.

---

## 4. How to operate the product (the click path + what to SAY)

Full click-by-click detail lives in `demo-test-kit/MANUAL_TEST_GUIDE.md`. This is the
condensed *demo-giving* version — each stop is: where to click, and the one sentence
to say.

0. **Start:** `npm run dev` → http://localhost:3000
1. **Landing page** — *"The promise: evidence reports, not black-box scores. A human
   makes every final decision."*
2. **Dashboard** (`/dashboard`) — *"This is the recruiter's morning view: active jobs,
   who's waiting for review, which decisions still need a human sign-off."*
3. **Candidate list** (`/jobs/frontend-developer/candidates`) — *"One role, four
   candidates, four different honest outcomes — strong, needs verification, needs human
   review, and one failed file. Note it's not all green; the system doesn't flatter."*
4. **Evidence report — Priya Shah** (the core of the whole product) — walk it top to
   bottom: *"Each job requirement, the evidence found for it, the source, and a status.
   Below: what's missing, and the interview questions to ask because of it. A fairness
   check. And the decision panel."*
5. **Record a decision — THE moment of every demo:** choose "Shortlist for interview,"
   try to save **with no reason** → it blocks you. Say: *"This is the whole philosophy
   in one interaction — the system will not let a human decision be recorded without a
   written, job-related reason. That reason goes to the audit trail."* Then type a real
   reason and save.
6. **Upload** (`/jobs/frontend-developer/candidates/upload`) — drag sample CVs in;
   show consent checkbox (PDPA), a wrong-type file rejected, an oversized file rejected,
   then "Report ready → View report."
7. **Bulk pile** — drag all 24 files from `demo-test-kit/bulk-resumes/frontend-developer/`
   at once: *"This is what a real inbox looks like — and every file becomes a report."*
8. **Demo Test Lab** (`/demo-test-lab`) — *"60 test resumes across 8 quality categories,
   with expected-vs-actual matching — this is how we test that the system sorts a messy
   pile the way a careful human would."*
9. **6-click story** (`/demo-presentation`) — the slideshow version, for when you have
   two minutes, not ten.

**Reset to a clean state anytime:**
`bash demo-test-kit/generate-sample-cvs.sh` and `node demo-test-kit/generate-bulk-resumes.mjs`

---

## 5. Every screen & term in plain words (your vocabulary)

- **Evidence match** — how much of the job's requirements the resume actually
  demonstrates. NOT a candidate score, NOT a ranking. (Never say "score.")
- **Evidence matrix** — the table at the heart of the report: one row per job
  requirement → what evidence was found, where it came from, and its status.
- **Missing evidence** — requirements with nothing to support them. NOT "weak
  candidate" — the person may be great; the *resume* doesn't show it. This framing
  matters and recruiters respect it.
- **Needs verification** — evidence exists but is thin or unconfirmed → becomes a
  suggested interview question. This turns the report into an *interview prep sheet*.
- **Suggested interview questions** — generated from the gaps. This is many
  recruiters' favorite feature: the interview writes itself from the evidence.
- **Fairness check** — confirms protected characteristics (age, gender, race, photo,
  nationality…) were not used, and flags risky decision wording.
- **Human decision panel** — the four allowed outcomes: *Shortlist for interview /
  Hold for review / Not proceeding / Request more information.* Reason is mandatory.
- **Audit trail** — the permanent log: who decided, what, why, when. This is what
  makes decisions defensible later.
- **"Needs human review"** — the system saying "I'm not sure" (e.g., unreadable file)
  instead of guessing. Honesty as a feature.
- **"Report failed"** — a file that couldn't be processed stays visibly failed. The
  system never invents a result.

---

## 6. Questions people WILL ask — and your answers

**"So the AI decides who gets hired?"**
> "No — that's exactly what we built against. The AI organizes evidence; a human
> makes every decision and must write down the job-related reason. The system
> literally blocks a decision with no reason." *(Show it — it's the best 10 seconds
> of the demo.)*

**"How is this different from an ATS?"**
> "It's not an ATS and doesn't replace one. An ATS tracks *where* candidates are in
> the pipeline. We answer a different question: *what does the evidence say about
> this candidate, against this job?* It sits alongside whatever you use."

**"What if the AI gets it wrong?"**
> "Everything is editable and everything is reviewed — the report is an assistant's
> draft, never a verdict. And when the system can't read a file or isn't sure, it says
> 'needs human review' instead of guessing. Honesty over confidence."

**"Is this legal? What about PDPA / discrimination rules?"**
> "It was designed around that concern, not patched later. Protected characteristics
> are never used. Candidates consent before processing. Every decision is human,
> reasoned, and logged. If anyone ever asks you 'why was this candidate not taken
> forward?', you have a defensible, job-related answer on record."

**"Is my candidates' data safe?"**
> "Candidate data is treated as private hiring data — company-scoped access, consent
> before processing, file limits, audit logs, deletion controls." *(For pilots, be
> concrete about the current setup and what you'll handle manually.)*

**"How much does it cost?"**
> "Right now I'm onboarding a small number of design partners free — you run it on
> one real role, I support it personally, and your feedback shapes the product.
> Pricing comes after the pilots prove the value."

**"Is this a finished product?"**
> *(Honesty rule — never oversell.)* "It's a working pilot. The workflow, reports,
> decision and audit system are real. Some of the processing I still run assisted
> behind the scenes during pilots — you get the same output, and it means pilot
> partners get white-glove attention. Fully self-serve comes next."

**"Can it integrate with [our ATS / LinkedIn / job boards]?"**
> "Not yet — pilots run standalone: upload CVs, get reports. Integrations get
> prioritized by what pilot partners actually need."

---

## 7. What to NEVER say (compliance — this protects YOU)

Banned everywhere — emails, demos, small talk:
**"best candidate" · "AI selected / AI rejected / AI decides" · "auto reject" ·
"bias-free" · "guaranteed fair" · "perfect match" · "candidate score" ·
"culture fit" · "winner" · "bad candidate"**

Say instead: *strongest evidence match · insufficient job-related evidence found ·
needs verification · human review required · evidence report ready.*

Why this is a selling point, not a restriction: careful language is *the product's
credibility*. If you talk like the black-box tools, you become one in the buyer's
mind — and you lose the only positioning that's yours.

---

## 8. Honest status (know your own truth-line)

Working today: the full workflow UI, evidence reports, mandatory-reason human
decisions, audit logging, upload validation (PDF/DOCX, 10 MB, consent gate), three
complete demo roles, bulk handling, the test lab.
Not built yet: real AI text parsing (demo reports are scripted by category), real
database persistence, real auth, payments, PDF export.
**Pilot promise you can honestly make:** "You give me one real role and real CVs;
you get real evidence reports and the full decision workflow — I personally make
sure of it." (Assisted behind the scenes is fine; a false "fully automated" claim
is not.)

---

## 9. Your 5-day study plan (do, don't just read)

- **Day 1 — Operate.** Run the full `MANUAL_TEST_GUIDE.md` top to bottom yourself.
  Write down anything you clicked without understanding.
- **Day 2 — The report.** Study section 5 (vocabulary). Open Priya, Amanda, and
  Daniel's reports and explain OUT LOUD what's different between them and why each
  matters to a recruiter.
- **Day 3 — The pains.** Learn the four pain stories (section 2) by heart. Tell each
  as a 30-second story to another person — your husband is the perfect audience for
  Pain 2, since he's lived it. Let him push back.
- **Day 4 — The pitch + Q&A.** Practice the 10s / 30s / 2-min versions. Have someone
  fire section-6 questions at you, out of order, until answers come without thinking.
- **Day 5 — Full dress rehearsal.** Give the complete demo (section 4 click path,
  saying every line) to one real human. Record it on your phone. Watch it once.
  **That recording, cleaned up, is your Loom for the outreach emails**
  (`docs/SALES_OUTREACH_KIT.md`).

After Day 5 you are not "the person whose AI built a product." You are the founder
who can operate, explain, and defend every screen of her own system — which is the
only kind of founder a customer will trust.

---

## 10. Competitors, the new law, and pricing (researched July 2026)

### Competitors in Singapore — yes, they exist, and that's GOOD
- **X0PA AI** (Singapore) — enterprise AI recruitment, automated screening and
  shortlisting, "cultural fit" scoring. ~US$36,000/year. AI-Verify certified.
- **impress.ai** (Singapore) — AI recruiting chatbots/screening for large employers.
- **Interviewer.AI / Xobin** — AI video interviews and skill assessments.
- **Manatal** (SE Asia) — the ATS small agencies actually use. US$15–55/user/month.

**Why competition is good news:** it proves Singapore companies already pay for
this category. **Your gap:** small/mid agencies cannot afford US$36k/year enterprise
tools, and cheap ATS tools don't produce evidence reports or defensible decisions.
You live in the space between. **Your difference:** competitors sell automated
shortlisting and "cultural fit" scores — exactly the black-box approach your product
refuses. Never compete on their axis; sell defensibility.

### The Workplace Fairness Act (WFA) 2025 — your best sales weapon
Singapore's WFA (passed Jan 2025, commencing ~2026–2027) requires employers using
AI in hiring to have **traceable, checkable AI outputs before any decision**, **human
oversight of final decisions**, and **retained documentation proving decisions were
fair** — with the burden of proof on the employer. That is, point by point, what
this product produces (evidence reports / required human decision with reason /
audit trail). TAFEP's own campaign line is "Fair Hiring First, AI Second: People
Make the Final Decisions."
**Pitch upgrade:** "A new law is coming that makes you prove your hiring decisions
were fair. This tool produces that proof as a by-product of normal screening."
(Be accurate: say "designed to support WFA readiness," never "guarantees compliance.")

### Pricing principles (when pilots end)
1. Pilots are free (design partners). Price only after value is proven.
2. **Cheap is dangerous in B2B** — a too-low price signals a toy and scares buyers.
3. Anchor to the pain: one wasted interview = 3–5 staff hours; a WFA discrimination
   complaint = far more. A few hundred dollars/month is small against that.
4. **Model: volume bands by resume count** (the unit of value = one resume → one
   evidence report). Fixed monthly price per band, no surprise metered fees; outgrow
   a band → move up next month.
   - Starter **S$249/mo** — up to 200 resumes/month (~S$1.25/report)
   - Growth **S$499/mo** — up to 600 resumes/month
   - Scale **S$999/mo** — up to 2,000 resumes/month
   - Enterprise — custom
   - **Founding partner offer:** first 10 agencies, ~50% off locked forever
     (Starter = S$129/mo). Pitch line: "About a dollar per candidate report —
     versus the S$3–6 of recruiter time each CV costs to screen manually, and
     the interviews you won't waste."
   Value math behind it: manual screening ≈ S$3–6/CV of recruiter labor; one
   wasted interview ≈ S$150–400; one agency placement fee ≈ S$8k–20k; agencies
   already pay ~S$180+/mo for a LinkedIn Recruiter seat. SaaS norm: charge
   10–25% of delivered value → S$150–375/mo band for a small agency.
   Never US$15/user — that's competing with Manatal on the wrong axis.
5. If a pilot partner says "that's reasonable" instantly — the price was too low.
6. First revenue goal: **10 founding agencies × S$129 = S$1,290/month recurring.**
7. Price is a hypothesis — the 10 pilot conversations are the pricing research.

### The value-math script (make THEM calculate it — kiasu-proof close)
Never claim "this is worth S$1,000" — ask two questions and let them compute it:
1. *"How many CVs does your team look at in a month, roughly?"* (say: 300)
2. *"How long does someone spend on each — five, ten minutes?"* (say: 10 min)
Then: *"So that's ~50 hours a month of screening — at recruiter salary, about
S$1,200–1,500 of work. This does the reading and documentation layer for S$129.
You keep the difference — and your people spend those hours talking to candidates."*
The conclusion is THEIR number, so they believe it.

Email one-liner version: "Agencies typically spend S$1,000+ a month of recruiter
time just reading CVs. This does that layer for S$129 — about a dollar per
candidate, with a fairness paper-trail included free."

GUARDRAIL: say it "saves the screening and documentation time" — NEVER "replaces
your recruiter" or "does the screening for you." The human still reviews every
report and makes every decision (that's the product's identity and the honest
claim at pilot stage). Bonus: "your recruiter still decides everything — they
just stop wasting hours on paperwork" reassures a proud agency owner.

Sources: x0pa.com/pricing, getapp.sg (X0PA ~US$36k/yr), manatal.com/pricing,
K&L Gates & National Law Review analyses of the WFA + AI recruitment tools,
tal.sg/tafep "Fair Hiring First, AI Second", sso.agc.gov.sg (WFA 2025).
