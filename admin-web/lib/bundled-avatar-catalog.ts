import type { AvatarGenderType, AvatarItem } from "@incloser/shared-types";

const STAMP = "2026-01-01T00:00:00.000Z";

function row(
  id: string,
  file: string,
  genderType: AvatarGenderType,
  title: string,
  sortOrder: number,
): AvatarItem {
  return {
    id: `bundled_${id}`,
    imageUrl: `/onboarding-avatars/${file}.png`,
    genderType,
    title,
    category: "Mobile default",
    sortOrder,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

/**
 * Shown in CMS when Supabase `avatars` is empty so operators see the same art as the mobile app (`assets/images` F* / M*).
 * Rows are read-only until persisted via Upload after running `supabase/avatars.sql`.
 */
export const BUNDLED_AVATAR_CATALOG: AvatarItem[] = [
  row("F2", "F2", "female", "Female F2", 10),
  row("F3", "F3", "female", "Female F3", 20),
  row("F4", "F4", "female", "Female F4", 30),
  row("F5", "F5", "female", "Female F5", 40),
  row("F6", "F6", "female", "Female F6", 50),
  row("F7", "F7", "female", "Female F7", 60),
  row("F8", "F8", "female", "Female F8", 70),
  row("M2", "M2", "male", "Male M2", 110),
  row("M3", "M3", "male", "Male M3", 120),
  row("M4", "M4", "male", "Male M4", 130),
  row("M5", "M5", "male", "Male M5", 140),
  row("M6", "M6", "male", "Male M6", 150),
  row("M7", "M7", "male", "Male M7", 160),
  row("M8", "M8", "male", "Male M8", 170),
];

export function isBundledAvatarId(id: string): boolean {
  return id.startsWith("bundled_");
}
