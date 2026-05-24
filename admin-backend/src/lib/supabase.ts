import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  const env = getEnv();
  if (env.supabaseUsesAnonKey) {
    console.warn(
      "[supabase] Using SUPABASE_ANON_KEY (same project as the Expo app). For full admin access, set SUPABASE_SERVICE_ROLE_KEY from the Supabase dashboard.",
    );
  }
  cached = createClient(env.SUPABASE_URL, env.supabaseServerKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
