/** Bucket for CMS thumbnails and notice-board images (create in Supabase dashboard). */
export const CMS_MEDIA_BUCKET = "cms-media";

import { getSupabaseAdminClient } from "./supabase.js";

type UploadInput = {
  bytes: Buffer;
  contentType: string;
  objectKey: string;
};

export async function uploadCmsMedia(input: UploadInput): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabaseAdminClient();
  const storagePath = input.objectKey;
  const { error: uploadError } = await supabase.storage.from(CMS_MEDIA_BUCKET).upload(storagePath, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  });
  if (uploadError) throw new Error(`CMS media upload failed: ${uploadError.message}`);
  const { data } = supabase.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export async function deleteCmsMedia(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(CMS_MEDIA_BUCKET).remove([storagePath]);
  if (error) throw new Error(`CMS media delete failed: ${error.message}`);
}
