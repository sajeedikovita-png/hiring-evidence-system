import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadSupabaseConfig, type SupabaseRuntimeEnv } from "./supabaseConfig";

let browserSupabaseClient: SupabaseClient | undefined;
let browserSupabaseClientKey = "";

export function createHiringSupabaseClient(env?: SupabaseRuntimeEnv): SupabaseClient {
  const config = loadSupabaseConfig(env);
  const clientKey = `${config.url}|${config.anonKey}`;

  if (!env && browserSupabaseClient && browserSupabaseClientKey === clientKey) {
    return browserSupabaseClient;
  }

  const client = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  if (!env) {
    browserSupabaseClient = client;
    browserSupabaseClientKey = clientKey;
  }

  return client;
}
