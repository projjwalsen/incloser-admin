import { getEnv } from "../config/env.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

export const supabaseHealthService = {
  async ping() {
    const supabase = getSupabaseAdminClient();
    // Intentionally lightweight: validates credentials + network reachability.
    // If this fails in local dev, it usually means placeholder env vars.
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    return { ok: !error, error: error?.message ?? null };
  },

  async adminSetup() {
    const env = getEnv();
    const supabase = getSupabaseAdminClient();

    const agenciesProbe = await supabase.from("agencies").select("id", { count: "exact", head: true });
    const adminUsersProbe = await supabase.from("admin_users").select("id", { count: "exact", head: true });

    return {
      supabaseUsesAnonKey: env.supabaseUsesAnonKey,
      agenciesTableReady: !env.supabaseUsesAnonKey && !agenciesProbe.error,
      agenciesCount: agenciesProbe.count ?? 0,
      adminUsersTableReady: !env.supabaseUsesAnonKey && !adminUsersProbe.error,
      adminUsersCount: adminUsersProbe.count ?? 0,
      agenciesError: agenciesProbe.error ? agenciesProbe.error.message : null,
      adminUsersError: adminUsersProbe.error ? adminUsersProbe.error.message : null,
    };
  },
};
