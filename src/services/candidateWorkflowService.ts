import { createHiringSupabaseClient } from "./supabaseClient";

export const CANDIDATE_WORKFLOW_STAGES = ["new", "evidence_review", "interview", "client_review", "closed"] as const;
export type CandidateWorkflowStage = typeof CANDIDATE_WORKFLOW_STAGES[number];
export const candidateWorkflowStageLabels: Record<CandidateWorkflowStage, string> = {
  new: "New", evidence_review: "Evidence review", interview: "Interview", client_review: "Client review", closed: "Closed"
};
export type CandidateWorkflow = {
  applicationId: string; stage: CandidateWorkflowStage; assignedProfileId: string | null;
  nextAction: string; dueAt: string | null; version: number; updatedAt: string | null;
};
export type CandidateWorkflowReviewer = { id: string; name: string; isActive: boolean };
export type CandidateWorkflowList = {
  workflows: CandidateWorkflow[]; reviewers: CandidateWorkflowReviewer[]; currentProfileId: string; canEdit: boolean;
  stageLabels: Record<CandidateWorkflowStage, string>;
  stageOrder: CandidateWorkflowStage[];
};
export type CandidateWorkflowEvent = {
  id: string; actorProfileId: string | null; actorName: string; previousState: CandidateWorkflow | null;
  state: CandidateWorkflow; createdAt: string;
};
export type SaveCandidateWorkflowInput = Omit<CandidateWorkflow, "version" | "updatedAt"> & { expectedVersion: number };
export type CandidateWorkflowRpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};
const invalid = () => new Error("Workflow response was invalid. Reload the page and try again.");
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== "string") throw invalid(); return value; }
function identifier(value: unknown): string { const result = text(value); if (!result.trim()) throw invalid(); return result; }
function nullableIdentifier(value: unknown): string | null { return value === null ? null : identifier(value); }
function timestamp(value: unknown): string {
  const result = text(value);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) throw invalid();
  return result;
}
function nullableTimestamp(value: unknown): string | null { return value === null ? null : timestamp(value); }
function stage(value: unknown): CandidateWorkflowStage {
  if (!CANDIDATE_WORKFLOW_STAGES.includes(value as CandidateWorkflowStage)) throw invalid();
  return value as CandidateWorkflowStage;
}
function workflow(value: unknown): CandidateWorkflow {
  const row = object(value);
  if (!Number.isSafeInteger(row.version) || Number(row.version) < 0) throw invalid();
  return { applicationId: identifier(row.application_id), stage: stage(row.stage), assignedProfileId: nullableIdentifier(row.assigned_profile_id),
    nextAction: text(row.next_action), dueAt: nullableTimestamp(row.due_at), version: Number(row.version), updatedAt: nullableTimestamp(row.updated_at) };
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw invalid(); return value; }
const errors: Record<string, string> = {
  WORKFLOW_VERSION_CONFLICT: "Another reviewer changed this workflow. Reload it before saving your changes.",
  WORKFLOW_STAGE_INVALID: "Choose a valid workflow stage.",
  WORKFLOW_NEXT_ACTION_TOO_LONG: "Keep the next action to 500 characters or fewer.",
  WORKFLOW_DUE_AT_INVALID: "Choose a valid due date and time.",
  WORKFLOW_ASSIGNEE_INVALID: "This reviewer is no longer active in your company. Choose an active reviewer or leave it unassigned.",
  APPLICATION_UNAVAILABLE: "This candidate application is unavailable in your company.",
  WORKFLOW_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow changes. Check your access or ask your company administrator."
};
async function rpc(client: CandidateWorkflowRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) {
    const message = result.error.message ?? "";
    const known = Object.keys(errors).find((code) => message.includes(code));
    throw new Error(known ? errors[known] : "The workflow could not be loaded or saved. Check your connection and try again.");
  }
  return result.data;
}
export async function listCandidateWorkflows(jobId: string, client: CandidateWorkflowRpcClient = createHiringSupabaseClient()): Promise<CandidateWorkflowList> {
  const data = object(await rpc(client, "list_candidate_workflows", { p_job_id: jobId }));
  if (typeof data.can_edit !== "boolean") throw invalid();
  const configuredLabels = data.stage_labels === undefined ? [] : array(data.stage_labels);
  const stageLabels = { ...candidateWorkflowStageLabels };
  for (const value of configuredLabels) {
    const row = object(value); const key = stage(row.key); const label = text(row.label).trim();
    if (!label || label.length > 40) throw invalid();
    stageLabels[key] = label;
  }
  const stageOrder = configuredLabels.length ? configuredLabels.map((value) => stage(object(value).key)) : [...CANDIDATE_WORKFLOW_STAGES];
  if (stageOrder.length !== CANDIDATE_WORKFLOW_STAGES.length || new Set(stageOrder).size !== CANDIDATE_WORKFLOW_STAGES.length) throw invalid();
  return { workflows: array(data.workflows).map(workflow), reviewers: array(data.reviewers).map((value) => {
    const row = object(value);
    if (typeof row.is_active !== "boolean") throw invalid();
    return { id: identifier(row.id), name: text(row.full_name), isActive: row.is_active };
  }), currentProfileId: identifier(data.current_profile_id), canEdit: data.can_edit, stageLabels, stageOrder };
}
export async function saveCandidateWorkflow(input: SaveCandidateWorkflowInput, client: CandidateWorkflowRpcClient = createHiringSupabaseClient()): Promise<CandidateWorkflow> {
  if (!CANDIDATE_WORKFLOW_STAGES.includes(input.stage)) throw new Error(errors.WORKFLOW_STAGE_INVALID);
  const nextAction = input.nextAction.trim();
  if (nextAction.length > 500) throw new Error(errors.WORKFLOW_NEXT_ACTION_TOO_LONG);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error("Reload this workflow before saving.");
  if (input.dueAt && (!/(Z|[+-]\d{2}:\d{2})$/.test(input.dueAt) || !Number.isFinite(Date.parse(input.dueAt)))) {
    throw new Error("Choose a valid due date and time with a timezone.");
  }
  return workflow(await rpc(client, "update_candidate_workflow", {
    p_application_id: input.applicationId, p_stage: input.stage, p_assigned_profile_id: input.assignedProfileId,
    p_next_action: nextAction, p_due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null, p_expected_version: input.expectedVersion
  }));
}
export async function listCandidateWorkflowEvents(applicationId: string, client: CandidateWorkflowRpcClient = createHiringSupabaseClient()): Promise<CandidateWorkflowEvent[]> {
  return array(await rpc(client, "list_candidate_workflow_events", { p_application_id: applicationId })).map((value) => {
    const row = object(value);
    return { id: identifier(row.id), actorProfileId: nullableIdentifier(row.actor_profile_id), actorName: text(row.actor_name),
      previousState: row.previous_state === null ? null : workflow(row.previous_state), state: workflow(row.state), createdAt: timestamp(row.created_at) };
  });
}
