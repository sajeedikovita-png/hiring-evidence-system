import assert from "node:assert/strict";
import { analyzePublicEvidence, listPublicEvidence, loadPublicEvidence, mapPublicEvidence } from "../src/services/publicEvidenceService";

const calls: Array<{ name: string; args: unknown }> = [];
const client = {
  rpc: async (name: string, args?: Record<string, unknown>) => { calls.push({ name, args }); return { data: [{ id: "source-1", source_type: "github", source_url: "https://github.com/example", source_title: "Project", status: "ready", checked_at: "2026-09-12T00:00:00Z", analysis: { summary: "The project shows a published implementation.", requirementLinks: [{ criteriaId: "criterion-1", finding: "A public repository describes the implementation.", status: "Supporting evidence", verificationNeeded: "Confirm authorship and dates." }], additionalFacts: ["A release is documented."], verificationQuestions: ["Which part did you deliver?"] } }], error: null }; },
  functions: { invoke: async (name: string, options: { body: Record<string, unknown> }) => { calls.push({ name, args: options.body }); return { data: { status: "ready" }, error: null }; } }
};

async function run() {
  const sources = await listPublicEvidence(client, "report-1");
  assert.equal(calls[0]?.name, "list_public_evidence_for_report");
  assert.equal(sources[0]?.requirementLinks[0]?.status, "Supporting evidence");
  await analyzePublicEvidence(client, { reportId: "report-1", sourceType: "github", sourceUrl: "https://github.com/example", sourceTitle: "Project", sourceExcerpt: "A public project with delivery details.", candidateConfirmed: true });
  assert.equal(calls[1]?.name, "analyze-public-evidence");
  assert.equal((calls[1]?.args as Record<string, unknown>).candidateConfirmed, true);
  const failed = mapPublicEvidence({status: "failed", analysis: {}});
  assert.match(failed.summary, /Comparison failed/);
  assert.doesNotMatch(failed.summary, /being prepared/);
  const unavailable = await loadPublicEvidence({ ...client, rpc: async () => ({data: null, error: {message: "offline"}}) }, "report-1");
  assert.equal(unavailable.sources, null);
  assert.match(unavailable.error, /do not need to compare again/);
  const recovered = await loadPublicEvidence(client, "report-1");
  assert.equal(recovered.error, "");
  assert.equal(recovered.sources?.length, 1);
  console.log("public-evidence-service tests passed");
}
run().catch((error) => { console.error(error); process.exit(1); });
