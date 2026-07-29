# Infrastructure Reference — Hiring Evidence System

**Purpose:** every account, link, and setting the product runs on, so no future
session (or the founder months from now) has to rediscover it.

**Last verified:** 29 Jul 2026.
**No secrets in this file.** Keys live in Vercel, Supabase, and `.env.local` only.

---

## 1. Renewals and money — check these first

| What | Provider | Cost | Renews | Auto-renew |
|---|---|---|---|---|
| `hiringevidence.com` | Namecheap | ~US$11.48/yr | **29 Jul 2027** | ✅ ON |
| Domain privacy | Namecheap | Free (for life) | with domain | ✅ ON |
| Vercel hosting | Vercel | Free tier | — | — |
| Supabase | Supabase | Free tier | — | — |
| OpenRouter (AI) | OpenRouter | **pay per use** | — | see §5 |

**The one that can cost real money is OpenRouter.** Everything else is free-tier or
a fixed ~US$11/year.

**Namecheap login username:** `sachidk`.
**Do NOT buy PremiumDNS** — it was deliberately declined. Namecheap's free BasicDNS
is all this setup needs.

### If the domain is about to expire
Auto-renew is on, so it should renew itself on **29 Jul 2027**. It renews using the
card on file at Namecheap — if that card expires, the renewal silently fails. Check
the card is valid each July.

Losing the domain means losing the website address **and** any email sent from it.

---

## 2. Domain and DNS

- **Domain:** `hiringevidence.com` — bought 29 Jul 2026 at Namecheap
- **Nameservers:** Namecheap BasicDNS (`dns1/dns2.registrar-servers.com`) —
  **left on purpose**, do not switch to Vercel's nameservers. Keeping DNS at
  Namecheap makes it simpler to add email (MX) records later.

### Host records that must exist (Namecheap → Domain → Advanced DNS)

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `76.76.21.21` | Automatic |
| CNAME Record | `www` | `cname.vercel-dns.com` | Automatic |

`76.76.21.21` is Vercel's shared IP. If Vercel ever changes it, the site goes down
until this record is updated — Vercel's dashboard shows the current value under
Settings → Domains.

Namecheap's two default **parking** records (`CNAME www → parkingpage.namecheap.com`
and a `URL Redirect` on `@`) were deleted. If they ever reappear, delete them again —
they conflict with the records above.

A `TXT` SPF record under **Mail Settings** was left untouched.

### Checking DNS from a terminal
```
dig +short hiringevidence.com A          # expect 76.76.21.21
dig +short www.hiringevidence.com        # expect cname.vercel-dns.com
```
After a change, allow up to an hour before worrying.

---

## 3. Vercel (hosting)

- **Project:** `hiring-evidence-system`
- **Org/team:** `sajeewas-projects-b911d5d0`
- **CLI login:** `sajeedikovita-png`
- **GitHub repo:** `sajeedikovita-png/hiring-evidence-system`
- **Public URL:** https://hiring-evidence-system.vercel.app
- **Domains attached:** `hiringevidence.com`, `www.hiringevidence.com`

### ⚠️ The most important thing to know about deploys

**Pushing a branch does NOT update the public site.** A push creates a **Preview**
deployment only. Preview URLs are protected by Vercel login — useful for the founder
to test, useless for showing a prospect.

**Merging to `main` also does nothing** — production is not fed from `main`.

To update the public site, an existing deployment must be **promoted**:

```
vercel ls                                  # find the newest Preview
vercel promote <deployment-url> --yes      # make it public
```

Rolling back is the same command pointed at an older deployment. Vercel keeps them.

### Environment variables (set in the Vercel dashboard)
```
VITE_PUBLIC_SUPABASE_URL
VITE_PUBLIC_SUPABASE_ANON_KEY
```
These were already configured. The app also reads `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` and falls back to the `PUBLIC` pair
(`src/services/supabaseConfig.ts`).

---

## 4. Supabase (database, auth, functions)

- **Project ref:** `vzfurafvkoqwmfkzcwjj`
- **Admin / founder login:** `sajeedikovita@gmail.com` (role `admin`, created by
  `supabase/migrations/202607060001_admin_workspace.sql`, company "Northstar Digital")

> `supabase/bootstrap.sql` still contains the placeholder `myriadlooptech@gmail.com`.
> That account was never created. **`sajeedikovita@gmail.com` is the real one.**

### Password reset warning
Do **not** use "Forgot password" — the recovery email redirects to the deployed site
and has been unreliable. Set passwords directly in
**Supabase → Authentication → Users**.

### Key tables
- `access_requests` — every pilot request from the public form
- `companies`, `recruiter_profiles` — workspace ownership
- `candidates`, `applications`, evidence/report tables — real per-account data

### Edge functions
| Function | Does what |
|---|---|
| `analyze-resume` | Calls OpenRouter to read a CV. Works with the anon key, so the login-free demo gets real analysis. |
| `approve-request` | Admin-only. Marks a request approved and emails an invite (falls back to a recovery email). |
| `invite-user` | Sends an invite pointing at `/welcome`. |

Function secrets (set in Supabase, not in git): `OPENROUTER_API_KEY`,
`OPENROUTER_MODEL`.

---

## 5. OpenRouter (the AI, and the only real cost)

The demo needs no login, so **anyone with the public link can trigger paid AI calls.**

Protections in place:
- per-call limits in `supabase/functions/analyze-resume/index.ts`
  (`max_tokens` 1500, max 12 criteria)
- **a spending cap on the OpenRouter account** ← the main brake

**Not in place:** per-IP rate limiting. It needs a usage table and a migration, and
was deliberately deferred.

**If costs ever look wrong, the fastest kill switch is to lower or zero the
OpenRouter spending cap** — the demo then falls back to scripted reports rather than
breaking.

---

## 6. Git and branches

- **Working branch:** `codex/demo-test-lab` — this is where the real work lives and
  what Vercel builds from.
- `main` is **behind** and is not used for deploys.

---

## 7. Quick reference — links

| Thing | Link |
|---|---|
| Public site | https://hiring-evidence-system.vercel.app |
| Custom domain | https://hiringevidence.com |
| Admin / approve pilots | `/admin` (needs the founder login) |
| Demo entry for prospects | `/` → "View a sample report" |
| Namecheap DNS | Domain List → hiringevidence.com → Advanced DNS |
| GitHub | https://github.com/sajeedikovita-png/hiring-evidence-system |

---

## 8. Commands worth remembering

```bash
npm run dev          # local site at http://localhost:3000
npm run typecheck    # must be clean
npm test             # 4 suites, must pass
npm run build

vercel ls                                 # list deployments
vercel promote <url> --yes                # publish a deployment
vercel domains ls                         # domains on the account

dig +short hiringevidence.com A           # check DNS
```

---

## 9. Related documents

- `docs/plans/2026-07-27-pilot-user-lifecycle.md` — what happens after a pilot is
  approved, and the four places that journey currently breaks
- `docs/plans/2026-07-03-go-to-market-handoff.md` — pricing, market, outreach plan
- `docs/SALES_OUTREACH_KIT.md` — email templates
- `docs/FOUNDER_PLAYBOOK.md` — the pitch, objections, vocabulary
- `docs/SAFETY_AND_COMPLIANCE_RULES.md` — banned language (applies to marketing too)
