import type { AvatarGenderType, AvatarItem } from "@incloser/shared-types";
import { randomUUID } from "node:crypto";
import { deleteAvatarImage, uploadAvatarImage } from "../lib/avatarStoragePlaceholder.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const AVATARS_TABLE_SETUP =
  "Avatars table is missing: run `supabase/avatars.sql` in the Supabase SQL editor, then reload.";

type CreateAvatarInput = {
  image: {
    bytes: Buffer;
    contentType: string;
    fileName: string;
  };
  genderType: AvatarGenderType;
  title: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateAvatarInput = {
  image?: {
    bytes: Buffer;
    contentType: string;
    fileName: string;
  };
  genderType?: AvatarGenderType;
  title?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type AvatarRecord = {
  id: string;
  image_url: string;
  image_path: string | null;
  gender_type: AvatarGenderType;
  title: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

function mapRow(row: AvatarRecord): AvatarItem {
  return {
    id: row.id,
    imageUrl: row.image_url,
    genderType: row.gender_type,
    title: row.title,
    category: row.category,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export const avatarsService = {
  async list(): Promise<AvatarItem[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("avatars")
      .select("id,image_url,image_path,gender_type,title,category,sort_order,is_active,created_at,updated_at")
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Avatar list query failed: ${pgErrorText(error)}`);
    }
    return ((data ?? []) as AvatarRecord[]).map(mapRow);
  },

  async create(input: CreateAvatarInput): Promise<AvatarItem> {
    const supabase = getSupabaseAdminClient();
    const id = `av_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const ext = input.image.fileName.includes(".") ? input.image.fileName.split(".").pop() : "png";
    const storageObject = `${id}.${ext}`;
    const uploaded = await uploadAvatarImage({
      bytes: input.image.bytes,
      contentType: input.image.contentType,
      objectKey: storageObject,
    });
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("avatars")
      .insert({
        id,
        image_url: uploaded.publicUrl,
        image_path: uploaded.storagePath,
        gender_type: input.genderType,
        title: input.title.trim(),
        category: input.category.trim(),
        sort_order: input.sortOrder,
        is_active: input.isActive,
        created_at: now,
      })
      .select("id,image_url,image_path,gender_type,title,category,sort_order,is_active,created_at,updated_at")
      .single<AvatarRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(AVATARS_TABLE_SETUP);
      throw new Error(`Avatar create failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async update(id: string, patch: UpdateAvatarInput): Promise<AvatarItem | null> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("avatars")
      .select("id,image_url,image_path,gender_type,title,category,sort_order,is_active,created_at,updated_at")
      .eq("id", id)
      .maybeSingle<AvatarRecord>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(AVATARS_TABLE_SETUP);
      throw new Error(`Avatar lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return null;

    let nextImageUrl = existing.image_url;
    let nextImagePath = existing.image_path;
    if (patch.image) {
      const ext = patch.image.fileName.includes(".") ? patch.image.fileName.split(".").pop() : "png";
      const storageObject = `${id}.${ext}`;
      const uploaded = await uploadAvatarImage({
        bytes: patch.image.bytes,
        contentType: patch.image.contentType,
        objectKey: storageObject,
      });
      nextImageUrl = uploaded.publicUrl;
      nextImagePath = uploaded.storagePath;
    }

    const { data, error } = await supabase
      .from("avatars")
      .update({
        image_url: nextImageUrl,
        image_path: nextImagePath,
        ...(patch.genderType !== undefined ? { gender_type: patch.genderType } : {}),
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.category !== undefined ? { category: patch.category.trim() } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,image_url,image_path,gender_type,title,category,sort_order,is_active,created_at,updated_at")
      .single<AvatarRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(AVATARS_TABLE_SETUP);
      throw new Error(`Avatar update failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("avatars")
      .select("id,image_path")
      .eq("id", id)
      .maybeSingle<{ id: string; image_path: string | null }>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(AVATARS_TABLE_SETUP);
      throw new Error(`Avatar lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return false;

    const { error } = await supabase.from("avatars").delete().eq("id", id);
    if (error) {
      if (isMissingRelationError(error)) throw new Error(AVATARS_TABLE_SETUP);
      throw new Error(`Avatar delete failed: ${pgErrorText(error)}`);
    }
    if (existing.image_path) {
      await deleteAvatarImage(existing.image_path);
    }
    return true;
  },
};
