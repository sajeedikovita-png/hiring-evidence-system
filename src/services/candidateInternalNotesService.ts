import { createHiringSupabaseClient } from "./supabaseClient";

export const CANDIDATE_INTERNAL_NOTE_KINDS = ["candidate_statement", "reviewer_observation", "verification_record"] as const;
export type CandidateInternalNoteKind = typeof CANDIDATE_INTERNAL_NOTE_KINDS[number];
export const candidateInternalNoteKindLabels: Record<CandidateInternalNoteKind, string> = {
  candidate_statement: "Candidate statement", reviewer_observation: "Reviewer observation", verification_record: "Verification record"
};
export type CandidateInternalNote = {
  id: string; applicationId: string; kind: CandidateInternalNoteKind; body: string;
  authorProfileId: string | null; authorName: string; createdAt: string; updatedAt: string; version: number; canEdit: boolean;
};
export type CandidateInternalNotesList = { notes: CandidateInternalNote[]; currentProfileId: string; canCreate: boolean };
export type CandidateInternalNoteEvent = {
  id: string; noteId: string; actorProfileId: string | null; actorName: string;
  previousState: CandidateInternalNote | null; state: CandidateInternalNote; createdAt: string;
};
export type CreateCandidateInternalNoteInput = {
  applicationId: string; kind: CandidateInternalNoteKind; body: string; requestId: string;
};
export type UpdateCandidateInternalNoteInput = {
  noteId: string; kind: CandidateInternalNoteKind; body: string; expectedVersion: number;
};
export type CandidateInternalNotesRpcClient = {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};
const invalid = () => new Error("The internal note response was invalid. Reload notes and try again.");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== "string") throw invalid(); return value; }
function identifier(value: unknown): string { const result = text(value); if (!uuidPattern.test(result)) throw invalid(); return result; }
function nullableIdentifier(value: unknown): string | null { return value === null ? null : identifier(value); }
function timestamp(value: unknown): string {
  const result = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.exec(result);
  if (!match || !Number.isFinite(Date.parse(result))) throw invalid();
  const [, year, month, day, hour, minute, second, zone] = match;
  const monthNumber = Number(month), dayNumber = Number(day);
  const daysInMonth = new Date(Date.UTC(Number(year), monthNumber, 0)).getUTCDate();
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > daysInMonth || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) throw invalid();
  if (zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) throw invalid();
  return result;
}
function kind(value: unknown): CandidateInternalNoteKind {
  if (!CANDIDATE_INTERNAL_NOTE_KINDS.includes(value as CandidateInternalNoteKind)) throw invalid();
  return value as CandidateInternalNoteKind;
}
function positiveVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw invalid();
  return Number(value);
}
function body(value: unknown): string {
  const result = text(value);
  if (!result.trim() || result.length > 4000 || result.includes("\u0000")) throw invalid();
  // Return text unchanged: consumers render it as text, never HTML.
  return result;
}
function displayName(value: unknown): string { const result = text(value); if (!result.trim() || result.length > 500) throw invalid(); return result; }
function note(value: unknown): CandidateInternalNote {
  const row = object(value);
  return { id: identifier(row.id), applicationId: identifier(row.application_id), kind: kind(row.kind), body: body(row.body),
    authorProfileId: nullableIdentifier(row.author_profile_id), authorName: displayName(row.author_name),
    createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at), version: positiveVersion(row.version), canEdit: false };
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw invalid(); return value; }
const errors: Record<string, string> = {
  NOTE_VERSION_CONFLICT: "Another reviewer edited this note. Reload it before saving your changes.",
  NOTE_WRITE_ACCESS_REQUIRED: "Your workspace does not currently allow note changes. Check your access or ask your company administrator.",
  NOTE_AUTHOR_REQUIRED: "Only the original author can edit this note. Add your own note to record another perspective.",
  NOTE_REQUEST_ID_REQUIRED: "The note request reference is missing. Reload notes and try again.",
  NOTE_ACCESS_REQUIRED: "You do not have access to these internal notes. Check your company account.",
  NOTE_UNAVAILABLE: "This internal note is unavailable in your company.",
  APPLICATION_UNAVAILABLE: "This candidate application is unavailable in your company.",
  NOTE_KIND_INVALID: "Choose candidate statement, reviewer observation or verification record.",
  NOTE_BODY_INVALID: "Enter a note between 1 and 4,000 characters.",
  NOTE_BODY_TOO_LONG: "Keep the note to 4,000 characters or fewer.",
  NOTE_REQUEST_ID_INVALID: "The note request reference is invalid. Reload notes and try again.",
  NOTE_REQUEST_CONFLICT: "This request reference was already used. Reload notes before trying again."
};
async function rpc(client: CandidateInternalNotesRpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) {
    const key = Object.keys(errors).find((code) => (result.error?.message ?? "").includes(code));
    throw new Error(key ? errors[key] : "Internal notes could not be loaded or saved. Check your connection and try again.");
  }
  return result.data;
}
function validateInput(input: { kind: CandidateInternalNoteKind; body: string }): string {
  if (!CANDIDATE_INTERNAL_NOTE_KINDS.includes(input.kind)) throw new Error(errors.NOTE_KIND_INVALID);
  if (typeof input.body !== "string" || !input.body.trim() || input.body.trim().length > 4000 || input.body.includes("\u0000")) throw new Error(errors.NOTE_BODY_INVALID);
  return input.body.trim();
}
function validateId(value: string): void { if (!uuidPattern.test(value)) throw new Error("The note reference is invalid. Reload notes and try again."); }
export async function listCandidateInternalNotes(applicationId: string, client: CandidateInternalNotesRpcClient = createHiringSupabaseClient()): Promise<CandidateInternalNotesList> {
  validateId(applicationId);
  const data = object(await rpc(client, "list_candidate_internal_notes", { p_application_id: applicationId }));
  const currentProfileId = identifier(data.current_profile_id);
  if (typeof data.can_create !== "boolean") throw invalid();
  const canCreate = data.can_create;
  const notes = array(data.notes).map(note).map((item) => ({...item, canEdit: item.authorProfileId === currentProfileId && canCreate}));
  if (notes.some((item) => item.applicationId !== applicationId)) throw invalid();
  return {notes, currentProfileId, canCreate};
}
export async function createCandidateInternalNote(input: CreateCandidateInternalNoteInput, client: CandidateInternalNotesRpcClient = createHiringSupabaseClient()): Promise<CandidateInternalNote> {
  validateId(input.applicationId); validateId(input.requestId);
  const nextBody = validateInput(input);
  const result = note(await rpc(client, "create_candidate_internal_note", { p_application_id: input.applicationId, p_kind: input.kind, p_body: nextBody, p_request_id: input.requestId }));
  if (result.applicationId !== input.applicationId) throw invalid();
  return {...result, canEdit: true};
}
export async function updateCandidateInternalNote(input: UpdateCandidateInternalNoteInput, client: CandidateInternalNotesRpcClient = createHiringSupabaseClient()): Promise<CandidateInternalNote> {
  validateId(input.noteId);
  const nextBody = validateInput(input);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new Error("Reload this note before saving your changes.");
  const result = note(await rpc(client, "update_candidate_internal_note", { p_note_id: input.noteId, p_kind: input.kind, p_body: nextBody, p_expected_version: input.expectedVersion }));
  if (result.id !== input.noteId) throw invalid();
  return {...result, canEdit: true};
}
export async function listCandidateInternalNoteEvents(noteId: string, client: CandidateInternalNotesRpcClient = createHiringSupabaseClient()): Promise<CandidateInternalNoteEvent[]> {
  validateId(noteId);
  return array(await rpc(client, "list_candidate_internal_note_events", { p_note_id: noteId })).map((value) => {
    const row = object(value);
    const event: CandidateInternalNoteEvent = { id: identifier(row.id), noteId: identifier(row.note_id), actorProfileId: nullableIdentifier(row.actor_profile_id), actorName: displayName(row.actor_name),
      previousState: row.previous_state === null ? null : note(row.previous_state), state: note(row.state), createdAt: timestamp(row.created_at) };
    if (event.noteId !== noteId || event.state.id !== noteId || (event.previousState && (event.previousState.id !== noteId || event.previousState.applicationId !== event.state.applicationId))) throw invalid();
    return event;
  });
}
