import assert from "node:assert/strict";
import { loadCandidateSharingAuthority, recordCandidateSharingAuthority, revokeCandidateSharingAuthority } from "../src/services/candidateSharingAuthorityService";

const applicationId = "00000000-0000-0000-0000-000000000025";
const authorityId = "00000000-0000-0000-0000-000000000035";
const eventId = "00000000-0000-0000-0000-000000000045";
const row = { id: authorityId, application_id: applicationId, authority_type: "candidate_confirmation", source_reference: "Candidate email dated 19 September 2026", note: "Synthetic QA only", recorded_by_name: "Recruiter", version: 1, recorded_at: "2026-09-19T10:00:00Z", revoked_at: null };

async function main() {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const client = { rpc: async (name: string, args?: Record<string, unknown>) => { calls.push({ name, args }); return { data: name === "get_candidate_sharing_authority" ? { authority: row, events: [{ id: eventId, actor_name: "Recruiter", action: "recorded", reason: "", created_at: "2026-09-19T10:00:00Z" }], can_edit: true } : name === "revoke_candidate_sharing_authority" ? { ...row, version: 2, revoked_at: "2026-09-19T11:00:00Z" } : row, error: null }; } };
  const workspace = await loadCandidateSharingAuthority(applicationId, client);
  assert.equal(workspace.authority?.sourceReference, row.source_reference);
  assert.equal(workspace.events[0]?.action, "recorded");
  await recordCandidateSharingAuthority({ applicationId, authorityType: "candidate_confirmation", sourceReference: row.source_reference, note: row.note, expectedVersion: 0 }, client);
  assert.deepEqual(calls.at(-1)?.args, { p_application_id: applicationId, p_authority_type: "candidate_confirmation", p_source_reference: row.source_reference, p_note: row.note, p_expected_version: 0 });
  const revoked = await revokeCandidateSharingAuthority({ applicationId, reason: "Candidate withdrew sharing confirmation", expectedVersion: 1 }, client);
  assert.equal(revoked.revokedAt, "2026-09-19T11:00:00Z");
  await assert.rejects(() => recordCandidateSharingAuthority({ applicationId, authorityType: "candidate_confirmation", sourceReference: "short", note: "", expectedVersion: 0 }, client), /at least 10/);
  await assert.rejects(() => revokeCandidateSharingAuthority({ applicationId, reason: "short", expectedVersion: 1 }, client), /at least 10/);
  const conflict = { rpc: async () => ({ data: null, error: { message: "SHARING_AUTHORITY_VERSION_CONFLICT" } }) };
  await assert.rejects(() => loadCandidateSharingAuthority(applicationId, conflict), /Another reviewer/);
  console.log("Candidate sharing authority service tests passed.");
}
void main();
