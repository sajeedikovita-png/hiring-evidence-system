# Pilot User Lifecycle — Design (2026-07-27)

**Status:** Design only. Nothing in here is built yet unless marked ✅.
**Follows:** `docs/plans/2026-07-03-go-to-market-handoff.md` (selling phase).
**Question this answers:** a real recruiter asks for access — what happens, step by
step, from that moment until they are a paying customer?

---

## 1. Why this document exists

The request form, the admin approval screen, and the invitation email are built.
But nobody has ever walked the path *after* approval. When we traced it, we found
the journey **stops working the moment a real pilot user signs in**.

This is not a polish problem. It is the difference between a pilot that starts and
a pilot that dies in the first five minutes.

## 2. Current state — verified 27 Jul 2026

### ✅ What works today

| Step | Where | Verified |
|---|---|---|
| Visitor submits request | `RequestPilotPage` → `access_requests` table | ✅ live |
| Founder sees pending requests | `/admin` (`AdminPage.tsx`) | ✅ live |
| Approve marks the row approved | `approve-request` edge function | ✅ live |
| Invitation email sent | Supabase `inviteUserByEmail`, falls back to recovery | ✅ live |
| User sets a password | `/welcome` (`SetPasswordPage.tsx`) | ✅ live |

### ❌ What breaks immediately after that

**B1 — The welcome page sends pilots to the admin screen.**
`SetPasswordPage.tsx:105` — after saving their password the button "Go to my
workspace" links to `/admin`. A pilot user is not an admin. They land on a page
built for the founder and will be refused.

**B2 — Signing in throws an error instead of opening a workspace.**
Once a session exists, the app switches from the seed demo to real per-account data
(`hiringRepository.ts:117`). It then looks the user up in `recruiter_profiles`
(`supabaseHiringRepository.ts:319-328`). **Nothing ever creates that row.** The only
profiles that exist were hand-written for the founder
(`migrations/202607060001_admin_workspace.sql`, hardcoded UUID) and `bootstrap.sql`.
A new pilot has no company and no profile, so the lookup fails with
*"Active company context not found"*.

**B3 — A pilot cannot create a job.**
There is no create-job screen anywhere. The dashboard's "New report" button is
hardcoded to the demo role (`DashboardPage.tsx:66`). Even with B1 and B2 fixed, a
pilot company would have an empty workspace and no way to add their own role.

**B4 — Signing in makes the product worse, not better.**
Logged out, a visitor sees the full working demo. Logged in, a pilot sees an error
or an empty workspace. **Right now, having an account is a downgrade.**

**B5 — No trial period exists.** No start date, no end date, no expiry, no concept
of an active or lapsed pilot anywhere in the schema or the code.

**B6 — No pilot → customer path.** Deliberate (handoff §6: no payments code yet),
but also undesigned. Nothing records that a pilot ended, what the outcome was, or
what happens to their data afterwards.

---

## 3. The decision that shapes everything: concierge first

There are two ways to deliver a pilot. Choose deliberately.

### Path A — Concierge pilot (recommended for pilots 1–3)

The founder runs the pilot inside her own workspace. The pilot company sends their
job description and their CVs by email. The founder produces the evidence reports
and sends them back (or screen-shares a walkthrough call).

- **Build required: none.** B1–B6 do not block this.
- **Can start: this week.**
- Honest to say: *"I'll run your first role through it and walk you through the
  reports."* This is a real service, not a fake product.
- Matches the handoff's guardrail: pilots may be delivered assisted behind the
  scenes; never promise instant self-serve.
- **What it buys:** the fastest possible answer to the only question that matters —
  *do recruiters find the evidence report useful enough to pay for?*

### Path B — Self-serve pilot accounts

The pilot logs in and runs their own role. This is the real product.

- **Build required: B1, B2, B3 minimum.** B5 if trials are time-boxed.
- Nothing here is huge on its own, but together it is a multi-day build.
- **Only worth starting once at least one pilot has said yes** and asked for their
  own login. Build it for a named customer, not for an imagined one.

### Path C — Per-company demo link (founder's proposal, 27 Jul)

Give each approved company **its own link** so they try the product themselves, in
real time, with no login. Sits between A and B.

This exists in two forms, and the difference matters:

**C1 — Named demo link (cheap).** A link such as `/?company=acme` that shows their
company name and otherwise runs the existing login-free demo. Their uploads stay in
their own browser (localStorage), exactly as the demo works today.

- Cost: ~half a day.
- They can upload their own CVs and get real evidence reports. **Requires the
  17 Jul build to be deployed** — the current live build has no real analysis.
- Gives the feeling of "our workspace" and a link that can be retired per company.
- Does **not** persist across devices or survive clearing the browser, and gives the
  founder **no visibility** into whether they used it.

**C2 — Real per-company workspace.** Their data lives on the server, isolated to
them. This is Path B by another name — provisioning, access control, and row-level
security are the same work whether entry is by password or by link.

- Cost: the full Path B build.
- Only this version supports usage tracking and trial expiry.

> **A link is not cheaper than an account because it skips the password. It is
> cheaper only if the data stays in the visitor's browser.** The moment each company
> needs its own stored data, the cost is the same as accounts.

### Recommended sequence

1. **Deploy the 17 Jul build** — without it, no self-serve trial shows real analysis.
   This is the single highest-value step and it is not a build, it is a deploy.
2. **One shared demo link** for outreach. Same link for everyone. Zero extra work.
3. **C1 named links** when a prospect asks for something that feels like theirs.
4. **B/C2** when a pilot needs their data to persist, or when tracking genuinely
   matters — realistically pilot #4 or the first paying customer.

Concierge (Path A) remains the fallback for any pilot who wants their real role run
for them rather than doing it themselves. It is not replaced by C.

---

## 4. The full lifecycle (target design)

Stages marked **[A]** work today under concierge. **[B]** needs the self-serve build.

### Stage 0 — Prospect
Cold email → clicks the demo link → uses the login-free demo. No account, no
friction, nothing to break. **[A] works today.**

### Stage 1 — Request
Prospect fills the pilot request form. **[A] works today.**

Fields collected today: company name, work email, requester role, hiring volume,
first role to review, note.
**Gap:** company size is not collected. Submitted date is stored (`created_at`) but
not shown on the admin screen.

### Stage 2 — Review
Founder opens `/admin`, reads the details, decides. **[A] works today.**

**Small improvements worth making (~30–60 min total):**
- show `created_at` on each row — you cannot judge urgency without a date
- add a company-size field to the form + table
- show requests newest-first with pending separated from decided *(already ordered
  newest-first; grouping is the gap)*

**Not worth building yet:** an email notification to the founder on every new
request. Needs a third-party email service (Supabase auth mail cannot send it).
Revisit when request volume makes checking the page annoying.

### Stage 3 — Approve
Founder clicks "Approve & email". Row marked approved, invitation email sent.
**[A] works today.**

**[B] must add:** provisioning. On approval, create the company row and an active
`recruiter_profiles` row (role `recruiter`, not `admin`) for that email, and record
the pilot start date. Without this, Stage 5 fails (B2).

### Stage 4 — Set password
User clicks the emailed link, lands on `/welcome`, sets a password.
**[A] works today — but the exit is wrong (B1).**

**Fix (small, do it whenever we touch this):** send them to `/dashboard`, not
`/admin`.

### Stage 5 — First session **[B]**
The pilot signs in and should land on a workspace that belongs to them.

Required before this is safe to expose:
- provisioning from Stage 3 (B2)
- a create-job screen (B3)
- an empty state that tells them what to do first, rather than a blank page
- signing in must never be worse than not signing in (B4)

### Stage 6 — Running the pilot
One real role, their real CVs, real evidence reports, human decisions with written
reasons, audit trail.

- **[A]** concierge: founder runs it, sends reports, and asks for feedback directly.
- **[B]** self-serve: they run it themselves.

**Trial length: to be decided.** Suggested default **14 days from first sign-in**,
one role. Long enough to cover a real shortlist; short enough to force a decision.

**[B] must add** to support a time-boxed trial (B5): `pilot_started_at`,
`pilot_ends_at`, and a status of active / ended on the company record.

### Stage 7 — Outcome conversation
At the end of the pilot, a real conversation: what worked, what didn't, would you
keep using it. Price is discussed **here**, never earlier (handoff §5).

### Stage 8 — Convert to paying
Per handoff §6, **no payments code**. First money is an agreed price in conversation
plus a Stripe Payment Link or PayNow invoice, sent by hand.

What still needs deciding:
- what happens to a pilot workspace that does not convert (keep read-only? export
  their data? delete on request?)
- data retention and deletion promise — this is a **PDPA** question and pilots will
  ask it. Must be answered before the first real candidate CV is uploaded by a
  customer.

---

## 5. What to build, in order

| # | Item | Size | Do it when |
|---|---|---|---|
| 1 | Show submitted date on `/admin` | ~30 min | now |
| 2 | Company size field on the request form | ~1 h | now, if wanted |
| 3 | Fix `/welcome` → `/dashboard` (B1) | ~10 min | now — it is a one-line bug |
| 4 | Provision company + profile on approval (B2) | ~half day | first pilot that wants a login |
| 5 | Create-job screen (B3) | ~1 day | same |
| 6 | Empty-state onboarding for a new workspace | ~half day | same |
| 7 | Trial dates + active/ended status (B5) | ~half day | when a pilot is time-boxed |
| 8 | Founder notification email on new request | ~half day + service signup | when volume justifies it |
| 9 | Usage/activity visibility | multi-day | **not before 4+ live pilots** |

**Items 1 and 3 are worth doing immediately** — one is a 30-minute gap, the other is
a one-line bug that sends customers to the wrong page.

**Items 4–7 should wait for a named pilot.** Building them now is building for
nobody.

**Item 9 is deliberately last.** Usage dashboards answer *"did they log in?"*. A
day-7 email answers *"what did you think?"* — which is the answer a design partner
pilot actually exists to get. Track the first few pilots in a spreadsheet: company,
approval date, day-7 check-in date, outcome. That is enough until it isn't.

---

## 6. Open decisions for the founder

1. **Concierge or self-serve for pilot #1?** (Recommendation: concierge.)
2. **Trial length?** (Suggested: 14 days, one role.)
3. **Company size** — add it to the form, or is hiring volume enough?
4. **Data retention promise** — what do we tell a pilot about their candidates' CVs?
   Needed before any real CV is uploaded. PDPA-relevant.
5. **Non-converting pilots** — what happens to their workspace and data?

---

## 7. Language rules (apply to every screen and email in this flow)

Per `docs/SAFETY_AND_COMPLIANCE_RULES.md` and `docs/UX_COPY_RULES.md`, never use:
"best candidate", "AI selected", "AI rejected", "auto reject", "bias-free",
"perfect match", "cultural fit", "candidate score".

Use: "evidence report ready", "human review required", "missing evidence",
"needs verification", "job-related evidence", "decision reason required".

Keep on every report and demo screen: *"AI-assisted analysis. Human review is
required before making any hiring decision."*

---

## 8. The honest summary

The front half of this journey — demo, request, approve, invite, set password —
is **built and working live**.

The back half — provisioned workspace, own job, own candidates, trial, conversion —
is **not built**, and the seam between them currently fails.

That is fine, and it does not block selling, **as long as the first pilots are run
concierge**. What would not be fine is inviting a real recruiter to sign in today
and watching the product break in front of them.
