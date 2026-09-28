import { createHiringSupabaseClient } from "./supabaseClient";

export const CANDIDATE_SHARING_AUTHORITY_TYPES = ["candidate_confirmation", "documented_recruitment_process", "other_documented_authority"] as const;
export type CandidateSharingAuthorityType = typeof CANDIDATE_SHARING_AUTHORITY_TYPES[number];
export const candidateSharingAuthorityLabels: Record<CandidateSharingAuthorityType, string> = {
  candidate_confirmation: "Candidate confirmed sharing",
  documented_recruitment_process: "Documented recruitment process",
  other_documented_authority: "Other documented authority"
};
export type CandidateSharingAuthority = {
  id: string; applicationId: string; authorityType: CandidateSharingAuthorityType; sourceReference: string; note: string;
  recordedByName: string; version: number; recordedAt: string; revokedAt: string | null;
};
export type CandidateSharingAuthorityEvent = { id: string; actorName: string; action: "recorded" | "updated" | "revoked"; reason: string; createdAt: string };
export type CandidateSharingAuthorityWorkspace = { authority: CandidateSharingAuthority | null; events: CandidateSharingAuthorityEvent[]; canEdit: boolean };
export type SharingAuthorityRpcClient = { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }> };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = () => new Error("The sharing-authority response was invalid. Reload the report and try again.");
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown, max = Infinity): string { if (typeof value !== "string" || value.length > max || value.includes("\u0000")) throw invalid(); return value; }
function id(value: unknown): string { const result = text(value); if (!uuid.test(result)) throw invalid(); return result; }
function timestamp(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw invalid(); return result; }
function authorityType(value: unknown): CandidateSharingAuthorityType { if (!CANDIDATE_SHARING_AUTHORITY_TYPES.includes(value as CandidateSharingAuthorityType)) throw invalid(); return value as CandidateSharingAuthorityType; }
function authority(value: unknown): CandidateSharingAuthority {
  const row = object(value);
  if (!Number.isSafeInteger(row.version) || Number(row.version) < 1) throw invalid();
  return { id: id(row.id), applicationId: id(row.application_id), authorityType: authorityType(row.authority_type), sourceReference: text(row.source_reference, 1000), note: text(row.note, 2000), recordedByName: text(row.recorded_by_name, 500), version: Number(row.version), recordedAt: timestamp(row.recorded_at), revokedAt: row.revoked_at === null ? null : timestamp(row.revoked_at) };
}
const errors: Record<string, string> = {
  APPLICATION_UNAVAILABLE: "This candidate application is unavailable in your company.",
  SHARING_AUTHORITY_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow sharing-authority changes.",
  SHARING_AUTHORITY_INVALID: "Choose an authority type and enter a source or reference of at least 10 characters.",
  SHARING_AUTHORITY_VERSION_CONFLICT: "Another reviewer changed this record. Reload the report before saving.",
  SHARING_AUTHORITY_REVOKE_REASON_REQUIRED: "Enter a revocation reason of at least 10 characters.",
  SHARING_AUTHORITY_UNAVAILABLE: "No sharing-authority record is available to revoke."
};
async function rpc(client: SharingAuthorityRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) { const key = Object.keys(errors).find((code) => (result.error?.message ?? "").includes(code)); throw new Error(key ? errors[key] : "Sharing authority could not be loaded or saved. Check your connection and try again."); }
  return result.data;
}
function validateApplicationId(value: string): void { if (!uuid.test(value)) throw new Error("The candidate application reference is invalid."); }
export async function loadCandidateSharingAuthority(applicationId: string, client: SharingAuthorityRpcClient = createHiringSupabaseClient()): Promise<CandidateSharingAuthorityWorkspace> {
  validateApplicationId(applicationId);
  const data = object(await rpc(client, "get_candidate_sharing_authority", { p_application_id: applicationId }));
  if (typeof data.can_edit !== "boolean" || !Array.isArray(data.events)) throw invalid();
  const current = data.authority === null ? null : authority(data.authority);
  if (current && current.applicationId !== applicationId) throw invalid();
  const events = data.events.map((value): CandidateSharingAuthorityEvent => { const row = object(value); const action = text(row.action); if (!["recorded", "updated", "revoked"].includes(action)) throw invalid(); return { id: id(row.id), actorName: text(row.actor_name, 500), action: action as CandidateSharingAuthorityEvent["action"], reason: text(row.reason, 1000), createdAt: timestamp(row.created_at) }; });
  return { authority: current, events, canEdit: data.can_edit };
}
export async function recordCandidateSharingAuthority(input: { applicationId: string; authorityType: CandidateSharingAuthorityType; sourceReference: string; note: string; expectedVersion: number }, client: SharingAuthorityRpcClient = createHiringSupabaseClient()): Promise<CandidateSharingAuthority> {
  validateApplicationId(input.applicationId);
  const sourceReference = input.sourceReference.trim(), note = input.note.trim();
  if (!CANDIDATE_SHARING_AUTHORITY_TYPES.includes(input.authorityType) || sourceReference.length < 10 || sourceReference.length > 1000 || note.length > 2000 || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error(errors.SHARING_AUTHORITY_INVALID);
  return authority(await rpc(client, "record_candidate_sharing_authority", { p_application_id: input.applicationId, p_authority_type: input.authorityType, p_source_reference: sourceReference, p_note: note, p_expected_version: input.expectedVersion }));
}
export async function revokeCandidateSharingAuthority(input: { applicationId: string; reason: string; expectedVersion: number }, client: SharingAuthorityRpcClient = createHiringSupabaseClient()): Promise<CandidateSharingAuthority> {
  validateApplicationId(input.applicationId);
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1000) throw new Error(errors.SHARING_AUTHORITY_REVOKE_REASON_REQUIRED);
  return authority(await rpc(client, "revoke_candidate_sharing_authority", { p_application_id: input.applicationId, p_reason: reason, p_expected_version: input.expectedVersion }));
}
