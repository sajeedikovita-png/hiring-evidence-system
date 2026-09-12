import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, type SupabaseRuntimeEnv } from "./supabaseConfig";

export type WorkspaceRole = "admin" | "recruiter" | "hiring_manager";

export type WorkspaceAccess = {
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  role: WorkspaceRole;
};

export type WorkspaceAccessFailure =
  | "configuration_missing"
  | "authentication_required"
  | "profile_missing"
  | "company_inactive"
  | "role_invalid";

export class WorkspaceAccessError extends Error {
  constructor(public readonly reason: WorkspaceAccessFailure) {
    super("Workspace access is unavailable.");
  }
}

export type WorkspaceAccessGeneration = {
  start: () => number;
  invalidate: () => void;
  isCurrent: (generation: number) => boolean;
};

/** Keeps stale auth/profile resolutions from restoring a previous user's UI. */
export function createWorkspaceAccessGeneration(): WorkspaceAccessGeneration {
  let current = 0;
  return {
    start: () => ++current,
    invalidate: () => {
      current += 1;
    },
    isCurrent: (generation) => generation === current
  };
}

type AccessRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "admin" || value === "recruiter" || value === "hiring_manager";
}

/**
 * Resolves the only company workspace a browser session may use. UI route
 * guards and repository reads share this check so a caller cannot select a
 * company id from another workspace.
 */
export async function resolveWorkspaceAccess(
  client: Pick<SupabaseClient, "auth" | "from">,
  env?: SupabaseRuntimeEnv
): Promise<WorkspaceAccess> {
  if (!hasSupabaseConfig(env)) {
    throw new WorkspaceAccessError("configuration_missing");
  }

  const {
    data: { user },
    error: userError
  } = await client.auth.getUser();

  if (userError || !user?.id) {
    throw new WorkspaceAccessError("authentication_required");
  }

  const { data, error } = await client
    .from("recruiter_profiles")
    .select("id, company_id, user_id, display_name, role, status, companies(name, status)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const profiles = Array.isArray(data) ? data : [];
  if (error || profiles.length !== 1) {
    throw new WorkspaceAccessError("profile_missing");
  }

  const profile = profiles[0] as AccessRecord;
  const company = profile.companies as AccessRecord | null | undefined;
  const companyId = text(profile.company_id);
  const profileUserId = text(profile.user_id);
  const role = text(profile.role);

  if (text(profile.status) !== "active") {
    throw new WorkspaceAccessError("profile_missing");
  }

  if (!companyId || profileUserId !== user.id || !company || text(company.status) !== "active") {
    throw new WorkspaceAccessError("company_inactive");
  }

  if (!isWorkspaceRole(role)) {
    throw new WorkspaceAccessError("role_invalid");
  }

  return {
    companyId,
    companyName: text(company.name) || "Company workspace",
    userId: user.id,
    userName: text(profile.display_name) || user.email || "Recruiter",
    role
  };
}

export async function requireWorkspaceAccess(
  client: Pick<SupabaseClient, "auth" | "from">,
  companyId: string,
  env?: SupabaseRuntimeEnv,
  requireAdmin = false
): Promise<WorkspaceAccess> {
  const access = await resolveWorkspaceAccess(client, env);

  if (access.companyId !== companyId) {
    throw new WorkspaceAccessError("company_inactive");
  }

  if (requireAdmin && access.role !== "admin") {
    throw new WorkspaceAccessError("role_invalid");
  }

  return access;
}
