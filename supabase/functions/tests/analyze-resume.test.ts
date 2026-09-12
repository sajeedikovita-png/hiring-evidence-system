import { assertEquals } from "jsr:@std/assert@1.0.16";
import { handleAnalyzeResume, validateAnalysis } from "../analyze-resume/index.ts";

type FakeClient = { rpcCalls: Array<{ name: string; args: Record<string, unknown> }>; auth: { getUser: (token: string) => Promise<unknown> }; rpc: (name: string, args: Record<string, unknown>) => Promise<unknown> };

function fakeClient(options: { claim?: unknown; claimError?: unknown; finalized?: unknown; finalError?: unknown } = {}): FakeClient {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    rpcCalls,
    auth: { getUser: async (token: string) => token === "valid" ? { data: { user: { id: "user-1" } }, error: null } : { data: { user: null }, error: new Error("invalid") } },
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === "claim_document_analysis_run") return { data: options.claim, error: options.claimError ?? null };
      if (name === "finalize_document_analysis_run") return { data: options.finalized, error: options.finalError ?? null };
      return { data: null, error: null };
    }
  };
}

function request(token = "valid") {
  return new Request("https://example.test/analyze-resume", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ documentId: "document-1", extractedText: "[Page 1] Evidence", extractionMethod: "browser_pdf_text", extractionMetadata: { pageCount: 1, pageLabels: ["Page 1"] } }) });
}

const criteria = [{ id: "11111111-1111-4111-8111-111111111111", label: "Relevant experience" }];
const claim = { state: "claimed", run_id: "run-1", lease_token: "11111111-1111-4111-8111-111111111111", job_title: "Recruiter", criteria };
const validOutput = JSON.stringify({ requirementEvidence: [{ criteriaId: criteria[0].id, evidence: "The resume records related work.", sourceReference: "Page 1", confidence: "Medium", verificationNeeded: "Verify scope in interview.", statusLabel: "Needs verification" }], missingEvidence: ["No clear duration."], suggestedInterviewQuestions: ["Which related project did you own?"], recruiterNotes: ["Source reference requires verification."] });
assertEquals(validateAnalysis(JSON.parse(validOutput), criteria, "[Page 1] Evidence").requirementEvidence.length, 1);

Deno.test("anonymous requests never invoke the provider", async () => {
  let calls = 0;
  const response = await handleAnalyzeResume(request("missing"), { adminClient: fakeClient() as never, providerTransport: async () => { calls++; return validOutput; } });
  assertEquals(response.status, 401); assertEquals(calls, 0);
});

for (const name of ["inactive", "expired", "other_company"]) {
  Deno.test(`${name} claim rejection happens before provider call`, async () => {
    let calls = 0;
    const client = fakeClient({ claimError: { message: name } });
    const response = await handleAnalyzeResume(request(), { adminClient: client as never, providerTransport: async () => { calls++; return validOutput; } });
    assertEquals(response.status, 403); assertEquals(calls, 0); assertEquals(client.rpcCalls[0].name, "claim_document_analysis_run");
  });
}

Deno.test("completed run is reused without a duplicate provider call", async () => {
  let calls = 0;
  const response = await handleAnalyzeResume(request(), { adminClient: fakeClient({ claim: { state: "completed", run_id: "run-1", report_code: "HER-1" } }) as never, providerTransport: async () => { calls++; return validOutput; } });
  assertEquals(response.status, 200); assertEquals(calls, 0);
});

Deno.test("malformed provider output fails the claimed run", async () => {
  const client = fakeClient({ claim });
  const response = await handleAnalyzeResume(request(), { adminClient: client as never, providerTransport: async () => "not JSON" });
  assertEquals(response.status, 422); assertEquals(client.rpcCalls.map((call) => call.name), ["claim_document_analysis_run", "fail_document_analysis_run"]);
});

Deno.test("valid provider output finalizes one report", async () => {
  const client = fakeClient({ claim, finalized: { public_report_code: "HER-VALID" } });
  const response = await handleAnalyzeResume(request(), { adminClient: client as never, providerTransport: async () => validOutput });
  assertEquals(response.status, 200); assertEquals(client.rpcCalls.map((call) => call.name), ["claim_document_analysis_run", "finalize_document_analysis_run"]);
  assertEquals((await response.json()).reportCode, "HER-VALID");
});
