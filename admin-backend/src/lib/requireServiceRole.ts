import { getEnv } from "../config/env.js";

const SERVICE_ROLE_MESSAGE =
  "Server misconfiguration: set SUPABASE_SERVICE_ROLE_KEY in Vercel (or admin-backend/.env). " +
  "The anon/publishable key cannot access admin tables because of RLS.";

/** Admin tables (admin_users, agencies, …) require the Supabase service role key. */
export function assertServiceRoleAccess(feature = "this admin API"): void {
  if (getEnv().supabaseUsesAnonKey) {
    throw new Error(`${feature} requires ${SERVICE_ROLE_MESSAGE}`);
  }
}

export function missingAgencyTablesMessage(): string {
  return "Agency tables are missing in Supabase. Run supabase/agency_management.sql in the SQL Editor, then redeploy.";
}
