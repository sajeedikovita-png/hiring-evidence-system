export type AuthContext = {
  companyId: string;
  userId: string;
  role: "admin" | "recruiter" | "hiring_manager";
  isAuthenticated: boolean;
  source: "dev-seed";
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
};

type SupabaseAuthClient = {
  auth: {
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
      data: { user: SupabaseAuthUser | null };
      error: { message?: string } | null;
    }>;
    updateUser?: (attributes: { password: string }) => Promise<{
      data: { user: SupabaseAuthUser | null };
      error: { message?: string } | null;
    }>;
    signOut?: () => Promise<{ error: { message?: string } | null }>;
  };
};

type SignInRecruiterInput = {
  client: SupabaseAuthClient;
  email: string;
  password: string;
};

type UpdateRecruiterPasswordInput = {
  client: SupabaseAuthClient;
  password: string;
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

export async function signInRecruiterWithPassword({ client, email, password }: SignInRecruiterInput): Promise<SupabaseAuthUser> {
  const trimmedEmail = email.trim();

  if (!trimmedEmail || !password) {
    throw new Error("Email and password are required");
  }

  const { data, error } = await client.auth.signInWithPassword({ email: trimmedEmail, password });

  if (error) {
    throw new Error(error.message ?? "Unable to sign in");
  }

  if (!data.user) {
    throw new Error("Auth user missing");
  }

  return data.user;
}

export async function updateRecruiterPassword({
  client,
  password
}: UpdateRecruiterPasswordInput): Promise<SupabaseAuthUser> {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }

  if (!client.auth.updateUser) {
    throw new Error("Password setup is unavailable");
  }

  const { data, error } = await client.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message ?? "Unable to set password");
  }

  if (!data.user) {
    throw new Error("Invitation session missing or expired");
  }

  return data.user;
}

export async function signOutRecruiter(client: Pick<SupabaseAuthClient, "auth">): Promise<void> {
  const { error } = client.auth.signOut ? await client.auth.signOut() : { error: null };

  if (error) {
    throw new Error(error.message ?? "Unable to sign out");
  }
}
