import assert from "node:assert/strict";
import { createCandidateInternalNote, updateCandidateInternalNote, listCandidateInternalNotes, listCandidateInternalNoteEvents, type CandidateInternalNotesRpcClient } from "../src/services/candidateInternalNotesService";

async function main() {
  const applicationId = "10000000-0000-0000-0000-000000000001", noteId = "20000000-0000-0000-0000-000000000001", profileId = "30000000-0000-0000-0000-000000000001", requestId = "40000000-0000-0000-0000-000000000001";
  const row = {id: noteId, application_id: applicationId, kind: "reviewer_observation", body: "Ask about the project scope.", author_profile_id: profileId, author_name: "Reviewer snapshot", created_at: "2026-09-19T10:00:00.000000+00:00", updated_at: "2026-09-19T10:00:00Z", version: 1};
  const event = {id: requestId, note_id: noteId, actor_profile_id: null, actor_name: "Former reviewer", previous_state: null, state: row, created_at: row.created_at};
  const calls: Array<{name: string; args?: Record<string, unknown>}> = [];
  const client: CandidateInternalNotesRpcClient = {rpc: async (name, args) => {
    calls.push({name, args});
    return {data: name === "list_candidate_internal_notes" ? {notes: [row], current_profile_id: profileId, can_create: true} : name === "list_candidate_internal_note_events" ? [event] : row, error: null};
  }};
  const notes = await listCandidateInternalNotes(applicationId, client);
  assert.equal(notes.notes[0].authorName, "Reviewer snapshot");
  assert.equal(notes.notes[0].canEdit, true);
  const input = {applicationId, kind: "reviewer_observation" as const, body: " Ask about the project scope. ", requestId};
  await createCandidateInternalNote(input, client);
  await createCandidateInternalNote(input, client);
  assert.deepEqual(calls[1].args, {p_application_id: applicationId, p_kind: "reviewer_observation", p_body: row.body, p_request_id: requestId});
  assert.deepEqual(calls[2].args, calls[1].args, "Retries preserve the caller's idempotency key");
  await updateCandidateInternalNote({noteId, kind: "candidate_statement", body: "Candidate explained scope.", expectedVersion: 1}, client);
  assert.equal(calls[3].args?.p_expected_version, 1);
  const history = await listCandidateInternalNoteEvents(noteId, client);
  assert.equal(history[0].actorProfileId, null);
  assert.equal(history[0].actorName, "Former reviewer");
  assert.equal(history[0].state.canEdit, false);
  const count = calls.length;
  for (const body of [" ", "x".repeat(4001), "invalid\u0000text"]) await assert.rejects(() => createCandidateInternalNote({...input, body}, client), /4,000/);
  await assert.rejects(() => createCandidateInternalNote({...input, requestId: "invalid"}, client), /reference/);
  await assert.rejects(() => updateCandidateInternalNote({noteId, kind: "candidate_statement", body: "Valid", expectedVersion: 0}, client), /Reload/);
  assert.equal(calls.length, count, "Invalid data never reaches the RPC");
  const listClient = (patch: Record<string, unknown>, canCreate = true): CandidateInternalNotesRpcClient => ({rpc: async () => ({data: {notes: [{...row, ...patch}], current_profile_id: profileId, can_create: canCreate}, error: null})});
  assert.equal((await listCandidateInternalNotes(applicationId, listClient({}, false))).notes[0].canEdit, false);
  assert.equal((await listCandidateInternalNotes(applicationId, listClient({author_profile_id: null}))).notes[0].canEdit, false);
  for (const patch of [{created_at: "2026-02-30T10:00:00Z"}, {updated_at: "2026-09-19"}, {version: 0}, {kind: "unsupported"}, {body: "x".repeat(4001)}, {author_profile_id: undefined}, {author_name: ""}, {id: "invalid"}, {application_id: profileId}]) {
    await assert.rejects(() => listCandidateInternalNotes(applicationId, listClient(patch)), /invalid/);
  }
  const withPrivateFields = await listCandidateInternalNotes(applicationId, listClient({author_email: "private@example.com", body: "<script>text only</script>"}));
  assert.equal("author_email" in withPrivateFields.notes[0], false, "Unknown fields never escape the mapper");
  assert.equal(withPrivateFields.notes[0].body, "<script>text only</script>", "Body stays plain text, not parsed HTML");
  for (const [code, message] of [["NOTE_VERSION_CONFLICT", /Another reviewer/], ["NOTE_WRITE_ACCESS_REQUIRED", /does not currently allow/], ["NOTE_ACCESS_REQUIRED", /do not have access/], ["APPLICATION_UNAVAILABLE", /unavailable/]] as const) {
    await assert.rejects(() => createCandidateInternalNote(input, {rpc: async () => ({data: null, error: {message: code}})}), message);
  }
  await assert.rejects(() => listCandidateInternalNoteEvents(noteId, {rpc: async () => ({data: [{...event, note_id: applicationId}], error: null})}), /invalid/);
  console.log("Candidate internal notes service tests passed.");
}
void main();
