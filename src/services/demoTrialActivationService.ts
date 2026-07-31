import { createHiringSupabaseClient } from "./supabaseClient";
import { getDemoTrialStatus, type DemoTrialStatus } from "./demoTrialService";

/** Starts a pending trial exactly once. Existing paid or non-demo workspaces are unchanged. */
export async function activateDemoTrialOnDashboardOpen(companyId: string): Promise<void> {
  const client = createHiringSupabaseClient();
  const { error } = await client.rpc("activate_demo_trial", { p_company_id: companyId });

  // A normal, non-demo company has no entitlement and must still be able to use its dashboard.
  if (error && !error.message.includes("Demo entitlement not found")) {
    throw error;
  }
}

export async function getDemoTrialStatusForCompany(companyId: string): Promise<DemoTrialStatus | null> {
  const client = createHiringSupabaseClient();
  const { data, error } = await client
    .from("demo_entitlements")
    .select("activated_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return getDemoTrialStatus({
    activatedAt: data.activated_at ? new Date(data.activated_at) : null,
    now: new Date()
  });
}
