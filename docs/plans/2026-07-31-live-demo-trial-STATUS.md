# Live Demo Trial — Task Status Board

**Purpose:** one file that says exactly what is DONE and what is PENDING, so any new
session (or a new chat) can pick this up without re-reading the whole history.

**Keep this file updated.** Mark each task DONE or PENDING the moment it changes.

**Where the work lives:** git worktree `.worktrees/live-demo-trial`, branch
`feature/live-demo-trial`, branched from `codex/demo-test-lab` at `18b9496`.

**Status vocabulary** (from the plan — never blur these):
`local` = in the working tree · `committed` = in git · `backend deployed` = applied to
live Supabase · `production deployed` = promoted on Vercel · `end-to-end verified` =
proven with a real run.

---

## Task board

| # | Task | Status | Where |
|---|---|---|---|
| 1 | 14-day trial schema, activation RPC, split read/write RLS | **DONE** — committed + backend deployed | `supabase/migrations/202607310900_live_demo_trials.sql` |
| 2 | `approve-request` provisions company + profile + entitlement atomically | **DONE** — committed + backend deployed | `supabase/functions/approve-request/index.ts` |
| 3 | Dashboard activates the trial and shows the countdown banner | **DONE** — committed, **NOT production deployed** | `src/pages/DashboardPage.tsx`, `src/services/demoTrial*.ts` |
| 4 | Trial lifecycle test wired into `npm test` | **DONE** — committed | `package.json`, `tests/demo-trial-lifecycle.test.ts` |
| 5 | Separate platform authority from company admins | **DONE** — committed, **NOT backend deployed** | `supabase/migrations/202607310930_platform_admin_authority.sql` |
| 6 | Private CV storage + persistent candidate/report rows + quotas | **DONE** — committed, **NOT backend deployed** | `supabase/migrations/202607310940_pilot_candidate_storage.sql` |
| 7 | Client upload path that persists instead of using browser storage | **PENDING** | `src/services/pilotUploadService.ts` |
| 8 | Admin conversion path (mark a company as continuing) | **PENDING** | migration + `src/pages/AdminPage.tsx` |
| 9 | Scheduled purge of expired demo workspaces | **PENDING** | `supabase/functions/purge-expired-demos/` |
| 10 | Deploy backend (migrations + functions) to live Supabase | **PENDING** — needs founder | — |
| 11 | Promote the Vercel deployment to production | **PENDING** — needs founder | — |
| 12 | End-to-end live test with a fresh test company | **PENDING** — needs founder | — |

---

## Why task 5 mattered (read before deploying)

Task 2 gives every provisioned customer owner a company profile with
`role = 'admin'`. The old `is_current_user_admin()` returned true for **any** active
admin profile, which would have let a customer administrator list and approve other
companies' access requests. Task 5 re-points that helper at a `platform_admins` table
keyed to the founder's Auth UUID.

**Deploy task 5's migration before, or together with, opening the flow to a real
customer.** Backend tasks 5 and 6 are written but not yet applied to Supabase.

---

## What the founder has to do (nothing here is automated)

1. Apply migrations `202607310930` and `202607310940` (and `202607310950` once task 8
   lands) in the Supabase SQL editor, in filename order.
2. Redeploy the `approve-request` function and deploy `purge-expired-demos`.
3. Promote the Vercel deployment — pushing a branch only creates a preview.
   See `docs/INFRASTRUCTURE.md` §3.

---

## Verification gate

Every task ends with all four passing:

```bash
npm run typecheck && npm test && npm run build && npm audit --audit-level=high
```

---

## Related documents

- `docs/plans/2026-07-31-live-demo-trial-design.md` — the approved lifecycle
- `docs/plans/2026-07-31-live-demo-trial-handoff.md` — the original handoff this board replaces
- `docs/plans/2026-07-30-hiring-evidence-main-project-demo-access-plan.md` — the full 14-task plan
- `docs/INFRASTRUCTURE.md` — accounts, deploys, costs
