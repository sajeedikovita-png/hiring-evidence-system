export type AuthContext = {
  companyId: string;
  userId: string;
  role: "admin" | "recruiter" | "hiring_manager";
  isAuthenticated: boolean;
  source: "dev-seed";
};

export function getDevAuthContext(): AuthContext {
  return {
    companyId: "org-northstar",
    userId: "user-sarah-tan",
    role: "recruiter",
    isAuthenticated: true,
    source: "dev-seed"
  };
}

export function requireAuthContext(context: AuthContext): AuthContext {
  if (!context.isAuthenticated || !context.companyId || !context.userId) {
    throw new Error("Authenticated company context is required");
  }

  return context;
}
