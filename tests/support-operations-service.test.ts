import assert from "node:assert/strict";
import test from "node:test";
import { getSupportOperationsReport, mapSupportOperationsReport } from "../src/services/supportOperationsService";

test("maps the owner operations report with safe defaults", () => {
  const report = mapSupportOperationsReport({ generatedAt: "2026-09-12T00:00:00Z", counts: { openIssues: 2, agentActive: 1 }, issues: [{ issueId: "one", reference: "ABC12345", category: "bug", testResults: [{ name: "build", status: "passed" }] }], events: [] });
  assert.equal(report.counts.openIssues, 2);
  assert.equal(report.counts.notificationsPending, 0);
  assert.equal(report.issues[0].category, "bug");
  assert.equal(report.issues[0].testResults[0].name, "build");
});

test("loads the report through the administrator RPC", async () => {
  let called = "";
  const report = await getSupportOperationsReport({ rpc: async (name) => { called = name; return { data: { counts: {}, issues: [], events: [] }, error: null }; } });
  assert.equal(called, "get_support_operations_report");
  assert.equal(report.issues.length, 0);
});

test("does not hide operations RPC failures", async () => {
  await assert.rejects(() => getSupportOperationsReport({ rpc: async () => ({ data: null, error: { message: "PLATFORM_ADMIN_REQUIRED" } }) }), /PLATFORM_ADMIN_REQUIRED/);
});
