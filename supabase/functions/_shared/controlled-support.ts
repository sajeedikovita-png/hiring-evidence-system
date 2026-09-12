import type { SupabaseClient } from "npm:@supabase/supabase-js@2.106.1";

export const supportCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

export type SupportProviderTransport = (input: { model: string; system: string; user: string; signal: AbortSignal }) => Promise<string>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: supportCorsHeaders }); }
export function text(value: unknown, maximum: number) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum ? value.trim() : undefined; }
export function parseJsonObject(content: string): Record<string, unknown> {
  const value = content.trim();
  if (!value.startsWith("{") || !value.endsWith("}")) throw new Error("MODEL_OUTPUT_INVALID");
  try { return record(JSON.parse(value)); } catch { throw new Error("MODEL_OUTPUT_INVALID"); }
}

export async function authenticatedSupportUser(request: Request, client: SupabaseClient) {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new Error("AUTH_REQUIRED");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) throw new Error("AUTH_REQUIRED");
  return data.user.id;
}

export async function openRouterSupportTransport(input: { model: string; system: string; user: string; signal: AbortSignal }) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("PROVIDER_UNAVAILABLE");
  const result = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://hiring-evidence-system.vercel.app", "X-Title": "Hiring Evidence Support" },
    body: JSON.stringify({ model: input.model, max_tokens: 420, reasoning: { effort: "none" }, messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }] }), signal: input.signal
  });
  if (!result.ok) throw new Error("PROVIDER_UNAVAILABLE");
  const payload = record(await result.json().catch(() => null));
  const choice = record(Array.isArray(payload.choices) ? payload.choices[0] : undefined);
  const content = record(choice.message).content;
  if (choice.finish_reason !== "stop" || typeof content !== "string" || !content.trim()) throw new Error("PROVIDER_UNAVAILABLE");
  return content;
}

export function configuredSupportModel(injected: boolean, getEnvironment?: (name: string) => string | undefined) {
  return getEnvironment?.("OPENROUTER_MODEL") ?? (injected ? "openai/gpt-5.6-terra" : Deno.env.get("OPENROUTER_MODEL")) ?? "openai/gpt-5.6-terra";
}
