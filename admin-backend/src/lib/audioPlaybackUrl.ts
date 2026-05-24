import type { SupabaseClient } from "@supabase/supabase-js";

const AUDIO_VERIFICATIONS_BUCKET = "audio-verifications";

/**
 * Turn DB `audio_url` into a browser-playable URL.
 * - Full `http(s)` URLs are returned as-is (e.g. existing getPublicUrl from the app).
 * - Otherwise treated as a storage object path inside `audio-verifications` and expanded via getPublicUrl.
 */
export function resolveAudioPlaybackUrl(supabase: SupabaseClient, raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;

  const path = s.replace(new RegExp(`^${AUDIO_VERIFICATIONS_BUCKET}/`), "").replace(/^\//, "");
  if (!path) return null;

  const { data } = supabase.storage.from(AUDIO_VERIFICATIONS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
