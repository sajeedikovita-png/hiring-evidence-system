import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadSupabaseConfig, type SupabaseRuntimeEnv } from "./supabaseConfig";

export function createHiringSupabaseClient(env?: SupabaseRuntimeEnv): SupabaseClient {
  const config = loadSupabaseConfig(env);

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}
