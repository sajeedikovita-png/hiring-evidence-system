import { createHiringSupabaseClient } from "./supabaseClient";

export type CandidateNameEvent = { id: string; actorName: string; previousName: string; recordedName: string; reason: string; version: number; createdAt: string };
export type CandidateIdentityWorkspace = { candidateId: string; applicationId: string; recordedName: string; version: number; confirmedAt: string | null; canEdit: boolean; events: CandidateNameEvent[] };
export type CandidateIdentityRpcClient = { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = () => new Error("The candidate identity response was invalid. Reload the report and try again.");
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown, max = Infinity): string { if (typeof value !== "string" || value.length > max || value.includes("\u0000")) throw invalid(); return value; }
function id(value: unknown): string { const result = text(value); if (!uuid.test(result)) throw invalid(); return result; }
function version(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) < 0) throw invalid(); return Number(value); }
function timestamp(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw invalid(); return result; }
const errors: Record<string, string> = {
  APPLICATION_UNAVAILABLE: "This candidate application is unavailable in your company.",
  CANDIDATE_UNAVAILABLE: "This candidate record is unavailable in your company.",
  CANDIDATE_IDENTITY_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow candidate-name changes.",
  CANDIDATE_NAME_INVALID: "Enter a candidate name between 2 and 200 characters.",
  CANDIDATE_NAME_REASON_REQUIRED: "Enter a job-related reason of at least 10 characters.",
  CANDIDATE_NAME_VERSION_CONFLICT: "Another reviewer changed this candidate name. Reload the report before saving."
};
async function rpc(client: CandidateIdentityRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> { const result = await client.rpc(name, args); if (result.error) { const key = Object.keys(errors).find((code) => (result.error?.message ?? "").includes(code)); throw new Error(key ? errors[key] : "Candidate identity could not be loaded or saved. Check your connection and try again."); } return result.data; }
function validateId(value: string): void { if (!uuid.test(value)) throw new Error("The candidate application reference is invalid."); }
function parseSaved(value: unknown) { const row = object(value); return { candidateId: id(row.candidate_id), applicationId: id(row.application_id), recordedName: text(row.recorded_name, 200), version: version(row.version), confirmedAt: timestamp(row.confirmed_at) }; }
export async function loadCandidateIdentity(applicationId: string, client: CandidateIdentityRpcClient = createHiringSupabaseClient()): Promise<CandidateIdentityWorkspace> {
  validateId(applicationId); const row = object(await rpc(client, "get_candidate_identity", { p_application_id: applicationId }));
  if (typeof row.can_edit !== "boolean" || !Array.isArray(row.events)) throw invalid();
  const result: CandidateIdentityWorkspace = { candidateId: id(row.candidate_id), applicationId: id(row.application_id), recordedName: text(row.recorded_name, 200), version: version(row.version), confirmedAt: row.confirmed_at === null ? null : timestamp(row.confirmed_at), canEdit: row.can_edit, events: row.events.map((value) => { const event = object(value); const eventVersion = version(event.version); if (eventVersion < 1) throw invalid(); return { id: id(event.id), actorName: text(event.actor_name, 500), previousName: text(event.previous_name, 200), recordedName: text(event.recorded_name, 200), reason: text(event.reason, 1000), version: eventVersion, createdAt: timestamp(event.created_at) }; }) };
  if (result.applicationId !== applicationId) throw invalid(); return result;
}
export async function recordCandidateIdentity(input: { applicationId: string; recordedName: string; reason: string; expectedVersion: number }, client: CandidateIdentityRpcClient = createHiringSupabaseClient()) {
  validateId(input.applicationId); const recordedName = input.recordedName.trim(), reason = input.reason.trim();
  if (recordedName.length < 2 || recordedName.length > 200 || /[\u0000-\u001f\u007f]/.test(recordedName)) throw new Error(errors.CANDIDATE_NAME_INVALID);
  if (reason.length < 10 || reason.length > 1000 || /[\u0000-\u001f\u007f]/.test(reason)) throw new Error(errors.CANDIDATE_NAME_REASON_REQUIRED);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error(errors.CANDIDATE_NAME_VERSION_CONFLICT);
  const saved = parseSaved(await rpc(client, "record_candidate_identity", { p_application_id: input.applicationId, p_recorded_name: recordedName, p_reason: reason, p_expected_version: input.expectedVersion }));
  if (saved.applicationId !== input.applicationId) throw invalid(); return saved;
}
