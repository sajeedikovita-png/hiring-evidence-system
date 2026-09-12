import assert from "node:assert/strict";
import { buildSafeDiagnosticsPreview, createSupportRepository, getPageHelp, validateSupportIssue } from "../src/services/supportService";

const diagnostics = buildSafeDiagnosticsPreview({ pathname: "/jobs/123?token=secret", pageTitle: "Jobs", repositorySource: "supabase", workspaceRole: "admin" });
assert.deepEqual(diagnostics, { page: "/jobs/123", pageTitle: "Jobs", repositorySource: "supabase", workspaceRole: "admin" });
assert.equal(JSON.stringify(diagnostics).includes("secret"), false);
assert.equal(getPageHelp("privacy").tips[0].includes("request"), true);
assert.equal(validateSupportIssue({ summary: "", details: "x", type: "problem", severity: "low", affectedPage: "/jobs" }), "Add a short summary.");

const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
const repository = createSupportRepository({
  rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === "create_support_conversation") return { data: { conversation_id: "conversation-1", message_id: "message-1" }, error: null };
    if (name === "list_support_inbox") return { data: [{ issue_id: "issue-1", company_name: "Example Co", category: "bug", severity: "high", title: "Slow page", description: "Jobs did not load", affected_page: "/jobs", triage_status: "draft", review_status: "open", developer_recommendation: "Inspect the job list request and add a regression test.", approval_status: "not_requested", created_at: "2026-09-11T00:00:00Z" }], error: null };
    return { data: {}, error: null };
  },
  functions: {
    invoke: async (name, options) => {
      calls.push({ name, args: options.body });
      if (name === "submit-support-issue") return { data: { issueId: "issue-1", notificationStatus: "sent" }, error: null };
      return { data: { status: "completed", message: "Use one observable job requirement at a time.", presentation: { steps: [{ title: "Add a requirement", detail: "Enter one job-related requirement." }], action: { label: "Open Jobs", href: "/jobs" } } }, error: null };
    }
  }
});

async function run() {
  const issue = await repository.createIssue({ summary: "Slow page", details: "Jobs did not load", type: "problem", severity: "high", affectedPage: "/jobs" });
  assert.equal(issue.issueId, "issue-1");
  assert.equal(calls[0]?.name, "submit-support-issue");
  assert.deepEqual(calls[0]?.args, { type: "problem", severity: "high", title: "Slow page", description: "Jobs did not load", diagnostics: { affected_page: "/jobs" } });

  const answer = await repository.askQuestion({ message: "What is a requirement?", pageTitle: "Jobs" });
  assert.equal(answer.conversationId, "conversation-1");
  assert.equal(answer.answer, "Use one observable job requirement at a time.");
  assert.equal(answer.presentation?.steps?.[0]?.title, "Add a requirement");
  assert.deepEqual(answer.presentation?.action, { label: "Open Jobs", href: "/jobs" });
  assert.equal(calls[1]?.name, "create_support_conversation");
  assert.equal(calls[1]?.args?.p_message, "Current page: Jobs\nCustomer question: What is a requirement?");
  assert.equal(calls[2]?.name, "support-assistant");

  const inbox = await repository.listInbox();
  assert.equal(inbox[0]?.companyName, "Example Co");
  assert.equal(inbox[0]?.triageStatus, "draft");
  assert.equal(inbox[0]?.aiRecommendation, "Inspect the job list request and add a regression test.");

  await assert.rejects(() => repository.closeIssue("issue-1", ""), /written review note/i);
  console.log("support-service tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
