import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

/**
 * Keeps `users.is_active` + `users.is_onboarding_completed` aligned with model verification:
 * - **Activated** only when profile (`female_profiles.verification_status`) is `approved` AND
 *   the latest `audio_verifications` row for this model is `approved`.
 * - **Deactivated / not onboarded** for any other combo, or when profile or audio is `rejected`.
 *
 * Call after profile/audio approve, reject, or resubmit (audio back to pending).
 */
export async function syncModelUserAccountFromFemaleProfileId(femaleProfileId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("female_profiles")
    .select("user_id, verification_status")
    .eq("id", femaleProfileId)
    .maybeSingle<{ user_id: string | null; verification_status: string | null }>();
  if (profileError || !profile?.user_id) return;

  const userId = profile.user_id;
  const vs = profile.verification_status;

  let latestAudioStatus: string | null = null;
  const { data: audioRows, error: audioError } = await supabase
    .from("audio_verifications")
    .select("status")
    .eq("model_id", femaleProfileId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (audioError) {
    if (!isMissingRelationError(audioError)) {
      console.warn("[model-account-sync] audio_verifications read:", pgErrorText(audioError));
    }
  } else {
    latestAudioStatus = (audioRows?.[0] as { status?: string } | undefined)?.status ?? null;
  }

  const profileRejected = vs === "rejected";
  const audioRejected = latestAudioStatus === "rejected";
  const profileApproved = vs === "approved";
  const audioApproved = latestAudioStatus === "approved";

  if (profileRejected || audioRejected) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false, is_onboarding_completed: false })
      .eq("id", userId);
    if (error) console.warn("[model-account-sync] user deactivate:", error.message);
    return;
  }

  if (profileApproved && audioApproved) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: true, is_onboarding_completed: true })
      .eq("id", userId);
    if (error) console.warn("[model-account-sync] user activate:", error.message);
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ is_active: false, is_onboarding_completed: false })
    .eq("id", userId);
  if (error) console.warn("[model-account-sync] user pending:", error.message);
}

export async function syncModelUserAccountFromAudioVerificationId(audioVerificationId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("audio_verifications")
    .select("model_id")
    .eq("id", audioVerificationId)
    .maybeSingle<{ model_id: string | null }>();
  if (error || !row?.model_id) return;
  await syncModelUserAccountFromFemaleProfileId(row.model_id);
}
