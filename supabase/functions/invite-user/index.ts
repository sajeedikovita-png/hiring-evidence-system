import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { authorizeAdmin, createAdminClient } from "../_shared/supabase.ts";

function getInvitationRedirectUrl(): string | undefined {
  const configuredAppUrl = Deno.env.get("APP_URL");
  if (!configuredAppUrl) return undefined;

  try {
    const appUrl = new URL(configuredAppUrl);
    const isLocalDevelopment = appUrl.protocol === "http:" && (appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1");
    if (appUrl.username || appUrl.password || appUrl.search || appUrl.hash || (appUrl.protocol !== "https:" && !isLocalDevelopment)) {
      return undefined;
    }
    return new URL("/set-password", appUrl.origin).toString();
  } catch {
    return undefined;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  const adminClient = createAdminClient();
  try {
    await authorizeAdmin(request, adminClient);
  } catch {
    return errorResponse("Platform administrator permission required", 403);
  }

  let email = "";
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!email) return errorResponse("Email is required", 400);

  const redirectTo = getInvitationRedirectUrl();
  if (!redirectTo) return errorResponse("Invitation redirect is not configured", 503);

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) return errorResponse("Unable to prepare invitation", 500);

  return jsonResponse({ ok: true, userId: data.user?.id, email: data.user?.email });
});
