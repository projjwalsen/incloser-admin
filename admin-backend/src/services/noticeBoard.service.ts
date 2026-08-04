import type { CmsNoticeBoardItem } from "@incloser/shared-types";
import { randomUUID } from "node:crypto";
import { deleteCmsMedia, uploadCmsMedia } from "../lib/cmsMediaStorage.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const TABLE_SETUP =
  "Notice board table is missing: run `supabase/cms_female_home.sql` in the Supabase SQL editor, then reload.";

type NoticeRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  image_path: string | null;
  accent: string;
  action_key: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

function mapRow(row: NoticeRecord): CmsNoticeBoardItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.image_url,
    accent: row.accent,
    actionKey: row.action_key,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

const SELECT_COLS =
  "id,title,subtitle,image_url,image_path,accent,action_key,sort_order,is_active,created_at,updated_at";

export type CreateNoticeInput = {
  image?: {
    bytes: Buffer;
    contentType: string;
    fileName: string;
  };
  title: string;
  subtitle: string | null;
  accent: string;
  actionKey: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateNoticeInput = {
  image?: {
    bytes: Buffer;
    contentType: string;
    fileName: string;
  };
  title?: string;
  subtitle?: string | null;
  accent?: string;
  actionKey?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export const noticeBoardService = {
  async list(): Promise<CmsNoticeBoardItem[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("female_notice_board_items")
      .select(SELECT_COLS)
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Notice board list failed: ${pgErrorText(error)}`);
    }
    return ((data ?? []) as NoticeRecord[]).map(mapRow);
  },

  async create(input: CreateNoticeInput): Promise<CmsNoticeBoardItem> {
    const supabase = getSupabaseAdminClient();
    const id = `ntc_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    if (input.image) {
      const ext = input.image.fileName.includes(".") ? input.image.fileName.split(".").pop() : "jpg";
      const uploaded = await uploadCmsMedia({
        bytes: input.image.bytes,
        contentType: input.image.contentType,
        objectKey: `notice-board/${id}.${ext}`,
      });
      imageUrl = uploaded.publicUrl;
      imagePath = uploaded.storagePath;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("female_notice_board_items")
      .insert({
        id,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        image_url: imageUrl,
        image_path: imagePath,
        accent: input.accent.trim() || "#DB2777",
        action_key: input.actionKey?.trim() || null,
        sort_order: input.sortOrder,
        is_active: input.isActive,
        created_at: now,
      })
      .select(SELECT_COLS)
      .single<NoticeRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Notice create failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async update(id: string, patch: UpdateNoticeInput): Promise<CmsNoticeBoardItem | null> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("female_notice_board_items")
      .select(SELECT_COLS)
      .eq("id", id)
      .maybeSingle<NoticeRecord>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(TABLE_SETUP);
      throw new Error(`Notice lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return null;

    let nextImageUrl = existing.image_url;
    let nextImagePath = existing.image_path;
    if (patch.image) {
      const ext = patch.image.fileName.includes(".") ? patch.image.fileName.split(".").pop() : "jpg";
      const uploaded = await uploadCmsMedia({
        bytes: patch.image.bytes,
        contentType: patch.image.contentType,
        objectKey: `notice-board/${id}.${ext}`,
      });
      nextImageUrl = uploaded.publicUrl;
      nextImagePath = uploaded.storagePath;
    }

    const { data, error } = await supabase
      .from("female_notice_board_items")
      .update({
        image_url: nextImageUrl,
        image_path: nextImagePath,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle?.trim() || null } : {}),
        ...(patch.accent !== undefined ? { accent: patch.accent.trim() || "#DB2777" } : {}),
        ...(patch.actionKey !== undefined ? { action_key: patch.actionKey?.trim() || null } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLS)
      .single<NoticeRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Notice update failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("female_notice_board_items")
      .select("id,image_path")
      .eq("id", id)
      .maybeSingle<{ id: string; image_path: string | null }>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(TABLE_SETUP);
      throw new Error(`Notice lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return false;

    const { error } = await supabase.from("female_notice_board_items").delete().eq("id", id);
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Notice delete failed: ${pgErrorText(error)}`);
    }
    if (existing.image_path) {
      await deleteCmsMedia(existing.image_path);
    }
    return true;
  },
};
