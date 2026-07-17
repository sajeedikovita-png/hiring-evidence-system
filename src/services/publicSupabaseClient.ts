/**
 * Public Supabase auth client.
 *
 * Uses the PUBLIC anon key (safe to expose) and is independent of the app's
 * seed/supabase mode, so the internal demo keeps working with no login while the
 * public sign-up / set-password / admin-approval area uses real Supabase auth.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

type PublicEnv = { VITE_PUBLIC_SUPABASE_URL?: string; VITE_PUBLIC_SUPABASE_ANON_KEY?: string };

function readPublicEnv(): PublicEnv {
  return ((import.meta as unknown as { env?: PublicEnv }).env ?? {}) as PublicEnv;
}

export function isPublicSupabaseConfigured(): boolean {
  const env = readPublicEnv();
  return Boolean(env.VITE_PUBLIC_SUPABASE_URL?.trim() && env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

export function getPublicSupabaseClient(): SupabaseClient | undefined {
  const env = readPublicEnv();
  const url = env.VITE_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return undefined;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }

  return cachedClient;
}
