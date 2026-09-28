import assert from "node:assert/strict";
import { listCandidateWorkflows, saveCandidateWorkflow, listCandidateWorkflowEvents, type CandidateWorkflowRpcClient } from "../src/services/candidateWorkflowService";

async function main() {
  const original = { application_id: "application-1", stage: "new", assigned_profile_id: null, next_action: "", due_at: null, version: 0, updated_at: null };
  const saved = { ...original, stage: "interview", assigned_profile_id: "reviewer-1", next_action: "Arrange interview", due_at: "2026-10-01T02:00:00.000Z", version: 1, updated_at: "2026-09-19T00:00:00Z" };
  const calls: Array<{name: string; args?: Record<string, unknown>}> = [];
  const client: CandidateWorkflowRpcClient = { rpc: async (name, args) => {
    calls.push({ name, args });
    return { error: null, data: name === "list_candidate_workflows" ? {
      workflows: [original], reviewers: [{id: "reviewer-1", full_name: "Active reviewer", is_active: true}, {id: "old-reviewer", full_name: "Former reviewer", is_active: false}], current_profile_id: "reviewer-1", can_edit: true,
      stage_labels: [{key:"new",label:"Received"},{key:"evidence_review",label:"Evidence check"},{key:"interview",label:"Conversation"},{key:"client_review",label:"Client review"},{key:"closed",label:"Closed"}]
    } : name === "update_candidate_workflow" ? saved : [{ id: "event-1", actor_profile_id: "reviewer-1", actor_name: "Active reviewer", previous_state: original, state: saved, created_at: saved.updated_at }] };
  } };
  const list = await listCandidateWorkflows("job-1", client);
  assert.equal(list.workflows[0].version, 0);
  assert.equal(list.workflows[0].stage, "new");
  assert.equal(list.reviewers[1].isActive, false, "Disabled assignees remain visible for reassignment");
  assert.equal(list.canEdit, true);
  assert.equal(list.stageLabels.interview, "Conversation");
  assert.deepEqual(calls[0], {name: "list_candidate_workflows", args: {p_job_id: "job-1"}});
  const input = {applicationId: "application-1", stage: "interview" as const, assignedProfileId: "reviewer-1", nextAction: " Arrange interview ", dueAt: "2026-10-01T10:00:00+08:00", expectedVersion: 0};
  assert.equal((await saveCandidateWorkflow(input, client)).version, 1);
  assert.deepEqual(calls[1].args, {p_application_id: "application-1", p_stage: "interview", p_assigned_profile_id: "reviewer-1", p_next_action: "Arrange interview", p_due_at: "2026-10-01T02:00:00.000Z", p_expected_version: 0});
  const events = await listCandidateWorkflowEvents("application-1", client);
  assert.equal(events[0].actorName, "Active reviewer");
  assert.equal(events[0].previousState?.version, 0);
  assert.equal(events[0].state.stage, "interview");
  const count = calls.length;
  await assert.rejects(() => saveCandidateWorkflow({...input, expectedVersion: -1}, client), /Reload/);
  await assert.rejects(() => saveCandidateWorkflow({...input, dueAt: "2026-10-01T10:00"}, client), /timezone/);
  await assert.rejects(() => saveCandidateWorkflow({...input, nextAction: "x".repeat(501)}, client), /500/);
  assert.equal(calls.length, count, "Invalid inputs must not reach the server");
  for (const [code, message] of [["WORKFLOW_VERSION_CONFLICT", /Another reviewer/], ["WORKFLOW_ASSIGNEE_INVALID", /no longer active/], ["WORKFLOW_WRITE_ACCESS_REQUIRED", /does not currently allow/]] as const) {
    await assert.rejects(() => saveCandidateWorkflow(input, {rpc: async () => ({data: null, error: {message: code}})}), message);
  }
  await assert.rejects(() => listCandidateWorkflows("job-1", {rpc: async () => ({data: {workflows: [{...original, stage: "unknown"}], reviewers: [], current_profile_id: "r", can_edit: true}, error: null})}), /invalid/);
  for (const change of [{due_at: "not-a-date"}, {updated_at: "2026-09-19T10:00"}, {application_id: ""}, {assigned_profile_id: undefined}]) {
    await assert.rejects(() => listCandidateWorkflows("job-1", {rpc: async () => ({data: {workflows: [{...original, ...change}], reviewers: [], current_profile_id: "r", can_edit: true}, error: null})}), /invalid/);
  }
  const deletedActorEvents = await listCandidateWorkflowEvents("application-1", {rpc: async () => ({data: [{id: "e", actor_profile_id: null, actor_name: "Former reviewer", previous_state: null, state: saved, created_at: saved.updated_at}], error: null})});
  assert.equal(deletedActorEvents[0].actorProfileId, null);
  assert.equal(deletedActorEvents[0].actorName, "Former reviewer");
  console.log("Candidate workflow service tests passed.");
}
void main();
