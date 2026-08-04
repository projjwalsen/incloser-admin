"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Film, ImagePlus, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import type { CmsTutorialVideo } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import {
  createFemaleTutorial,
  deleteFemaleTutorial,
  fetchFemaleTutorials,
  updateFemaleTutorial,
} from "@/lib/female-tutorials-api";

type Draft = {
  id?: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  videoName: string;
};

function emptyDraft(): Draft {
  return { title: "", thumbnailUrl: "", videoUrl: "", videoName: "" };
}

export default function FemaleTutorialsPage() {
  const [rows, setRows] = useState<CmsTutorialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFemaleTutorials();
      setRows(data);
      setBanner(null);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Failed to load videos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const closeModal = () => {
    setModalOpen(false);
    setDraft(null);
    setThumbFile(null);
    setVideoFile(null);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const openCreate = () => {
    setDraft(emptyDraft());
    setModalOpen(true);
    setThumbFile(null);
    setVideoFile(null);
  };

  const openEdit = (row: CmsTutorialVideo) => {
    setDraft({
      id: row.id,
      title: row.title,
      thumbnailUrl: row.thumbnailUrl,
      videoUrl: row.videoUrl ?? "",
      videoName: row.videoUrl ? "Current video" : "",
    });
    setModalOpen(true);
    setThumbFile(null);
    setVideoFile(null);
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setBanner("Title is required.");
      return;
    }
    try {
      setSaving(true);
      if (draft.id) {
        await updateFemaleTutorial(draft.id, {
          thumbnail: thumbFile ?? undefined,
          video: videoFile ?? undefined,
          title: draft.title.trim(),
          videoUrl: videoFile ? undefined : draft.videoUrl.trim() || null,
          sortOrder: rows.findIndex((r) => r.id === draft.id) + 1,
        });
        setBanner("Video updated.");
      } else {
        if (!thumbFile) {
          setBanner("Thumbnail is required.");
          return;
        }
        if (!videoFile && !draft.videoUrl.trim()) {
          setBanner("Upload a video file or paste a video link.");
          return;
        }
        await createFemaleTutorial({
          thumbnail: thumbFile,
          video: videoFile ?? undefined,
          title: draft.title.trim(),
          videoUrl: videoFile ? undefined : draft.videoUrl.trim(),
          sortOrder: rows.length + 1,
        });
        setBanner("Video added.");
      }
      await reload();
      closeModal();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Remove this video?")) return;
    try {
      await deleteFemaleTutorial(id);
      setBanner("Video removed.");
      await reload();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="flex flex-col gap-4 rounded-[20px] border border-white/80 bg-white/85 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">CMS</p>
            <h1 className="text-heading-2 text-[var(--text-primary)]">Model tutorial videos</h1>
            <p className="text-body-sm text-[var(--text-muted)]">
              Update title, thumbnail, and video for the female home screen carousel.
            </p>
          </div>
          <PrimaryButton type="button" className="gap-2 px-4" onClick={openCreate}>
            <Plus className="size-4" />
            Add video
          </PrimaryButton>
        </div>

        {banner ? (
          <div className="rounded-[16px] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">
            {banner}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading videos…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#d1d5db] bg-white/70 p-10 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">No videos yet</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Click <strong>Add video</strong> to upload a thumbnail and video with a title.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="overflow-hidden rounded-[16px] border border-white/80 bg-white/90 shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-video bg-[#f3f4f6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="size-10 text-white" />
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="font-semibold text-[var(--text-primary)]">{row.title}</p>
                  <div className="flex gap-2">
                    <SecondaryButton type="button" className="flex-1 gap-1 text-xs" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </SecondaryButton>
                    <SecondaryButton type="button" className="gap-1 text-xs" onClick={() => void onDelete(row.id)}>
                      <Trash2 className="size-3.5" />
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalOpen && draft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[20px] border border-white/80 bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {draft.id ? "Edit video" : "Add video"}
                </h2>
                <button type="button" onClick={closeModal} className="rounded-full p-2 hover:bg-[#f3f4f6]">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Title</label>
                  <input
                    className="soft-input w-full"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="How to go online"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Thumbnail</label>
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d1d5db] bg-[#fafafa]"
                  >
                    {draft.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-sm text-[var(--text-muted)]">
                        <ImagePlus className="size-6" />
                        Upload thumbnail
                      </span>
                    )}
                  </button>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !draft) return;
                      setThumbFile(file);
                      setDraft({ ...draft, thumbnailUrl: URL.createObjectURL(file) });
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Video file</label>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d1d5db] bg-[#fafafa] px-4 py-6 text-sm text-[var(--text-muted)]"
                  >
                    <Film className="size-5" />
                    {videoFile?.name || draft.videoName || "Upload video (MP4)"}
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setVideoFile(file);
                      setDraft((d) => (d ? { ...d, videoName: file.name, videoUrl: "" } : d));
                    }}
                  />
                  <p className="mt-2 text-center text-xs text-[var(--text-muted)]">or paste a link below</p>
                  <input
                    className="soft-input mt-2 w-full"
                    value={draft.videoUrl}
                    onChange={(e) => {
                      setVideoFile(null);
                      setDraft({ ...draft, videoUrl: e.target.value, videoName: "" });
                    }}
                    placeholder="https://..."
                    disabled={!!videoFile}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <SecondaryButton type="button" onClick={closeModal}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" disabled={saving} onClick={() => void saveDraft()}>
                  {saving ? "Saving…" : "Save"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
