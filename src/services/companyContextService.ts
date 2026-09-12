import type { WorkspaceAccess as CompanyContext } from "./workspaceAccessService";

export type { CompanyContext };

export function requireCompanyId(companyId: string): string {
  if (!companyId.trim()) {
    throw new Error("companyId is required");
  }

  return companyId;
}
