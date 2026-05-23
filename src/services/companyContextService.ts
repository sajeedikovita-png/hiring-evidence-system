import { organizations, users } from "../data/mockHiringData";
import { getDevAuthContext, requireAuthContext } from "./authService";

export type CompanyContext = {
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
};

export function requireCompanyId(companyId: string): string {
  if (!companyId.trim()) {
    throw new Error("companyId is required");
  }

  return companyId;
}

export function getActiveCompanyContext(): CompanyContext {
  const authContext = requireAuthContext(getDevAuthContext());
  const company = organizations.find((organization) => organization.id === authContext.companyId);
  const user = users.find((userRecord) => userRecord.id === authContext.userId);

  return {
    companyId: requireCompanyId(authContext.companyId),
    companyName: company?.name ?? "Development company workspace",
    userId: authContext.userId,
    userName: user?.name ?? "Development recruiter"
  };
}
