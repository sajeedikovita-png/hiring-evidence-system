import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.106.1";
import { isActiveAdminProfile } from "./access.ts";

export type AuthorizedAdmin = {
  id: string;
  company_id: string;
  user_id: string;
  role: "admin";
  status: "active";
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
): Promise<AuthorizedAdmin> {
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

  const { data: profile, error: profileError } = await adminClient
    .from("recruiter_profiles")
    .select("id, company_id, user_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile || !isActiveAdminProfile(profile)) {
    throw new Error("Admin permission required");
  }

  return profile as AuthorizedAdmin;
}
