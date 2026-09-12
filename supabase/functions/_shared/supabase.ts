import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.106.1";
export type AuthorizedPlatformAdministrator = {
  user_id: string;
};

function requiredEnvironmentValue(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment value: ${name}`);
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    requiredEnvironmentValue("SUPABASE_URL"),
    requiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function authorizeAdmin(
  request: Request,
  adminClient: SupabaseClient
): Promise<AuthorizedPlatformAdministrator> {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) throw new Error("Authentication required");

  const {
    data: { user },
    error: userError
  } = await adminClient.auth.getUser(token);

  if (userError || !user) throw new Error("Authentication required");

  const { data: platformAdministrator, error: platformAdministratorError } = await adminClient
    .from("platform_admins")
    .select("user_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (
    platformAdministratorError ||
    !platformAdministrator ||
    platformAdministrator.user_id !== user.id ||
    platformAdministrator.status !== "active"
  ) {
    throw new Error("Platform administrator permission required");
  }

  return platformAdministrator as AuthorizedPlatformAdministrator;
}
