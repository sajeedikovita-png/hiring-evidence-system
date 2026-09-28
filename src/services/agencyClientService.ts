import { createHiringSupabaseClient } from "./supabaseClient";

export type AgencyClientStatus = "active" | "archived";
export type AgencyClient = {
  id: string; name: string; status: AgencyClientStatus;
  contactName: string | null; contactEmail: string | null; contactPhone: string | null; notes: string | null;
  version: number; createdAt: string | null; updatedAt: string | null; canViewContacts: boolean;
  createdByProfileId: string | null; createdByName: string | null; updatedByProfileId: string | null; updatedByName: string | null;
};
export type AgencyClientsList = { clients: AgencyClient[]; canManage: boolean; currentProfileId: string };
export type AgencyClientFields = { name: string; contactName: string; contactEmail: string; contactPhone: string; notes: string };
export type CreateAgencyClientInput = AgencyClientFields & { requestId: string };
export type UpdateAgencyClientInput = AgencyClientFields & { clientId: string; status: AgencyClientStatus; expectedVersion: number };
export type JobClientContext = { jobId: string; clientId: string | null; version: number; client: Pick<AgencyClient, "id" | "name" | "status"> | null; canManage: boolean };
export type AgencyClientRpcClient = { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }> };
const invalid = () => new Error("The client organisation response was invalid. Reload clients and try again.");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(); return value as Record<string, unknown>; }
function text(value: unknown, max: number, required = false): string { if (typeof value !== "string" || value.length > max || value.includes("\u0000") || (required && !value.trim())) throw invalid(); return value; }
function id(value: unknown): string { const result = text(value, 36); if (!uuid.test(result)) throw invalid(); return result; }
function nullableId(value: unknown): string | null { return value === null ? null : id(value); }
function version(value: unknown, min = 1): number { if (!Number.isSafeInteger(value) || Number(value) < min) throw invalid(); return Number(value); }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") throw invalid(); return value; }
function status(value: unknown): AgencyClientStatus { if (value !== "active" && value !== "archived") throw invalid(); return value; }
function timestamp(value: unknown): string {
  const result = text(value, 40);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(result);
  if (!match || !Number.isFinite(Date.parse(result))) throw invalid();
  const [, year, month, day, hour, minute, second, zone] = match;
  const end = new Date(`${year}-${month}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > end.getUTCDate() || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || (zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) throw invalid();
  return result;
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw invalid(); return value; }
function clientRecord(value: unknown): AgencyClient {
  const row = object(value), hasContacts = Object.prototype.hasOwnProperty.call(row, "contact_name");
  const result: AgencyClient = { id: id(row.id), name: text(row.name, 200, true), status: status(row.status), version: version(row.version), canViewContacts: hasContacts,
    contactName: null, contactEmail: null, contactPhone: null, notes: null, createdAt: null, updatedAt: null,
    createdByProfileId: null, createdByName: null, updatedByProfileId: null, updatedByName: null };
  if (hasContacts) {
    Object.assign(result, {contactName: text(row.contact_name, 200), contactEmail: text(row.contact_email, 254), contactPhone: text(row.contact_phone, 80), notes: text(row.notes, 2000), createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at), createdByProfileId: nullableId(row.created_by_profile_id), createdByName: text(row.created_by_name, Infinity, true), updatedByProfileId: nullableId(row.updated_by_profile_id), updatedByName: text(row.updated_by_name, Infinity, true)});
  } else if (["contact_email", "contact_phone", "notes", "created_at", "updated_at", "created_by_profile_id", "created_by_name", "updated_by_profile_id", "updated_by_name"].some((key) => Object.prototype.hasOwnProperty.call(row, key))) throw invalid();
  return result;
}
function context(value: unknown): JobClientContext {
  const row = object(value), nested = row.client === null ? null : object(row.client);
  const result = {jobId: id(row.job_id), clientId: nullableId(row.client_id), version: version(row.version, 0), canManage: boolean(row.can_manage), client: nested ? {id: id(nested.id), name: text(nested.name, 200, true), status: status(nested.status)} : null};
  if (result.clientId !== result.client?.id && !(result.clientId === null && result.client === null)) throw invalid();
  return result;
}
const errors: Record<string, string> = {
  CLIENT_VERSION_CONFLICT: "Another reviewer changed this client record. Reload it before saving your changes.",
  CLIENT_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow client changes. Check your access or ask your company administrator.",
  CLIENT_WORKSPACE_UNAVAILABLE: "Your company workspace is unavailable. Check your company account.",
  CLIENT_MANAGEMENT_REQUIRED: "Only an authorised company administrator or recruiter can manage clients.",
  CLIENT_MANAGEMENT_ACCESS_REQUIRED: "Only an authorised company administrator or recruiter can manage clients.",
  CLIENT_UNAVAILABLE: "This client organisation is unavailable in your company.",
  CLIENT_ARCHIVED: "This client is archived. Choose an active client for the role.",
  CLIENT_NAME_INVALID: "Enter a client organisation name of 1 to 200 characters.",
  CLIENT_EMAIL_INVALID: "Enter a valid contact email or leave it blank.",
  CLIENT_TEXT_TOO_LONG: "Shorten the client details before saving.",
  CLIENT_STATUS_INVALID: "Choose Active or Archived.",
  CLIENT_REQUEST_CONFLICT: "This request reference was already used. Reload clients before trying again.",
  CLIENT_REQUEST_ID_REQUIRED: "The request reference is missing. Reload clients and try again.",
  JOB_UNAVAILABLE: "This role is unavailable in your company."
};
async function rpc(client: AgencyClientRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) { const key = Object.keys(errors).find((code) => (result.error?.message ?? "").includes(code)); throw new Error(key ? errors[key] : "Client details could not be loaded or saved. Check your connection and try again."); }
  return result.data;
}
function inputId(value: string): void { if (typeof value !== "string" || !uuid.test(value)) throw new Error("The client or role reference is invalid. Reload clients and try again."); }
function expectedVersion(value: number, min = 1): void { if (!Number.isSafeInteger(value) || value < min) throw new Error("Reload client details before saving your changes."); }
function fields(input: AgencyClientFields): Record<string, unknown> {
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 200) throw new Error(errors.CLIENT_NAME_INVALID);
  const strings = [input.name, input.contactName, input.contactEmail, input.contactPhone, input.notes];
  if (strings.some((value) => typeof value !== "string" || value.includes("\u0000")) || input.contactName.trim().length > 200 || input.contactEmail.trim().length > 254 || input.contactPhone.trim().length > 80 || input.notes.trim().length > 2000) throw new Error(errors.CLIENT_TEXT_TOO_LONG);
  if (input.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) throw new Error(errors.CLIENT_EMAIL_INVALID);
  return {p_name: input.name.trim(), p_contact_name: input.contactName.trim(), p_contact_email: input.contactEmail.trim(), p_contact_phone: input.contactPhone.trim(), p_notes: input.notes.trim()};
}
export async function listAgencyClients(client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<AgencyClientsList> {
  const row = object(await rpc(client, "list_agency_clients", {}));
  return {clients: array(row.clients).map(clientRecord), canManage: boolean(row.can_manage), currentProfileId: id(row.current_profile_id)};
}
export async function createAgencyClient(input: CreateAgencyClientInput, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<AgencyClient> {
  inputId(input.requestId);
  return clientRecord(await rpc(client, "create_agency_client", {...fields(input), p_request_id: input.requestId}));
}
export async function updateAgencyClient(input: UpdateAgencyClientInput, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<AgencyClient> {
  inputId(input.clientId); expectedVersion(input.expectedVersion);
  if (input.status !== "active" && input.status !== "archived") throw new Error(errors.CLIENT_STATUS_INVALID);
  const result = clientRecord(await rpc(client, "update_agency_client", {...fields(input), p_client_id: input.clientId, p_status: input.status, p_expected_version: input.expectedVersion}));
  if (result.id !== input.clientId) throw invalid();
  return result;
}
export async function getJobClientContext(jobId: string, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<JobClientContext> {
  inputId(jobId);
  const result = context(await rpc(client, "get_job_client_context", {p_job_id: jobId}));
  if (result.jobId !== jobId) throw invalid();
  return result;
}
export async function updateJobClientContext(input: {jobId: string; clientId: string | null; expectedVersion: number}, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<JobClientContext> {
  inputId(input.jobId); if (input.clientId !== null) inputId(input.clientId); expectedVersion(input.expectedVersion, 0);
  const result = context(await rpc(client, "update_job_client_context", {p_job_id: input.jobId, p_client_id: input.clientId, p_expected_version: input.expectedVersion}));
  if (result.jobId !== input.jobId || result.clientId !== input.clientId) throw invalid();
  return result;
}
export type AgencyClientEvent = {id: string; clientId: string; actorProfileId: string | null; actorName: string; previousState: AgencyClient | null; state: AgencyClient; createdAt: string};
export type JobClientContextSnapshot = Omit<JobClientContext, "canManage">;
export type JobClientContextEvent = {id: string; jobId: string; actorProfileId: string | null; actorName: string; previousState: JobClientContextSnapshot | null; state: JobClientContextSnapshot; createdAt: string};
function contextSnapshot(value: unknown): JobClientContextSnapshot {
  const row = object(value);
  const {canManage: _canManage, ...result} = context({...row, can_manage: false});
  return result;
}
export async function listAgencyClientEvents(clientId: string, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<AgencyClientEvent[]> {
  inputId(clientId);
  return array(await rpc(client, "list_agency_client_events", {p_client_id: clientId})).map((value) => {
    const row = object(value);
    const result = {id: id(row.id), clientId: id(row.client_id), actorProfileId: nullableId(row.actor_profile_id), actorName: text(row.actor_name, Infinity, true), previousState: row.previous_state === null ? null : clientRecord(row.previous_state), state: clientRecord(row.state), createdAt: timestamp(row.created_at)};
    if (result.clientId !== clientId || result.state.id !== clientId || !result.state.canViewContacts || (result.previousState && (result.previousState.id !== clientId || !result.previousState.canViewContacts))) throw invalid();
    return result;
  });
}
export async function listJobClientContextEvents(jobId: string, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<JobClientContextEvent[]> {
  inputId(jobId);
  return array(await rpc(client, "list_job_client_context_events", {p_job_id: jobId})).map((value) => {
    const row = object(value);
    const result = {id: id(row.id), jobId: id(row.job_id), actorProfileId: nullableId(row.actor_profile_id), actorName: text(row.actor_name, Infinity, true), previousState: row.previous_state === null ? null : contextSnapshot(row.previous_state), state: contextSnapshot(row.state), createdAt: timestamp(row.created_at)};
    if (result.jobId !== jobId || result.state.jobId !== jobId || (result.previousState && result.previousState.jobId !== jobId)) throw invalid();
    return result;
  });
}
/** Archiving preserves the organisation and role history; it does not delete records. */
export async function archiveAgencyClient(input: Omit<UpdateAgencyClientInput, "status">, client: AgencyClientRpcClient = createHiringSupabaseClient()): Promise<AgencyClient> {
  return updateAgencyClient({...input, status: "archived"}, client);
}
