import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { App } from "../src/App";
import { getPublicSyntheticSampleReport } from "../src/services/hiringRepository";
import { createWorkspaceAccessGeneration, requireWorkspaceAccess, resolveWorkspaceAccess } from "../src/services/workspaceAccessService";

const configuredEnv = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "example-anon-key"
};

function clientFor(
  user: { id: string; email?: string } | null,
  profile: Record<string, unknown> | Record<string, unknown>[] | null
) {
  const query = {
    select: () => query,
    eq: () => query,
    async then<TResult1 = { data: Record<string, unknown>[]; error: null }>(
      onfulfilled?: ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null
    ) {
      const result = { data: profile ? (Array.isArray(profile) ? profile : [profile]) : [], error: null };
      return onfulfilled ? onfulfilled(result) : result as never;
    }
  };

  return {
    auth: {
      async getUser() {
        return { data: { user }, error: null };
      }
    },
    from() {
      return query;
    }
  } as never;
}

const validProfile = {
  id: "profile-1",
  company_id: "company-1",
  user_id: "user-1",
  display_name: "Recruiter One",
  role: "recruiter",
  status: "active",
  companies: { name: "Example Company", status: "active" }
};

async function run() {
const generations = createWorkspaceAccessGeneration();
const userAGeneration = generations.start();
let restoredUser = "";
let resolveUserA: ((value: string) => void) | undefined;
let resolveUserB: ((value: string) => void) | undefined;
const userA = new Promise<string>((resolve) => {
  resolveUserA = resolve;
}).then((name) => {
  if (generations.isCurrent(userAGeneration)) restoredUser = name;
});
generations.invalidate();
const userBGeneration = generations.start();
const userB = new Promise<string>((resolve) => {
  resolveUserB = resolve;
}).then((name) => {
  if (generations.isCurrent(userBGeneration)) restoredUser = name;
});
resolveUserA?.("User A");
await userA;
assert.equal(restoredUser, "");
resolveUserB?.("User B");
await userB;
assert.equal(restoredUser, "User B");
assert.equal(generations.isCurrent(userAGeneration), false);
assert.equal(generations.isCurrent(userBGeneration), true);

await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, validProfile), {}),
  (error: unknown) => (error as { reason?: string }).reason === "configuration_missing"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor(null, validProfile), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "authentication_required"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, null), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "profile_missing"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, { ...validProfile, status: "paused" }), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "profile_missing"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, [validProfile, { ...validProfile, id: "profile-2", company_id: "company-2" }]), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "profile_missing"
);
await assert.rejects(
  () =>
    resolveWorkspaceAccess(
      clientFor({ id: "user-1" }, { ...validProfile, companies: { name: "Example Company", status: "archived" } }),
      configuredEnv
    ),
  (error: unknown) => (error as { reason?: string }).reason === "company_inactive"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, { ...validProfile, user_id: "another-user" }), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "company_inactive"
);
await assert.rejects(
  () => resolveWorkspaceAccess(clientFor({ id: "user-1" }, { ...validProfile, role: "observer" }), configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "role_invalid"
);
await assert.rejects(
  () => requireWorkspaceAccess(clientFor({ id: "user-1" }, validProfile), "company-1", configuredEnv, true),
  (error: unknown) => (error as { reason?: string }).reason === "role_invalid"
);
await assert.rejects(
  () => requireWorkspaceAccess(clientFor({ id: "user-1" }, validProfile), "company-other", configuredEnv),
  (error: unknown) => (error as { reason?: string }).reason === "company_inactive"
);

const access = await requireWorkspaceAccess(clientFor({ id: "user-1", email: "one@example.test" }, validProfile), "company-1", configuredEnv);
assert.deepEqual(access, {
  companyId: "company-1",
  companyName: "Example Company",
  userId: "user-1",
  userName: "Recruiter One",
  role: "recruiter"
});

const dashboardHtml = renderToStaticMarkup(<App path="/dashboard" />);
const arbitraryReportHtml = renderToStaticMarkup(<App path="/reports/HER-2026-0521-AL" />);
const publicSampleHtml = renderToStaticMarkup(<App path="/reports/candidate-evidence" />);

assert.match(dashboardHtml, /Workspace access required/);
assert.doesNotMatch(dashboardHtml, /Amanda Lee/);
assert.match(arbitraryReportHtml, /Workspace access required/);
assert.doesNotMatch(arbitraryReportHtml, /Amanda Lee/);
assert.match(publicSampleHtml, /Synthetic sample/);
assert.match(publicSampleHtml, /Amanda Lee/);
assert.match(publicSampleHtml, /Decision saving is unavailable/);
assert.match(publicSampleHtml, /This synthetic sample is read-only/);
assert.match(publicSampleHtml, /<fieldset[^>]*disabled/);
assert.match(publicSampleHtml, /<textarea[^>]*disabled/);
assert.match(publicSampleHtml, /<button[^>]*disabled[^>]*>Save decision<\/button>/);
assert.doesNotMatch(publicSampleHtml, /Seed fallback mode|Supabase connected mode|Missing env vars/);
assert.equal(getPublicSyntheticSampleReport()?.candidate.name, "Amanda Lee");

console.log("Workspace access tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
