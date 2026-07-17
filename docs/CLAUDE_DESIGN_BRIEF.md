# Claude Design brief — Hiring Evidence System

Paste the prompt below into Claude Design (open it from the palette icon in the
left sidebar of Claude.ai). Before prompting, point Claude Design at this
project folder so it reads the real codebase and design tokens, and optionally
give it the running dev URL (`npm run dev`) so it can match the live styling.

---

## Prompt to paste into Claude Design

Design a modern, bold SaaS marketing site and product screen for a B2B web app
called **Hiring Evidence System**. Output live HTML/CSS and React that fits a
React 19 + Vite project using plain CSS (no Tailwind).

**What the product does:** It turns a job description and a candidate's resume
into a clear evidence report — what the candidate has proven, what proof is
missing, and what to verify in the interview — so a recruiter makes a fair,
documented, human decision. It is NOT a black-box AI score and never selects,
rejects, or ranks candidates.

**Core hook (use as the hero):** "Make every hiring decision you can defend."

**Audience:** Recruitment agencies and SME hiring teams in Singapore.

**Visual direction:** Modern SaaS, bold and confident. Big expressive
typography, a strong hero, confident color blocks, generous whitespace, crisp
product UI mockups embedded in the page. Should look like a funded startup, not
a template. Calm and trustworthy, never flashy-AI (no robot icons, sparkles,
neon, or heavy gradients).

**Brand palette (keep these):**
- Primary deep teal: #15333c
- Warm off-white background: #f8f7f2
- Strong text: #0b1c30  / muted text: #667085
- Success: #3f7d58 · Warning: #b7791f · Danger: #b42318
- Soft teal accent: #c9e8f3 · Border: #d7dedf
- Font: Inter

**Screens to design:**

1. **Landing page**, with these sections:
   - Hero: headline "Make every hiring decision you can defend." + subhead about
     turning a job + resume into an evidence report, not a black-box score.
     Primary CTA "Request pilot access", secondary "View a sample report".
   - Problem: the enemy is black-box AI scoring you can't explain (three points:
     can't explain the score, rejected people ask for reasons, fair-hiring +
     PDPA rules apply).
   - Three proof pillars: "Defensible by default", "Fairness-aware review",
     "Evidence, not a verdict".
   - How it works: 4 steps (set job criteria, collect candidate evidence,
     review proof and fairness, record the human decision).
   - A realistic product mockup of the evidence report as proof.
   - Compliance band (built for Singapore hiring: consent, fair-hiring language
     checks, human reason required, exportable audit trail).
   - Final CTA: "Start with one role."

2. **Candidate Evidence Report** (the core product screen):
   - Left nav sidebar (deep teal), candidate header, summary metric tiles,
     an evidence matrix table (requirement / evidence / source / confidence /
     status), missing-evidence and suggested-interview-questions panels,
     a fairness-check panel, and a human-decision panel that requires a written
     reason. Include a small persistent note: "AI-assisted analysis. Human
     review required before any hiring decision."

**Word choices to AVOID anywhere** (compliance rules): "best candidate",
"AI selected", "AI rejected", "AI decides", "auto reject", "bias-free",
"guaranteed fair", "perfect match". Prefer: "evidence found", "needs
verification", "evidence missing", "human review required", "decision reason
required".

Generate the landing first, then the report screen, using the same design
system so they feel like one product.
