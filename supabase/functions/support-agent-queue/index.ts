import { createAdminClient } from "../_shared/supabase.ts";
import { response } from "../_shared/controlled-support.ts";

const WORKER_ID = "terra-support-maintainer-v1";
type AgentClient = { rpc: (name: string, input: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
type Dependencies = { client?: AgentClient; expectedToken?: string };

function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left); const b = encoder.encode(right);
  let result = a.length ^ b.length;
  const length = Math.max(a.length,b.length);
  for (let index=0;index<length;index+=1) result |= (a[index % Math.max(a.length,1)] ?? 0) ^ (b[index % Math.max(b.length,1)] ?? 0);
  return result === 0;
}

export async function handleSupportAgentQueue(request: Request, dependencies: Dependencies = {}) {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-support-agent-token", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405);
  const expected = dependencies.expectedToken ?? Deno.env.get("SUPPORT_AGENT_TOKEN") ?? "";
  const provided = request.headers.get("x-support-agent-token") ?? "";
  if (!expected || !provided || !safeEqual(provided,expected)) return response({ error: "AGENT_AUTH_REQUIRED" }, 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return response({ error: "INVALID_JSON" }, 400); }
  const action = typeof body.action === "string" ? body.action : "";
  const client = dependencies.client ?? createAdminClient();
  if (action === "claim") {
    const { data,error } = await client.rpc("claim_support_agent_job", { p_worker_id: WORKER_ID });
    if (error) return response({ error: "CLAIM_FAILED" }, 500);
    return response(data ?? { job: null });
  }
  if (action === "heartbeat") {
    const { data,error } = await client.rpc("heartbeat_support_agent_job", { p_job_id: body.jobId,p_claim_token: body.claimToken,p_worker_id: WORKER_ID });
    if (error) return response({ error: "HEARTBEAT_FAILED" }, 409);
    return response(data ?? {});
  }
  if (action === "update") {
    const input = body.report && typeof body.report === "object" && !Array.isArray(body.report) ? body.report as Record<string,unknown> : {};
    const { data,error } = await client.rpc("update_support_agent_job_v2", {
      p_job_id: input.jobId,p_claim_token: input.claimToken,p_worker_id: WORKER_ID,p_status: input.status,p_risk_level: input.riskLevel,p_classification: input.classification,
      p_investigation_summary: input.investigationSummary ?? null,p_fix_summary: input.fixSummary ?? null,p_test_results: input.testResults ?? [],
      p_branch_name: input.branchName ?? null,p_preview_url: input.previewUrl ?? null,p_deployment_id: input.deploymentId ?? null,
      p_base_commit: input.baseCommit ?? null,p_target_commit: input.targetCommit ?? null,p_changed_files: input.changedFiles ?? [],p_blocked_reason: input.blockedReason ?? null
    });
    if (error) return response({ error: "UPDATE_FAILED", detail: error.message }, 400);
    return response(data ?? {});
  }
  return response({ error: "ACTION_INVALID" }, 400);
}

if (import.meta.main) Deno.serve((request) => handleSupportAgentQueue(request));
