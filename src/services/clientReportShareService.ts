import { createClient } from "@supabase/supabase-js";
import { createHiringSupabaseClient } from "./supabaseClient";
import { loadSupabaseConfig } from "./supabaseConfig";
import type { ClientHandoff, ClientHandoffBranding } from "./clientHandoffService";

type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };
export type ClientReportShare = { id: string; createdAt: string; expiresAt: string; revokedAt: string | null; includeDecision: boolean };
export type CreatedClientReportShare = { id: string; token: string; expiresAt: string };
export type SharedClientReport = { summary: ClientHandoff; expiresAt: string };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Client summary response was invalid.");
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("Client summary response was invalid.");
  return value;
};
const texts = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new Error("Client summary response was invalid.");
  return value.map(text);
};
async function rpc(client: RpcClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(result.error.message || "Client summary request failed.");
  return result.data;
}
export function clientShareErrorMessage(error: unknown): string {
  const message=error instanceof Error?error.message:"";
  if(message.includes("CANDIDATE_CONSENT_REQUIRED"))return "Record the candidate's consent before creating a client link.";
  if(message.includes("CANDIDATE_SHARING_AUTHORITY_REQUIRED"))return "Record documented candidate sharing authority before creating a client link.";
  if(message.includes("CANDIDATE_SHARING_RESTRICTED"))return "Sharing is restricted by an active candidate privacy request.";
  if(message.includes("ACTIVE_SHARE_LIMIT"))return "This report already has five active links. Revoke one before creating another.";
  if(message.includes("SHARE_WRITE_ACCESS_REQUIRED"))return "Your workspace does not currently allow new client links.";
  if(message.includes("REPORT_UNAVAILABLE"))return "This report is no longer available in the active company workspace.";
  return "The share link could not be created. Please try again or contact support.";
}
export async function createClientReportShare(input: { reportId: string; expiresInDays: number; includeDecision: boolean }, client: RpcClient = createHiringSupabaseClient()): Promise<CreatedClientReportShare> {
  if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 30) throw new Error("Choose an expiry between 1 and 30 days.");
  const result = object(await rpc(client, "create_client_report_share", { p_report_id: input.reportId, p_expires_in_days: input.expiresInDays, p_include_decision: input.includeDecision }));
  const token = text(result.token);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Client share token was invalid.");
  return { id: text(result.id), token, expiresAt: text(result.expiresAt) };
}
export async function listClientReportShares(reportId: string, client: RpcClient = createHiringSupabaseClient()): Promise<ClientReportShare[]> {
  const rows = await rpc(client, "list_client_report_shares", { p_report_id: reportId });
  if (!Array.isArray(rows)) throw new Error("Client share list was invalid.");
  return rows.map((value) => { const row = object(value); return { id: text(row.id), createdAt: text(row.createdAt), expiresAt: text(row.expiresAt), revokedAt: row.revokedAt === null ? null : text(row.revokedAt), includeDecision: row.includeDecision === true }; });
}
export async function revokeClientReportShare(shareId: string, client: RpcClient = createHiringSupabaseClient()): Promise<void> {
  await rpc(client, "revoke_client_report_share", { p_share_id: shareId });
}
function anonymousClient(): RpcClient {
  const config = loadSupabaseConfig();
  return createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function readClientReportShare(token: string, client?: RpcClient): Promise<SharedClientReport | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const value = await rpc(client ?? anonymousClient(), "read_client_report_share", { p_token: token });
  if (value === null) return null;
  const result = object(value);
  const source = object(result.summary);
  if (!Array.isArray(source.criteria)) throw new Error("Client summary response was invalid.");
  let decision: ClientHandoff["decision"];
  if (source.decision != null) {
    const saved = object(source.decision);
    const outcome = text(saved.outcome);
    if (!["Shortlist for interview", "Hold for review", "Not proceeding", "Request more information"].includes(outcome)) throw new Error("Client summary decision was invalid.");
    decision = { outcome: outcome as NonNullable<ClientHandoff["decision"]>["outcome"], reason: text(saved.reason), recordedAt: text(saved.recordedAt) };
  }
  const rawBranding = source.branding == null ? undefined : object(source.branding);
  const branding: ClientHandoffBranding = rawBranding ? { displayName:text(rawBranding.displayName),logoUrl:text(rawBranding.logoUrl),accentColor:text(rawBranding.accentColor),heading:text(rawBranding.heading),footer:text(rawBranding.footer) } : {displayName:text(source.companyName),logoUrl:"",accentColor:"#28543f",heading:"Candidate evidence summary",footer:"AI assists. Human decides. Evidence explains."};
  return { expiresAt: text(result.expiresAt), summary: {
    reportReference: text(source.reportReference), companyName: text(source.companyName), candidateName: text(source.candidateName), roleTitle: text(source.roleTitle), preparedAt: text(source.preparedAt), reportGeneratedAt: text(source.reportGeneratedAt), status: "Human review required",
    criteria: source.criteria.map((value) => { const item = object(value); return { requirement: text(item.requirement), evidence: text(item.evidence), source: text(item.source), sourceReference: text(item.sourceReference), status: text(item.status), verification: text(item.verification) }; }),
    missingEvidence: texts(source.missingEvidence), verificationNeeded: texts(source.verificationNeeded), questions: texts(source.questions), branding, decision
  } };
}
