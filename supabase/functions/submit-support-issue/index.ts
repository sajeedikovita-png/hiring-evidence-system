import { createAdminClient } from "../_shared/supabase.ts";
import { authenticatedSupportUser, response } from "../_shared/controlled-support.ts";
import { sendSupportOwnerNotification } from "../_shared/support-notification.ts";

type Dependencies = {
  adminClient?: ReturnType<typeof createAdminClient>;
  notification?: typeof sendSupportOwnerNotification;
};

export async function handleSubmitSupportIssue(request: Request, dependencies: Dependencies = {}) {
  if (request.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const adminClient = dependencies.adminClient ?? createAdminClient();
  let userId: string;
  try { userId = await authenticatedSupportUser(request, adminClient); } catch { return response({ error: "Authentication required" }, 401); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return response({ error: "Invalid support request" }, 400); }
  const { data, error } = await adminClient.rpc("submit_support_issue_as_actor", { p_actor_user_id: userId, p_issue: body });
  if (error || !data?.issueId) return response({ error: "The support request could not be recorded" }, 400);

  const notify = dependencies.notification ?? sendSupportOwnerNotification;
  const notification = await notify(adminClient, String(data.issueId)).catch(() => ({ status: "pending" as const, reason: "delivery_error" }));
  return response({ ...data, notificationStatus: notification.status });
}

if (import.meta.main) Deno.serve((request) => handleSubmitSupportIssue(request));
