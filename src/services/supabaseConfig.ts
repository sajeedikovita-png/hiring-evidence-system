export type SupabaseRuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

export function getRuntimeSupabaseEnv(): SupabaseRuntimeEnv {
  const viteEnv = (import.meta as unknown as { env?: SupabaseRuntimeEnv }).env;
  const nodeEnv = (globalThis as { process?: { env?: SupabaseRuntimeEnv } }).process?.env;

  return {
    VITE_SUPABASE_URL: viteEnv?.VITE_SUPABASE_URL ?? nodeEnv?.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: viteEnv?.VITE_SUPABASE_ANON_KEY ?? nodeEnv?.VITE_SUPABASE_ANON_KEY
  };
}

export function getMissingSupabaseEnvKeys(env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): string[] {
  return requiredEnvKeys.filter((key) => !env[key]?.trim());
}

export function hasSupabaseConfig(env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): boolean {
  return getMissingSupabaseEnvKeys(env).length === 0;
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
