# Founder Screen Guide — Hiring Evidence System

This guide explains the whole app in simple words. It goes screen by screen.
For each screen it lists the buttons, tables, and links one by one.
It tells you what each one does, and what you can say to a customer.

You do not need to know any code to read this. Short sentences. Plain words.

---

## What this product is (say this in one line)

> "You give it a job and a resume. It gives you back one clear report:
> what the person has proven, what is missing, and what to ask in the interview.
> A person still makes the final choice — the software never decides for you."

---

## How to open the app

1. Open a terminal in the project folder.
2. Type: `npm run dev`
3. Open your browser at **http://localhost:3000**
   - If it says port 3000 is busy, it will open on **http://localhost:3001** instead.
     Both are the same app.

---

## The three marks used in this guide

| Mark | Meaning |
|---|---|
| ✅ WORKS | It does what it should. Safe to show. |
| 🔶 NOT BUILT YET | On purpose, this part is not real yet at this stage. It is not broken. |
| ❌ BROKEN | A real problem: an error, a blank page, or wrong behaviour. |

---

## The golden word rule (very important)

When you talk about this product, and everywhere in the app, we **never** use words that
sound like the computer made the choice by itself, that name someone the top pick, that say
the software throws anyone out on its own, or that promise hiring is completely free of bias.

We say instead: **evidence found**, **evidence missing**, **needs verification**,
**human review required**, **strong evidence**, **decision reason required**.
The whole product is built on this idea: *the computer shows the proof, a person makes the call.*

(The full written list of words to avoid is in `docs/UX_COPY_RULES.md`. Please read it before
writing any new copy.)

---

## Two things you will see on many screens

### 1) The yellow box that says "Seed fallback mode / Missing env vars"
On the inside screens (dashboard, candidates, upload, reports) you will see a yellow box:

> **Development backend — Seed fallback mode — Missing env vars**
> *Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to run the live Supabase smoke test.*

**Do not worry.** This is a note for the developer only. It means the app is running
on built-in demo data instead of a real database. It is **not** an error. In the real
live version this yellow box does not appear. If you show the app to a customer, you can
ignore it, or ask the developer to hide it first. 🔶

### 2) The left menu (only on the inside screens)
The dark menu on the left has: **Dashboard, Jobs, Candidates, Reports, Fairness checks,
Decisions, Settings.** Only three of them go somewhere real right now:

| Menu item | Where it goes | Mark |
|---|---|---|
| Dashboard | The home screen for recruiters | ✅ |
| Jobs | Goes back to the Dashboard (no separate Jobs page yet) | 🔶 |
| Candidates | Opens the Frontend Developer candidate list | ✅ |
| Reports | Opens Amanda Lee's evidence report | ✅ |
| Fairness checks | Goes back to the Dashboard (no page yet) | 🔶 |
| Decisions | Goes back to the Dashboard (no page yet) | 🔶 |
| Settings | Goes back to the Dashboard (no page yet) | 🔶 |

At the top of every inside screen there is also a **search box**, a **bell**, and a **help (?)**
icon. Those three are still decorative and **do nothing when clicked**. 🔶 The big top-bar buttons
(like **"New report"**, **"Upload candidates"**, **"Final decision"**, **"Share report"**) **now work**
and go to a sensible place. ✅

---

# PAGE 1 — Home page (the first thing the outside world sees)

**URL:** `http://localhost:3000/`

**What this page is for:** This is the sales page. It tells a visitor what the product does
and asks them to request a pilot. Start here — this is the page you will show most often.

Go down the page, top to bottom:

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Top bar: **"Hiring Evidence System"** logo | Click it → goes back to this home page | Always a way home | ✅ |
| 2 | Top menu: **01 / Problem, 02 / Process, 03 / Report, 04 / Compliance** | Each click jumps down to that section of this page | Fast way to scroll | ✅ |
| 3 | Green **"Request pilot access"** button (top right) | Click → opens the Request pilot form | Turns a visitor into a lead | ✅ |
| 4 | Big headline **"Evidence over opinion."** | Just text. The main promise | Grabs attention | ✅ |
| 5 | Short paragraph under the headline | Explains: a job + a resume becomes one clear record | Tells the story | ✅ |
| 6 | Green **"Request pilot access"** button | Click → opens the Request pilot form | Main call to action | ✅ |
| 7 | **"View a sample report"** underlined link | Click → opens a real example report (Amanda Lee) | Lets them see the product | ✅ |
| 8 | Small line: **Human decides · PDPA-aware · Full audit trail** | Just text | Builds trust | ✅ |
| 9 | **The card on the right** ("Record · HER-2026-0521-AL") | A small preview of a real report. Shows React (Found), AWS (Verify), Role-related collaboration (Review) | Shows the product at a glance | ✅ |
| 10 | **Process strip** (01–04 steps): Set the job, Collect evidence, Review proof, Record the decision | Just text steps | Shows how it works | ✅ |
| 11 | **Number strip**: 100% human reason, 00 (the system never turns anyone away on its own), 03m resume to report, FULL audit trail | Just text | Simple proof points | ✅ |
| 12 | **01 / Problem** section (three points A, B, C) | Explains why a black-box score is risky | Names the pain | ✅ |
| 13 | **02 / Why** section (three cards: Defensible, Fairness-aware, Evidence not a verdict) | Just text cards | The reasons to buy | ✅ |
| 14 | **03 / Output** section with a small table + **"Open the sample report"** button + **"Watch the demo"** link | "Open the sample report" → Amanda's report. "Watch the demo" → the slideshow page | Shows the real output | ✅ |
| 15 | **04 / Compliance** section (dark, four ticked points) | Just text | Compliance is the headline here | ✅ |
| 16 | **Final section**: "Start with one role." + green **"Request pilot access"** + **"View a sample report"** | Same two links as before | Last chance to act | ✅ |
| 17 | **Footer**: Login, Request pilot, Sample report links + a disclaimer line | Each link goes to that page | Standard footer | ✅ |

**WHAT TO SAY:** "This is our promise — we turn a job and a resume into one clear evidence
report, and a human always makes the final decision."

---

# PAGE 2 — Login

**URL:** `http://localhost:3000/login`

**What this page is for:** The sign-in screen for a recruiter. It is a real design, but real
sign-in is not turned on yet in this demo.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Logo **"Hiring Evidence System"** | Click → home page | Way home | ✅ |
| 2 | **Email address** box | Already filled with `sarah@northstar.example`. You can type in it | Where a user signs in | ✅ (typing works) |
| 3 | **Password** box | You can type. It hides the text | Standard password field | ✅ (typing works) |
| 4 | **"Remember this device"** tick box | You can tick it, but it does nothing yet | Normal login option | 🔶 |
| 5 | Purple **"Sign in"** button | Click → it does **not** log you in yet. It shows a small message: *"Add Supabase env vars before using recruiter sign in."* | Real sign-in is the next build step | 🔶 |
| 6 | Small line: **"Seed fallback mode is active."** | Just a status note for the developer | Tells us we are on demo data | 🔶 |
| 7 | **"Request access"** button | Click → opens the Request pilot form | For new visitors | ✅ |

> **Important:** Because sign-in is not real yet, you do **not** reach the dashboard by
> clicking "Sign in". You reach the inside screens by typing the address (for example
> `/dashboard`) or by clicking the links on the home page and sample report. This is expected. 🔶

**WHAT TO SAY:** "This is the recruiter sign-in. In the pilot we connect it to your real
company accounts."

---

# PAGE 3 — Request pilot access

**URL:** `http://localhost:3000/request-pilot`

**What this page is for:** A short form so a company can ask for a pilot. It checks the fields
and shows a thank-you message.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Left side text: "Start a controlled pilot with one role." + three small tags | Just text | Sets the offer | ✅ |
| 2 | **Company name** box | Type the company name. Required | We need to know who | ✅ |
| 3 | **Work email** box | Type an email. Must be a real-looking email | So we can reply | ✅ |
| 4 | **Your role** box | Type a job title. Required | Who is asking | ✅ |
| 5 | **Hiring volume** dropdown | Pick how many roles. Required | Helps us plan | ✅ |
| 6 | **First role to review** box | Type a role name. Required | Where the pilot starts | ✅ |
| 7 | **Pilot note** box | Type extra notes. Not required | Free space for details | ✅ |
| 8 | **"Request pilot access"** button | Click → if a field is missing, it shows a red message under that field. If all is filled, it shows a green **"Pilot request recorded."** message and clears the form | This captures the lead | ✅ |
| 9 | **"View sample report"** button | Click → opens Amanda's report | Lets them see proof | ✅ |

> **Note:** The request is saved inside your own browser only. It is **not** emailed to you yet.
> Sending it to your inbox is a later step. 🔶

**WHAT TO SAY:** "Fill this in and we set up a one-role pilot for you, on your own candidates."

---

# PAGE 4 — Demo Presentation (the 6-click story)

**URL:** `http://localhost:3000/demo-presentation`

**What this page is for:** A simple slideshow you can put in front of one person to explain the
product in one pass. Six slides.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Left text: "Show the product story in 6 clicks." | Just text | Sets the scene | ✅ |
| 2 | **"Open practical demo"** button | Click → opens the Demo Test Lab page | Go deeper | ✅ |
| 3 | **"View sample evidence report"** button | Click → opens Amanda's report | Show the real output | ✅ |
| 4 | The dark **slide card** ("Slide 1 of 6") | Shows the current slide's words | The story itself | ✅ |
| 5 | The row of **dots** at the top of the slide | Click a dot → jumps to that slide | Move around | ✅ |
| 6 | **"Previous"** and **"Next"** buttons | Click → move back or forward one slide (it loops around) | Step through the story | ✅ |
| 7 | Lower part: **company + role + metric tiles** | Shows Northstar Digital / Frontend Developer and demo numbers | Grounds it in a real example | ✅ |
| 8 | **"Click a resume category"** list on the left | Click a category → the card on the right changes to show that category's example | Shows how each type looks | ✅ |
| 9 | The **sample card** on the right | Shows one example: evidence found, evidence missing, and the recruiter action | Makes it concrete | ✅ |

**WHAT TO SAY:** "Let me walk you through the whole idea in six slides, then show you the real
report."

---

# PAGE 5 — Demo Test Lab (many resumes at once)

**URL:** `http://localhost:3000/demo-test-lab`

**What this page is for:** This proves the product can sort a big, messy pile of resumes into
the groups you expect. It uses **60 made-up resumes** for one role.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Big heading: "Show how evidence grouping works before a pilot." | Just text | Sets the goal | ✅ |
| 2 | Right card: **Company / Role / Test set** | Northstar Digital, Frontend Developer, Frontend evidence pilot set | The example setup | ✅ |
| 3 | **Metric tiles**: 60 resumes, 39 report-ready, 17 human-review, 48 missing-evidence, 59 expected match | Numbers that show how the pile was sorted | Proof it works at scale | ✅ |
| 4 | **Scenario categories** cards | Eight groups (strong, good/verify, missing, needs review, failed/unreadable, wrong role, incomplete, over-claiming) with counts | Shows every real-life case | ✅ |
| 5 | Big **table**: Candidate, Category, Expected group, Observed group, Report status, Recruiter action, Test result | Each row is one made-up resume. "Test result" shows a green **"Expected outcome match"** or a yellow **"Review demo result"** | Shows expected vs. what happened | ✅ |

> **Note:** These 60 resumes are made-up demo data, not real people. Nothing here is clickable
> except reading the table. This page reads the data only. ✅

**WHAT TO SAY:** "Here is a whole pile of 60 resumes sorted into the groups we expected — this
is how it handles a real company's inbox."

---

# PAGE 6 — Dashboard (the recruiter's home)

**URL:** `http://localhost:3000/dashboard`

**What this page is for:** The home screen after a recruiter logs in. It shows the work waiting
for them: numbers at the top, a review queue, and the list of jobs.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Yellow **"Seed fallback mode"** box | Developer note only (see the top of this guide) | Ignore for customers | 🔶 |
| 2 | **"Welcome back, Sarah Tan"** + "9 candidate reports need recruiter review today." | Just text. The name and number come from the data | Friendly start | ✅ |
| 3 | **"Open sample report"** button | Click → opens the first report in the queue (Amanda Lee) | Quick way in | ✅ |
| 4 | Green **"Upload candidates"** button | Click → opens the upload screen for Frontend Developer | Add new resumes | ✅ |
| 5 | Four **metric tiles**: Active jobs (3), Candidates waiting for review (9), Reports completed (9), Decisions needing sign-off (1) | Numbers from the data | The health of hiring at a glance | ✅ |
| 6 | **Review queue** — a list of people waiting (Amanda Lee, Daniel Morris, and more) | Each row shows the name, role, a status tag, a date, and an **"Open report"** link. Click "Open report" → that person's report | The daily to-do list | ✅ |
| 7 | **"Decisions needing sign-off"** dark card with **"Review decisions"** button | The number is real. The **"Review decisions"** button opens a report that still needs a decision | Shows work left to sign off | ✅ |
| 8 | **Recent jobs** table: Frontend Developer, Customer Success Manager, Data Analyst | Shows each job, its department, candidate count, evidence status, and last updated | The list of open roles | ✅ |
| 9 | In that table, the **job title** and the **candidate count** links | Click → opens that job's candidate list | Go into a role | ✅ |
| 10 | In that table, **"Upload candidates"** link (in the last column) | Click → opens the upload screen for that job | Add resumes to that role | ✅ |
| 11 | **"Create job"** button (top of the jobs table) | Removed for now — making a new job comes with the real database step | Avoids a dead button in the demo | 🔶 (removed) |
| 12 | Top bar **"New report"** button | Opens the upload screen (uploading a resume makes a report) | Start a new report | ✅ |

> **Note about the numbers:** Some older notes say "4 waiting" and "3 reports". The app now has
> all three roles filled in, so the true numbers are **9 waiting** and **9 reports**. That is
> correct, not a bug. ✅

**WHAT TO SAY:** "This is the recruiter's home — it shows who is waiting for review and how each
open role is doing."

---

# PAGE 7 — Candidate list (one role at a time)

**URL (Frontend Developer):** `http://localhost:3000/jobs/frontend-developer/candidates`

**What this page is for:** Shows the people for **one job**, grouped by how strong their evidence
is. This is the point of the product: the list is **not all green** — real life is mixed.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Heading with the job title (**Frontend Developer**) | Just text | You know which role you are in | ✅ |
| 2 | Green **"Upload candidates"** button | Click → opens the upload screen for this job | Add more resumes | ✅ |
| 3 | Row of **filter chips** (plus an **All candidates** chip): Strong evidence, Good evidence verification needed, Missing key evidence, Needs human review, Report failed | Click one → the table shows only that evidence group. Click it again or **All candidates** to clear | Focus on one group | ✅ |
| 4 | The **candidate table** | One row per person. Columns: Candidate, Evidence group, Evidence report status, Review status, Uploaded file, Updated, Action | The heart of the page | ✅ |
| 5 | **"View report"** link on each row | Click → opens that person's evidence report | Read the proof | ✅ (see note on Marcus) |

The four Frontend Developer people you will see:

| Candidate | Evidence group | Can you open a report? |
|---|---|---|
| **Amanda Lee** | Good evidence, verification needed | ✅ Yes |
| **Daniel Morris** | Needs human review (file could not be read) | ✅ Yes |
| **Priya Shah** | Strong evidence | ✅ Yes |
| **Marcus Wong** | Report failed | ❌ No report — his "View report" link just returns you to this same list. This is **on purpose**: when a report fails, the system does not invent one. 🔶 |

> **The other two roles work the same way. Try them:**
> - Customer Success Manager: `http://localhost:3000/jobs/customer-success-manager/candidates`
>   (Elena Garcia = strong, David Lim = good/verify, Hannah Cole = missing, Marcus Vance = report failed)
> - Data Analyst: `http://localhost:3000/jobs/data-analyst/candidates`
>   (Nadia Hassan = strong, Ben Carter = good/verify, Sofia Ruiz = missing)

**WHAT TO SAY:** "Notice it is not all green — each person gets an honest, different result, and
you can open the proof behind every one."

---

# PAGE 8 — Upload candidates (add resumes)

**URL:** `http://localhost:3000/jobs/frontend-developer/candidates/upload`

**What this page is for:** Drop in resume files for one job. The screen checks each file and
prepares a report for the good ones.

| # | What you see | What it shows / what happens on click | Why it matters | Mark |
|---|---|---|---|---|
| 1 | Heading **"Frontend Developer"** + short text | Tells you the job you are adding to | Context | ✅ |
| 2 | The big **drop area**: "Drag and drop PDF or DOCX resumes" | Drag files in, or click it to choose files | The main action | ✅ |
| 3 | Small line: **"Accepted file types: PDF, DOCX. Max file size: 10 MB"** | Just the rules | Sets limits | ✅ |
| 4 | **Tick box**: "I confirm that my organisation has permission…" | You must tick this first | Privacy / consent guardrail | ✅ |
| 5 | Green **"Upload candidates"** button | It is **greyed out** until you tick the box above. Then it becomes clickable | Stops uploads without consent | ✅ |
| 6 | **Total / Processed / Failed** counters | Numbers go up as you add files | See progress | ✅ |
| 7 | A strip of **state words** (Waiting for upload, Validating, Report ready, etc.) | Just labels that explain the steps a file goes through | Teaches the flow | ✅ |
| 8 | The **"Uploaded files"** table | One row per file you dropped. Shows file name, detected name, upload status, parsing status, report status, current state, error message, and a **"View report"** link | Watch each file | ✅ |
| 9 | **"View report"** link on a good file | Click → opens the report made from that file, with a **"Demo preview report"** yellow banner on top | Read the made report | ✅ |

**What happens when you drop files (this really works):**
- A good **PDF or DOCX** → row shows **Uploaded / Report ready** and gets a **"View report"** link. ✅
- A **wrong type** (like a `.png` or `.zip`) → row shows **Failed** with **"Unsupported file type"**. ✅
- A file **over 10 MB** → row shows **Failed** with **"File too large"**. ✅

> **Be clear-eyed about this (say it honestly if asked):** The report made from an upload is
> **scripted from the file's category, not read from the real words in the file yet.** That is why
> every uploaded report carries a **"Demo preview report"** banner. Real reading of the document by
> AI is the next build step. Also, uploaded files and their reports **disappear when you refresh
> the page** — the page only remembers them until you refresh. This is expected. 🔶

**WHAT TO SAY:** "Drop in a pile of resumes — good PDFs and Word files are accepted, wrong or huge
files are refused, and each good one gets its own evidence report."

---

# PAGE 9 — Evidence report (the core product)

**Sample report URL:** `http://localhost:3000/reports/candidate-evidence` (this shows **Amanda Lee**)
**A strong report URL:** `http://localhost:3000/reports/HER-2026-0521-PS` (this shows **Priya Shah**)

**What this page is for:** This is the main thing you sell. It turns one job + one resume into a
full, honest report. Read it top to bottom.

| # | What you see | What it shows | Why a recruiter needs it | Mark |
|---|---|---|---|---|
| 1 | Yellow **"Seed fallback mode"** box | Developer note only | Ignore for customers | 🔶 |
| 2 | Yellow **"Demo preview report"** box | Shows **only** on reports made from an upload, to say "this is a demo preview, not real AI reading" | Honesty | ✅ |
| 3 | **Candidate header**: name, role, company, application date, report time, report ID, assigned recruiter | Who this is about | Sets the scene | ✅ |
| 4 | **Status tags** at the top right | Small coloured tags for the report status (the old duplicate-tag bug is now fixed) | Quick status | ✅ |
| 5 | Four **summary tiles**: Evidence match, Verification needed, Missing evidence, Human decision | The short version of the whole report | Fast read | ✅ |
| 6 | Blue banner: **"AI-assisted analysis. Human review is required before making any hiring decision."** | The safety line | Keeps the human in charge | ✅ |
| 7 | **Left panel**: candidate detail, "Fairness summary — Passed", a recruiter note, and **"View resume"** / **"Add to recruiter notes"** buttons | Facts about the person and consent. **"View resume"** jumps to the document sources; **"Add to recruiter notes"** jumps to the notes box | Context in one place | ✅ |
| 8 | **Evidence Matrix** table | Each job requirement in its own row: the evidence found, the source, a confidence tag, what to verify, and a status | This is the star of the show — proof, requirement by requirement | ✅ |
| 9 | **Missing evidence** box | The gaps to check | So nothing is assumed | ✅ |
| 10 | **Suggested interview questions** box | Ready questions to ask, tied to the gaps | Saves the recruiter time | ✅ |
| 11 | **Recruiter decision notes** area | Type a note and press **Add note** → it is added to the notes for this session (not kept after a refresh yet) | Space for the recruiter's own notes | ✅ |
| 12 | **Document sources** box | The file(s) the evidence came from | Traceability | ✅ |
| 13 | **Audit trail preview** box | A short list of what the system recorded | Proof of a paper trail | ✅ |
| 14 | **Fairness Check** panel | "Passed", "Protected characteristics not used — Confirmed", "Decision wording warning — None", and the list of characteristics never used | Shows fair-hiring care | ✅ |
| 15 | **Human Decision** panel | Four choices (Shortlist for interview, Hold for review, Not proceeding, Request more information), a **required reason box**, and a **"Save decision"** button | The most important part — see below | ✅ |
| 16 | **Export PDF** row | The **"Export PDF"** button opens your browser's print dialog → choose "Save as PDF". The page is cleaned up for printing automatically | Save/share the report | ✅ |

### The Human Decision panel — the part that really works
This is the strongest "it actually works" moment. Try it live:
1. Pick a choice (for example **Shortlist for interview**) but leave the reason box **empty** and
   press **"Save decision"**.
2. It **blocks you** and says **"Decision reason required."** ✅
3. Now type a real reason (for example: *"Strong React evidence; confirm AWS depth in interview."*)
   and press **"Save decision"**.
4. It accepts it and says **"Recruiter decision recorded."** ✅
5. If you refresh the page, the saved decision is gone. That is expected here — there is no real
   database yet. The check and the save action still run for real. 🔶

**WHAT TO SAY:** "This is the report — every requirement has its proof, its gaps, and the questions
to ask. And notice: the software will not let anyone save a decision without writing a
job-related reason first."

---

## ✅ Broken list — fixed

The one bug that was found — the green tag **"Evidence report ready"** showing **twice** on strong
reports (Priya, Elena, Nadia) — has been **fixed**. The tag now shows once, and the hidden developer
console warning is gone. Every page loads, with no blank pages or crashes.

---

## ✅ Buttons that now work (just fixed)

These used to do nothing. They have now been wired up:

- **Candidate-list filter chips** → now filter the table by evidence group (plus an "All candidates" chip).
- **Export PDF** (report) → opens your browser's print dialog, where you can Save as PDF. The page is
  cleaned up for printing automatically (no menu or dev box).
- **Add note** (report) → the note you type is added to the recruiter notes for this session.
- **View resume** and **Add to recruiter notes** (report side panel) → jump to the right part of the report.
- Top buttons **New report, Upload candidates, Back to candidates, Final decision, Share report,
  Review decisions** → all go to a sensible place (Share report copies the link).
- The old **"Create job"** button was removed for now (making a job is part of the real database step).

---

## 🔶 Still not built yet — do not worry (this is normal at this stage)

- Real **sign-in** — the "Sign in" button does not log you in yet; it shows a developer message.
- The top-bar **search box, bell, help (?)** — still decorative.
- Left menu items **Jobs, Fairness checks, Decisions, Settings** — they still return to the Dashboard.
- The report **recruiter notes and saved decisions are not kept after you refresh** (no database yet).
- **Uploaded resumes and their reports disappear when you refresh** — the page only remembers them
  until you refresh (no database yet).
- Uploaded reports are **scripted from the file's category, not read from the real file text yet** —
  that is why they carry a **"Demo preview report"** banner.
- **Request pilot** form saves only inside your browser; it is not emailed to you yet.
- The yellow **"Seed fallback mode"** developer box shows on the inside screens; it will not appear
  in the real live version.
- **Marcus Wong / Marcus Vance** ("Report failed") — no report opens; the link returns to the list.
  This is correct on purpose: the system does not invent a result when a report fails.

---

*End of guide. Nothing in the app was changed to make this guide — it only looks and reports.*
