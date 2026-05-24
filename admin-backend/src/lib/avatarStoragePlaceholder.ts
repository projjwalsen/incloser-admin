/** Bucket name reserved for onboarding avatars (create in Supabase dashboard). */
export const AVATAR_STORAGE_BUCKET = "onboarding-avatars";

import { getSupabaseAdminClient } from "./supabase.js";

type UploadInput = {
  bytes: Buffer;
  contentType: string;
  objectKey: string;
};

export async function uploadAvatarImage(input: UploadInput): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabaseAdminClient();
  const storagePath = input.objectKey;
  const { error: uploadError } = await supabase.storage.from(AVATAR_STORAGE_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  });
  if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
  const { data } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export async function deleteAvatarImage(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(AVATAR_STORAGE_BUCKET).remove([storagePath]);
  if (error) throw new Error(`Avatar delete failed: ${error.message}`);
}
