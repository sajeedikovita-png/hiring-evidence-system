export type SupabaseRuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

/**
 * The recruiter workspace and the public sign-up flow talk to the same Supabase
 * project. The public flow is configured under the VITE_PUBLIC_* names; the
 * recruiter client reads the dedicated VITE_SUPABASE_* names but falls back to
 * the public pair so a single configured project powers both without duplicating
 * the URL/anon key across two env names.
 */
type FullSupabaseEnv = SupabaseRuntimeEnv & {
  VITE_PUBLIC_SUPABASE_URL?: string;
  VITE_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export function getRuntimeSupabaseEnv(): SupabaseRuntimeEnv {
  const viteEnv = (import.meta as unknown as { env?: FullSupabaseEnv }).env;
  const nodeEnv = (globalThis as { process?: { env?: FullSupabaseEnv } }).process?.env;

  const read = (key: keyof FullSupabaseEnv): string | undefined =>
    viteEnv?.[key] ?? nodeEnv?.[key];

  return {
    VITE_SUPABASE_URL: read("VITE_SUPABASE_URL") ?? read("VITE_PUBLIC_SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: read("VITE_SUPABASE_ANON_KEY") ?? read("VITE_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function getMissingSupabaseEnvKeys(env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): string[] {
  return requiredEnvKeys.filter((key) => !env[key]?.trim());
}

export function hasSupabaseConfig(env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): boolean {
  return getMissingSupabaseEnvKeys(env).length === 0;
}

/**
 * True only when a recruiter has actually signed in (a live Supabase session is
 * persisted in this browser). Read synchronously from storage so the app can
 * pick the seed demo (no login) vs. real per-account data without an async gate.
 * No session -> the login-free demo; a session -> that recruiter's real data.
 */
export function hasActiveSupabaseSession(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !/^sb-.*-auth-token$/.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession ?? parsed;
      const token = session?.access_token;
      const expiresAt = session?.expires_at; // unix seconds
      if (token && (!expiresAt || Number(expiresAt) * 1000 > Date.now())) return true;
    }
  } catch {
    // malformed/unavailable storage — treat as no session (fall back to demo).
  }
  return false;
}

export function loadSupabaseConfig(env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): SupabaseConfig {
  const missingKeys = getMissingSupabaseEnvKeys(env);

  if (missingKeys.length > 0) {
    throw new Error(`Missing Supabase environment variables: ${missingKeys.join(", ")}`);
  }

  return {
    url: env.VITE_SUPABASE_URL?.trim() ?? "",
    anonKey: env.VITE_SUPABASE_ANON_KEY?.trim() ?? ""
  };
}
