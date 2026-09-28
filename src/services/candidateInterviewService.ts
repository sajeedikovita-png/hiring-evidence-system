import { createHiringSupabaseClient } from "./supabaseClient";

export const CANDIDATE_INTERVIEW_VERIFICATION_STATES = ["not_checked", "candidate_explained", "supporting_evidence_added", "still_unresolved"] as const;
export type CandidateInterviewVerificationState = typeof CANDIDATE_INTERVIEW_VERIFICATION_STATES[number];
export const candidateInterviewVerificationLabels: Record<CandidateInterviewVerificationState, string> = {
  not_checked: "Not checked", candidate_explained: "Candidate explained", supporting_evidence_added: "Supporting evidence added", still_unresolved: "Still unresolved"
};
export type CandidateInterviewCriterion = { id: string; label: string; description: string; priority: "required" | "preferred" };
export type CandidateInterviewItem = {
  id: string; applicationId: string; criterionId: string | null; criterionSnapshot: CandidateInterviewCriterion;
  question: string; candidateAnswer: string; reviewerObservation: string; sourceReference: string; verificationState: CandidateInterviewVerificationState;
  authorProfileId: string | null; authorName: string; updatedByProfileId: string | null; updatedByName: string;
  version: number; createdAt: string; updatedAt: string;
};
export type CandidateInterviewWorkspace = {
  applicationId: string; canEdit: boolean; currentProfileId: string; plannedAt: string | null; planVersion: number;
  criteria: CandidateInterviewCriterion[]; items: CandidateInterviewItem[]; planEvents: CandidateInterviewPlanEvent[];
};
export type CandidateInterviewPlan = { applicationId: string; plannedAt: string | null; version: number; updatedAt: string | null };
export type CandidateInterviewPlanEvent = {
  id: string; applicationId: string; actorProfileId: string | null; actorName: string;
  previousState: CandidateInterviewPlan; state: CandidateInterviewPlan; createdAt: string;
};
export type CandidateInterviewItemEvent = {
  id: string; itemId: string; actorProfileId: string | null; actorName: string;
  previousState: CandidateInterviewItem | null; state: CandidateInterviewItem; createdAt: string;
};
export type CandidateInterviewItemFields = Pick<CandidateInterviewItem, "question" | "candidateAnswer" | "reviewerObservation" | "sourceReference" | "verificationState">;
export type CreateCandidateInterviewItemInput = CandidateInterviewItemFields & { applicationId: string; criterionId: string; requestId: string };
export type UpdateCandidateInterviewItemInput = CandidateInterviewItemFields & { itemId: string; expectedVersion: number };
export type UpdateCandidateInterviewPlanInput = { applicationId: string; plannedAt: string | null; expectedVersion: number };
export type CandidateInterviewRpcClient = { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }> };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = () => new Error("The interview response was invalid. Reload the interview and try again.");
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown, max = Infinity, required = false): string {
  if (typeof value !== "string" || value.length > max || value.includes("\u0000") || (required && !value.trim())) throw invalid();
  return value;
}
function id(value: unknown): string { const result = text(value); if (!uuid.test(result)) throw invalid(); return result; }
function nullableId(value: unknown): string | null { return value === null ? null : id(value); }
function version(value: unknown, minimum = 1): number { if (!Number.isSafeInteger(value) || Number(value) < minimum) throw invalid(); return Number(value); }
function timestamp(value: unknown): string {
  const result = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(result);
  if (!match || !Number.isFinite(Date.parse(result))) throw invalid();
  const [, year, month, day, hour, minute, second, zone] = match;
  const days = new Date(`${year}-${month}-01T00:00:00Z`); days.setUTCMonth(days.getUTCMonth() + 1); days.setUTCDate(0);
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > days.getUTCDate() || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || (zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) throw invalid();
  return result;
}
function nullableTimestamp(value: unknown): string | null { return value === null ? null : timestamp(value); }
function state(value: unknown): CandidateInterviewVerificationState {
  if (!CANDIDATE_INTERVIEW_VERIFICATION_STATES.includes(value as CandidateInterviewVerificationState)) throw invalid();
  return value as CandidateInterviewVerificationState;
}
function criterion(value: unknown): CandidateInterviewCriterion {
  const row = object(value);
  if (row.priority !== "required" && row.priority !== "preferred") throw invalid();
  return {id: id(row.id), label: text(row.label, Infinity, true), description: text(row.description), priority: row.priority};
}
function item(value: unknown): CandidateInterviewItem {
  const row = object(value);
  const result: CandidateInterviewItem = {
    id: id(row.id), applicationId: id(row.application_id), criterionId: nullableId(row.criterion_id), criterionSnapshot: criterion(row.criterion_snapshot),
    question: text(row.question, 2000, true), candidateAnswer: text(row.candidate_answer, 4000), reviewerObservation: text(row.reviewer_observation, 4000), sourceReference: text(row.source_reference, 2000), verificationState: state(row.verification_state),
    authorProfileId: nullableId(row.author_profile_id), authorName: text(row.author_name, Infinity, true), updatedByProfileId: nullableId(row.updated_by_profile_id), updatedByName: text(row.updated_by_name, Infinity, true),
    version: version(row.version), createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at)
  };
  if ((result.criterionId && result.criterionId !== result.criterionSnapshot.id) || (result.verificationState === "candidate_explained" && !result.candidateAnswer.trim()) || (result.verificationState === "supporting_evidence_added" && !result.sourceReference.trim())) throw invalid();
  return result;
}
function plan(value: unknown): CandidateInterviewPlan {
  const row = object(value);
  return {applicationId: id(row.application_id), plannedAt: nullableTimestamp(row.planned_at), version: version(row.version, 0), updatedAt: nullableTimestamp(row.updated_at)};
}
function planEvent(value: unknown): CandidateInterviewPlanEvent {
  const row = object(value);
  const result = {id: id(row.id), applicationId: id(row.application_id), actorProfileId: nullableId(row.actor_profile_id), actorName: text(row.actor_name, Infinity, true), previousState: plan(row.previous_state), state: plan(row.state), createdAt: timestamp(row.created_at)};
  if (result.previousState.applicationId !== result.applicationId || result.state.applicationId !== result.applicationId) throw invalid();
  return result;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw invalid(); return value; }
const errors: Record<string, string> = {
  INTERVIEW_QUESTION_INVALID: "Enter a job-related question of 1 to 2,000 characters.",
  INTERVIEW_TEXT_TOO_LONG: "Keep answers and observations to 4,000 characters, and source references to 2,000 characters.",
  INTERVIEW_VERIFICATION_INVALID: "Choose a valid verification state.",
  INTERVIEW_ANSWER_REQUIRED: "Record the candidate’s answer before choosing Candidate explained.",
  INTERVIEW_SOURCE_REQUIRED: "Record a source or reference before choosing Supporting evidence added.",
  INTERVIEW_CRITERION_UNAVAILABLE: "This role criterion is unavailable. Reload the interview and choose a current criterion.",
  INTERVIEW_REQUEST_ID_REQUIRED: "The request reference is missing. Reload the interview and try again.",
  INTERVIEW_REQUEST_CONFLICT: "This request reference was already used. Reload the interview before trying again.",
  INTERVIEW_VERSION_CONFLICT: "Another reviewer changed this interview record. Reload it before saving your changes.",
  INTERVIEW_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow interview changes. Check your access or ask your company administrator.",
  INTERVIEW_ITEM_UNAVAILABLE: "This interview record is unavailable in your company.",
  INTERVIEW_DATE_INVALID: "Choose a valid interview date and time with a timezone.",
  APPLICATION_UNAVAILABLE: "This candidate application is unavailable in your company."
};
async function rpc(client: CandidateInterviewRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) { const key = Object.keys(errors).find((code) => (result.error?.message ?? "").includes(code)); throw new Error(key ? errors[key] : "The interview could not be loaded or saved. Check your connection and try again."); }
  return result.data;
}
function inputId(value: string): void { if (typeof value !== "string" || !uuid.test(value)) throw new Error("The interview reference is invalid. Reload the interview and try again."); }
function expectedVersion(value: number, minimum = 1): void { if (!Number.isSafeInteger(value) || value < minimum) throw new Error("Reload the interview before saving your changes."); }
function inputFields(input: CandidateInterviewItemFields): Record<string, unknown> {
  if (typeof input.question !== "string" || !input.question.trim() || input.question.trim().length > 2000) throw new Error(errors.INTERVIEW_QUESTION_INVALID);
  if ([input.question, input.candidateAnswer, input.reviewerObservation, input.sourceReference].some((value) => typeof value !== "string" || value.includes("\u0000")) || input.candidateAnswer.trim().length > 4000 || input.reviewerObservation.trim().length > 4000 || input.sourceReference.trim().length > 2000) throw new Error(errors.INTERVIEW_TEXT_TOO_LONG);
  if (!CANDIDATE_INTERVIEW_VERIFICATION_STATES.includes(input.verificationState)) throw new Error(errors.INTERVIEW_VERIFICATION_INVALID);
  if (input.verificationState === "candidate_explained" && !input.candidateAnswer.trim()) throw new Error(errors.INTERVIEW_ANSWER_REQUIRED);
  if (input.verificationState === "supporting_evidence_added" && !input.sourceReference.trim()) throw new Error(errors.INTERVIEW_SOURCE_REQUIRED);
  return {p_question: input.question.trim(), p_candidate_answer: input.candidateAnswer.trim(), p_reviewer_observation: input.reviewerObservation.trim(), p_source_reference: input.sourceReference.trim(), p_verification_state: input.verificationState};
}
export async function getCandidateInterviewWorkspace(applicationId: string, client: CandidateInterviewRpcClient = createHiringSupabaseClient()): Promise<CandidateInterviewWorkspace> {
  inputId(applicationId);
  const row = object(await rpc(client, "get_candidate_interview_workspace", {p_application_id: applicationId}));
  if (typeof row.can_edit !== "boolean") throw invalid();
  const result = {applicationId: id(row.application_id), canEdit: row.can_edit, currentProfileId: id(row.current_profile_id), plannedAt: nullableTimestamp(row.planned_at), planVersion: version(row.plan_version, 0), criteria: array(row.criteria).map(criterion), items: array(row.items).map(item), planEvents: array(row.plan_events).map(planEvent)};
  if (result.applicationId !== applicationId || result.items.some((entry) => entry.applicationId !== applicationId) || result.planEvents.some((entry) => entry.applicationId !== applicationId)) throw invalid();
  return result;
}
export async function createCandidateInterviewItem(input: CreateCandidateInterviewItemInput, client: CandidateInterviewRpcClient = createHiringSupabaseClient()): Promise<CandidateInterviewItem> {
  inputId(input.applicationId); inputId(input.criterionId); inputId(input.requestId);
  const result = item(await rpc(client, "create_candidate_interview_item", {...inputFields(input), p_application_id: input.applicationId, p_criterion_id: input.criterionId, p_request_id: input.requestId}));
  if (result.applicationId !== input.applicationId || result.criterionSnapshot.id !== input.criterionId) throw invalid();
  return result;
}
export async function updateCandidateInterviewItem(input: UpdateCandidateInterviewItemInput, client: CandidateInterviewRpcClient = createHiringSupabaseClient()): Promise<CandidateInterviewItem> {
  inputId(input.itemId); expectedVersion(input.expectedVersion);
  const result = item(await rpc(client, "update_candidate_interview_item", {...inputFields(input), p_item_id: input.itemId, p_expected_version: input.expectedVersion}));
  if (result.id !== input.itemId) throw invalid();
  return result;
}
export async function updateCandidateInterviewPlan(input: UpdateCandidateInterviewPlanInput, client: CandidateInterviewRpcClient = createHiringSupabaseClient()): Promise<CandidateInterviewPlan> {
  inputId(input.applicationId); expectedVersion(input.expectedVersion, 0);
  let plannedAt: string | null;
  try { plannedAt = input.plannedAt === null ? null : new Date(timestamp(input.plannedAt)).toISOString(); } catch { throw new Error(errors.INTERVIEW_DATE_INVALID); }
  const row = object(await rpc(client, "update_candidate_interview_plan", {p_application_id: input.applicationId, p_planned_at: plannedAt, p_expected_version: input.expectedVersion}));
  const result = plan(row);
  if (result.applicationId !== input.applicationId) throw invalid();
  return result;
}
export async function listCandidateInterviewItemEvents(itemId: string, client: CandidateInterviewRpcClient = createHiringSupabaseClient()): Promise<CandidateInterviewItemEvent[]> {
  inputId(itemId);
  return array(await rpc(client, "list_candidate_interview_item_events", {p_item_id: itemId})).map((value) => {
    const row = object(value);
    const result = {id: id(row.id), itemId: id(row.item_id), actorProfileId: nullableId(row.actor_profile_id), actorName: text(row.actor_name, Infinity, true), previousState: row.previous_state === null ? null : item(row.previous_state), state: item(row.state), createdAt: timestamp(row.created_at)};
    if (result.itemId !== itemId || result.state.id !== itemId || (result.previousState && (result.previousState.id !== itemId || result.previousState.applicationId !== result.state.applicationId || result.previousState.criterionSnapshot.id !== result.state.criterionSnapshot.id))) throw invalid();
    return result;
  });
}
