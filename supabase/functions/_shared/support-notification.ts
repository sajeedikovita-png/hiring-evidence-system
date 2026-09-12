import type { SupabaseClient } from "npm:@supabase/supabase-js@2.106.1";

type NotificationResult = { status: "sent" | "pending"; reason?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

/** Sends a minimal owner alert. Customer details remain in the protected admin inbox. */
export async function sendSupportOwnerNotification(
  client: SupabaseClient,
  issueId: string,
  fetcher: typeof fetch = fetch,
  getEnvironment: (name: string) => string | undefined = (name) => Deno.env.get(name)
): Promise<NotificationResult> {
  const pending = async (reason: string): Promise<NotificationResult> => {
    await client.from("support_notification_deliveries").update({ status: "pending", attempts: 1, last_error: reason }).eq("issue_id", issueId);
    return { status: "pending", reason };
  };
  const apiKey = getEnvironment("RESEND_API_KEY");
  if (!apiKey) return pending("email_not_configured");

  const { data: issue, error: issueError } = await client
    .from("support_issues")
    .select("id, reported_category, title, companies(name)")
    .eq("id", issueId)
    .maybeSingle();
  if (issueError || !issue) return pending("issue_unavailable");

  const { data: administrators, error: administratorsError } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("status", "active");
  if (administratorsError || !Array.isArray(administrators)) return pending("owner_unavailable");

  const recipients: string[] = [];
  for (const administrator of administrators) {
    const userId = typeof administrator.user_id === "string" ? administrator.user_id : "";
    if (!userId) continue;
    const { data } = await client.auth.admin.getUserById(userId);
    if (data.user?.email) recipients.push(data.user.email);
  }
  if (recipients.length === 0) return pending("owner_email_unavailable");

  const companyValue = Array.isArray(issue.companies) ? issue.companies[0] : issue.companies;
  const company = companyValue && typeof companyValue === "object" ? companyValue as Record<string, unknown> : {};
  const companyName = typeof company.name === "string" ? company.name : "Customer workspace";
  const category = issue.reported_category === "feature" ? "Feature request" : issue.reported_category === "question" ? "Guide escalation" : "Problem report";
  const appUrl = (getEnvironment("APP_URL") ?? "https://hiringevidence.com").replace(/\/$/, "");
  const inboxUrl = `${appUrl}/admin/support`;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: getEnvironment("SUPPORT_FROM_EMAIL") ?? "Hiring Evidence <noreply@hiringevidence.com>",
      to: [...new Set(recipients)],
      subject: `[Hiring Evidence] ${category} received`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172019"><h2 style="margin-bottom:8px">${escapeHtml(category)} received</h2><p>A new support item from <strong>${escapeHtml(companyName)}</strong> is ready for review.</p><p><strong>Summary:</strong> ${escapeHtml(String(issue.title))}</p><p><a href="${inboxUrl}" style="display:inline-block;background:#bd4b22;color:#fff;padding:11px 16px;text-decoration:none;border-radius:6px">Open support inbox</a></p><p style="font-size:12px;color:#657067">Candidate documents and confidential diagnostics are not included in this email.</p></div>`
    })
  });

  if (!response.ok) return pending(`provider_${response.status}`);
  await client.from("support_notification_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, attempts: 1 }).eq("issue_id", issueId);
  return { status: "sent" };
}
