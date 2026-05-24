import { getSupabaseAdminClient } from "../lib/supabase.js";

export const supabaseHealthService = {
  async ping() {
    const supabase = getSupabaseAdminClient();
    // Intentionally lightweight: validates credentials + network reachability.
    // If this fails in local dev, it usually means placeholder env vars.
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    return { ok: !error, error: error?.message ?? null };
  },
};
