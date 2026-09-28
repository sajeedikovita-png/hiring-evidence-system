import assert from "node:assert/strict";
import { loadCandidateIdentity, recordCandidateIdentity } from "../src/services/candidateIdentityService";

const applicationId = "00000000-0000-0000-0000-000000000025";
const candidateId = "00000000-0000-0000-0000-000000000021";
async function main() {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const client = { rpc: async (name: string, args?: Record<string, unknown>) => { calls.push({ name, args }); return { data: name === "get_candidate_identity" ? { candidate_id: candidateId, application_id: applicationId, recorded_name: "", version: 0, confirmed_at: null, can_edit: true, events: [] } : { candidate_id: candidateId, application_id: applicationId, recorded_name: "Avery Tan (fictional)", version: 1, confirmed_at: "2026-09-19T13:00:00Z" }, error: null }; } };
  const workspace = await loadCandidateIdentity(applicationId, client);
  assert.equal(workspace.recordedName, ""); assert.equal(workspace.version, 0);
  const saved = await recordCandidateIdentity({ applicationId, recordedName: " Avery Tan (fictional) ", reason: " Checked against the fictional CV ", expectedVersion: 0 }, client);
  assert.equal(saved.recordedName, "Avery Tan (fictional)");
  assert.deepEqual(calls.at(-1)?.args, { p_application_id: applicationId, p_recorded_name: "Avery Tan (fictional)", p_reason: "Checked against the fictional CV", p_expected_version: 0 });
  await assert.rejects(() => recordCandidateIdentity({ applicationId, recordedName: "A", reason: "Checked against the fictional CV", expectedVersion: 0 }, client), /between 2 and 200/);
  await assert.rejects(() => recordCandidateIdentity({ applicationId, recordedName: "Avery Tan", reason: "short", expectedVersion: 0 }, client), /at least 10/);
  const conflict = { rpc: async () => ({ data: null, error: { message: "CANDIDATE_NAME_VERSION_CONFLICT" } }) };
  await assert.rejects(() => loadCandidateIdentity(applicationId, conflict), /Another reviewer/);
  console.log("Candidate identity service tests passed.");
}
void main();
