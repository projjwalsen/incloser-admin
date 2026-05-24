import type { PostgrestError } from "@supabase/supabase-js";

export function pgErrorText(error: PostgrestError | null | undefined): string {
  if (!error) return "";
  const parts = [error.message, error.details, error.hint, error.code].filter(Boolean);
  if (parts.length > 0) return parts.join(" | ");
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isLikelySupabaseInfraFailure(error: PostgrestError | null | undefined): boolean {
  const t = pgErrorText(error);
  return /fetch failed|getaddrinfo|ENOTFOUND|ECONNREFUSED|ECONNRESET|certificate|SSL|network|socket hang up|timeout/i.test(t);
}

/** Table/view not exposed or never created (PostgREST schema cache). */
export function isMissingRelationError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const m = pgErrorText(error);
  return /Could not find the table|schema cache|relation\s+["']?[\w.]+\s+does not exist/i.test(m);
}
