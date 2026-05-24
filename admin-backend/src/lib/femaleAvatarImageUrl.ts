import { getEnv } from "../config/env.js";

const BUCKET = "onboarding-avatars";

/** `female_profiles.avatar_id` values from mobile `FEMALE_AVATARS` → object key in `onboarding-avatars` bucket. */
const FEMALE_AVATAR_TO_OBJECT: Record<string, string> = {
  female_avatar_1: "F2.png", // app asset is female_profile.png; matches F2 in bucket
  female_avatar_2: "F2.png",
  female_avatar_3: "F3.png",
  female_avatar_4: "F4.png",
  female_avatar_5: "F5.png",
  female_avatar_6: "F6.png",
  female_avatar_7: "F7.png",
  female_avatar_8: "F8.png",
};

/** Optional `avatars_seed.sql` row ids → same bucket files. */
const SEED_ID_TO_OBJECT: Record<string, string> = {
  seed_f2: "F2.png",
  seed_f3: "F3.png",
  seed_f4: "F4.png",
  seed_f5: "F5.png",
  seed_f6: "F6.png",
  seed_f7: "F7.png",
  seed_f8: "F8.png",
  seed_m2: "M2.png",
  seed_m3: "M3.png",
  seed_m4: "M4.png",
  seed_m5: "M5.png",
  seed_m6: "M6.png",
  seed_m7: "M7.png",
  seed_m8: "M8.png",
};

/**
 * Public URL for the model's onboarding avatar image, or null to fall back to initials in the admin UI.
 */
export function resolveFemaleAvatarImageUrl(avatarId: string | null | undefined): string | null {
  const id = avatarId?.trim();
  if (!id) return null;
  if (/^https?:\/\//i.test(id)) return id;

  const objectName = FEMALE_AVATAR_TO_OBJECT[id] ?? SEED_ID_TO_OBJECT[id];
  if (!objectName) return null;

  const base = getEnv().SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectName}`;
}
