import type { CmsTutorialVideo } from "@incloser/shared-types";
import { randomUUID } from "node:crypto";
import { deleteCmsMedia, uploadCmsMedia } from "../lib/cmsMediaStorage.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const TABLE_SETUP =
  "Tutorial table is missing: run `supabase/cms_female_home.sql` in the Supabase SQL editor, then reload.";

type MediaFile = {
  bytes: Buffer;
  contentType: string;
  fileName: string;
};

type TutorialRecord = {
  id: string;
  title: string;
  thumbnail_url: string;
  thumbnail_path: string | null;
  video_url: string | null;
  video_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

function mapRow(row: TutorialRecord): CmsTutorialVideo {
  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    videoUrl: row.video_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

const SELECT_COLS =
  "id,title,thumbnail_url,thumbnail_path,video_url,video_path,sort_order,is_active,created_at,updated_at";

async function uploadVideo(id: string, file: MediaFile) {
  const ext = file.fileName.includes(".") ? file.fileName.split(".").pop() : "mp4";
  return uploadCmsMedia({
    bytes: file.bytes,
    contentType: file.contentType,
    objectKey: `tutorials/${id}/video.${ext}`,
  });
}

export type CreateTutorialInput = {
  thumbnail: MediaFile;
  video?: MediaFile;
  title: string;
  videoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateTutorialInput = {
  thumbnail?: MediaFile;
  video?: MediaFile;
  title?: string;
  videoUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export const femaleTutorialsService = {
  async list(): Promise<CmsTutorialVideo[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("female_tutorial_videos")
      .select(SELECT_COLS)
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Tutorial list failed: ${pgErrorText(error)}`);
    }
    return ((data ?? []) as TutorialRecord[]).map(mapRow);
  },

  async create(input: CreateTutorialInput): Promise<CmsTutorialVideo> {
    const supabase = getSupabaseAdminClient();
    const id = `tut_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const thumbExt = input.thumbnail.fileName.includes(".")
      ? input.thumbnail.fileName.split(".").pop()
      : "jpg";
    const uploadedThumb = await uploadCmsMedia({
      bytes: input.thumbnail.bytes,
      contentType: input.thumbnail.contentType,
      objectKey: `tutorials/${id}/thumb.${thumbExt}`,
    });

    let videoUrl = input.videoUrl?.trim() || null;
    let videoPath: string | null = null;
    if (input.video) {
      const uploadedVideo = await uploadVideo(id, input.video);
      videoUrl = uploadedVideo.publicUrl;
      videoPath = uploadedVideo.storagePath;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("female_tutorial_videos")
      .insert({
        id,
        title: input.title.trim(),
        thumbnail_url: uploadedThumb.publicUrl,
        thumbnail_path: uploadedThumb.storagePath,
        video_url: videoUrl,
        video_path: videoPath,
        sort_order: input.sortOrder,
        is_active: input.isActive,
        created_at: now,
      })
      .select(SELECT_COLS)
      .single<TutorialRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Tutorial create failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async update(id: string, patch: UpdateTutorialInput): Promise<CmsTutorialVideo | null> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("female_tutorial_videos")
      .select(SELECT_COLS)
      .eq("id", id)
      .maybeSingle<TutorialRecord>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(TABLE_SETUP);
      throw new Error(`Tutorial lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return null;

    let nextThumbUrl = existing.thumbnail_url;
    let nextThumbPath = existing.thumbnail_path;
    if (patch.thumbnail) {
      const ext = patch.thumbnail.fileName.includes(".") ? patch.thumbnail.fileName.split(".").pop() : "jpg";
      const uploaded = await uploadCmsMedia({
        bytes: patch.thumbnail.bytes,
        contentType: patch.thumbnail.contentType,
        objectKey: `tutorials/${id}/thumb.${ext}`,
      });
      nextThumbUrl = uploaded.publicUrl;
      nextThumbPath = uploaded.storagePath;
    }

    let nextVideoUrl = existing.video_url;
    let nextVideoPath = existing.video_path;
    if (patch.video) {
      const uploaded = await uploadVideo(id, patch.video);
      nextVideoUrl = uploaded.publicUrl;
      nextVideoPath = uploaded.storagePath;
    } else if (patch.videoUrl !== undefined) {
      nextVideoUrl = patch.videoUrl?.trim() || null;
      if (!patch.videoUrl?.trim()) {
        nextVideoPath = null;
      }
    }

    const { data, error } = await supabase
      .from("female_tutorial_videos")
      .update({
        thumbnail_url: nextThumbUrl,
        thumbnail_path: nextThumbPath,
        video_url: nextVideoUrl,
        video_path: nextVideoPath,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLS)
      .single<TutorialRecord>();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Tutorial update failed: ${pgErrorText(error)}`);
    }
    return mapRow(data);
  },

  async remove(id: string): Promise<boolean> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("female_tutorial_videos")
      .select("id,thumbnail_path,video_path")
      .eq("id", id)
      .maybeSingle<{ id: string; thumbnail_path: string | null; video_path: string | null }>();
    if (existingError) {
      if (isMissingRelationError(existingError)) throw new Error(TABLE_SETUP);
      throw new Error(`Tutorial lookup failed: ${pgErrorText(existingError)}`);
    }
    if (!existing) return false;

    const { error } = await supabase.from("female_tutorial_videos").delete().eq("id", id);
    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Tutorial delete failed: ${pgErrorText(error)}`);
    }
    if (existing.thumbnail_path) await deleteCmsMedia(existing.thumbnail_path);
    if (existing.video_path) await deleteCmsMedia(existing.video_path);
    return true;
  },
};
