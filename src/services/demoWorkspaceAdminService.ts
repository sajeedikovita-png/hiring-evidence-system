/**
 * Platform-administrator view of live demo workspaces.
 *
 * Reads go through `demo_workspaces_for_platform_admin()` because the
 * `demo_entitlements` table is company-scoped: a recruiter sees only their own
 * workspace, while the platform administrator needs every one of them.
 *
 * Converting is the manual step that keeps a company's workspace alive after the
 * demo period. It follows an off-platform commercial decision — there is no
 * payment code behind it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDemoTrialStatus, type DemoTrialState } from "./demoTrialService";

export type DemoWorkspaceRow = {
  companyId: string;
  companyName: string;
  state: DemoTrialState | "converted";
  activatedAt: string | null;
  activeUntil: string | null;
  purgeAt: string | null;
  convertedAt: string | null;
  candidateCount: number;
  jobCount: number;
};

type DbRow = {
  company_id: string;
  company_name: string;
  state: string;
  activated_at: string | null;
  active_until: string | null;
  purge_at: string | null;
  converted_at: string | null;
  candidate_count: number | string;
  job_count: number | string;
};

function mapRow(row: DbRow): DemoWorkspaceRow {
  return {
    companyId: row.company_id,
    companyName: row.company_name,
    state: row.state as DemoWorkspaceRow["state"],
    activatedAt: row.activated_at,
    activeUntil: row.active_until,
    purgeAt: row.purge_at,
    convertedAt: row.converted_at,
    candidateCount: Number(row.candidate_count ?? 0),
    jobCount: Number(row.job_count ?? 0)
  };
}

/**
 * What the administrator reads on each row. A converted workspace has no countdown
 * at all — it is a continuing customer, not a demo running down a clock.
 */
export function describeDemoWorkspace(workspace: DemoWorkspaceRow, now: Date = new Date()): string {
  if (workspace.state === "converted") {
    return "Continuing customer. This workspace is not scheduled for deletion.";
  }

  if (!workspace.activatedAt) {
    return "Invited. The 14 days start on their first dashboard visit.";
  }

  const status = getDemoTrialStatus({ activatedAt: new Date(workspace.activatedAt), now });

  if (status.state === "active") {
    return `${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"} left in the demo.`;
  }

  if (status.state === "read_only") {
    return `View-only. Scheduled for deletion in ${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"}.`;
  }

  return "Past the view-only period. Due for deletion at the next scheduled run.";
}

export async function listDemoWorkspaces(client: SupabaseClient): Promise<DemoWorkspaceRow[]> {
  const { data, error } = await client.rpc("demo_workspaces_for_platform_admin");
  if (error) throw error;

  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function convertDemoWorkspace(client: SupabaseClient, companyId: string): Promise<void> {
  const { error } = await client.rpc("convert_demo_workspace", { p_company_id: companyId });
  if (error) throw error;
}
