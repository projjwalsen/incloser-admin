"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CircleUserRound,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AvatarGenderType, AvatarItem } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { BUNDLED_AVATAR_CATALOG, isBundledAvatarId } from "@/lib/bundled-avatar-catalog";
import { createAvatar, deleteAvatar, fetchAvatars, updateAvatar } from "@/lib/avatars-api";
import { cn } from "@/lib/cn";

type DraftAvatar = {
  id?: string;
  imageUrl: string;
  title: string;
  genderType: AvatarGenderType;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function emptyDraft(): DraftAvatar {
  return {
    imageUrl: "",
    title: "",
    genderType: "female",
    category: "Lifestyle",
    sortOrder: 100,
    isActive: true,
  };
}

export default function AvatarManagementPage() {
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | AvatarGenderType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [drawerMode, setDrawerMode] = useState<"closed" | "upload" | "edit">("closed");
  const [draft, setDraft] = useState<DraftAvatar | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  /** When true, grid shows mobile default PNGs from `public/onboarding-avatars` (no Supabase rows yet). */
  const [usingBundledFallback, setUsingBundledFallback] = useState(false);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AvatarItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return avatars
      .filter((a) => {
        if (genderFilter !== "all" && a.genderType !== genderFilter) return false;
        if (statusFilter === "active" && !a.isActive) return false;
        if (statusFilter === "inactive" && a.isActive) return false;
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [avatars, genderFilter, statusFilter]);

  const closeDrawer = useCallback(() => {
    setDrawerMode("closed");
    setDraft(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setPickedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [filePreview]);

  const openUpload = useCallback(() => {
    setDraft(emptyDraft());
    setDrawerMode("upload");
    setBanner(null);
    setMenuForId(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setPickedFile(null);
  }, [filePreview]);

  const openEdit = (a: AvatarItem) => {
    setDraft({
      id: a.id,
      imageUrl: a.imageUrl,
      title: a.title,
      genderType: a.genderType,
      category: a.category,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
    });
    setDrawerMode("edit");
    setBanner(null);
    setMenuForId(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setPickedFile(null);
  };

  const reloadAvatars = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAvatars();
      setBanner(null);
      if (data.length === 0) {
        setAvatars(BUNDLED_AVATAR_CATALOG);
        setUsingBundledFallback(true);
      } else {
        setAvatars(data);
        setUsingBundledFallback(false);
      }
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Failed to load avatars.");
      setAvatars([]);
      setUsingBundledFallback(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    if (filePreview) URL.revokeObjectURL(filePreview);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    setPickedFile(file);
    setDraft({ ...draft, imageUrl: url });
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setBanner("Title is required.");
      return;
    }
    if (!draft.imageUrl.trim()) {
      setBanner("Add an image.");
      return;
    }
    if (!draft.category.trim()) {
      setBanner("Category / style is required.");
      return;
    }
    try {
      setSaving(true);
      if (draft.id) {
        await updateAvatar(draft.id, {
          image: pickedFile ?? undefined,
          title: draft.title.trim(),
          genderType: draft.genderType,
          category: draft.category.trim(),
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
        await reloadAvatars();
        setBanner("Avatar updated.");
      } else {
        if (!pickedFile) {
          setBanner("Choose an image file to upload.");
          return;
        }
        await createAvatar({
          image: pickedFile,
          title: draft.title.trim(),
          genderType: draft.genderType,
          category: draft.category.trim(),
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
        await reloadAvatars();
        setBanner("Avatar created.");
      }
      closeDrawer();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Failed to save avatar.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await deleteAvatar(deleteTarget.id);
      await reloadAvatars();
      setBanner(`${deleteTarget.title} archived.`);
      setDeleteTarget(null);
      setMenuForId(null);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Failed to archive avatar.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!menuForId) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuForId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuForId]);

  useEffect(() => {
    const onOpenUpload = () => openUpload();
    window.addEventListener("cms-avatars:open-upload", onOpenUpload);
    return () => window.removeEventListener("cms-avatars:open-upload", onOpenUpload);
  }, [openUpload]);

  useEffect(() => {
    void reloadAvatars();
  }, [reloadAvatars]);

  const showFilterEmpty = !loading && avatars.length > 0 && filtered.length === 0;
  const showLibraryEmpty = !loading && avatars.length === 0;

  return (
    <AdminShell>
      <PageContainer>
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-white/70 bg-white/70 p-4 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <SlidersHorizontal className="size-3.5" />
              Gender
            </span>
            {(["all", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  genderFilter === g
                    ? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[#e4ecff]",
                )}
              >
                {g === "all" ? "All" : g === "male" ? "Male" : "Female"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[#eef2ff] pt-3 md:border-t-0 md:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</span>
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  statusFilter === s
                    ? "bg-[#f0e9ff] text-[#6b4bcf] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[#ede9ff]",
                )}
              >
                {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </div>

        {banner ? (
          <div className="rounded-[var(--radius-md)] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">{banner}</div>
        ) : null}
        {usingBundledFallback ? (
          <div className="rounded-[var(--radius-md)] border border-[#e4d9ff] bg-[#faf8ff] px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
            Showing the same <span className="font-semibold text-[var(--text-primary)]">F2–F8</span> and{" "}
            <span className="font-semibold text-[var(--text-primary)]">M2–M8</span> assets as the mobile app (read-only here). To manage them in
            the database, run <code className="rounded bg-white px-1 py-0.5 text-xs">supabase/avatars.sql</code> in Supabase, then use{" "}
            <span className="font-semibold">Upload</span> to persist copies to storage.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <div className="col-span-full rounded-[var(--radius-md)] border border-[#e8edff] bg-white/80 px-4 py-5 text-sm font-semibold text-[var(--text-secondary)]">
              Loading avatars...
            </div>
          ) : null}
          {filtered.map((a) => (
            <article
              key={a.id}
              className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/90 bg-white/95 shadow-[var(--shadow-soft)] ring-1 ring-black/[0.02] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
            >
              <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden bg-[var(--surface-subtle)] py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imageUrl} alt="" className="size-24 rounded-full object-cover ring-4 ring-white/95 shadow-[var(--shadow-soft)]" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm",
                      a.genderType === "male"
                        ? "bg-sky-100/95 text-sky-900 ring-1 ring-sky-200/80"
                        : "bg-rose-100/95 text-rose-900 ring-1 ring-rose-200/80",
                    )}
                  >
                    {a.genderType === "male" ? "Male" : "Female"}
                  </span>
                  <span className="rounded-full bg-violet-100/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-900 shadow-sm ring-1 ring-violet-200/80">
                    {a.category}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold text-[var(--text-primary)]">{a.title}</p>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] shadow-sm">
                    #{a.sortOrder}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[#eef2ff] px-4 py-3">
                <div className="flex flex-col gap-1">
                  <StatusBadge label={a.isActive ? "Active" : "Inactive"} variant={a.isActive ? "success" : "warning"} />
                  <p className="text-[11px] text-[var(--text-muted)]">Updated {formatShortDate(a.updatedAt)}</p>
                </div>
                <div className="relative" ref={menuForId === a.id ? menuRef : undefined}>
                  {isBundledAvatarId(a.id) ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Bundled</span>
                  ) : (
                    <>
                      <SecondaryButton
                        type="button"
                        className="h-10 w-10 rounded-full p-0"
                        aria-label="Avatar actions"
                        onClick={() => setMenuForId((id) => (id === a.id ? null : a.id))}
                      >
                        <MoreHorizontal className="size-4" />
                      </SecondaryButton>
                      {menuForId === a.id ? (
                        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-[14px] border border-[#e8edff] bg-white py-1 shadow-[var(--shadow-shell)]">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                            onClick={() => {
                              openEdit(a);
                            }}
                          >
                            <Pencil className="size-4 text-[var(--primary)]" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)]"
                            onClick={() => {
                              setDeleteTarget(a);
                              setMenuForId(null);
                            }}
                          >
                            <Archive className="size-4" />
                            Archive
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {showFilterEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[#d9e4ff] bg-white/60 py-16 text-center">
            <CircleUserRound className="size-10 text-[var(--text-muted)]" />
            <p className="text-body font-medium text-[var(--text-secondary)]">No avatars match your filters.</p>
            <SecondaryButton type="button" onClick={() => (setGenderFilter("all"), setStatusFilter("all"))}>
              Reset filters
            </SecondaryButton>
          </div>
        ) : null}
        {showLibraryEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[#f1c2c9] bg-[var(--status-danger-bg)]/40 py-16 text-center">
            <CircleUserRound className="size-10 text-[var(--status-danger-text)]" />
            <p className="text-body font-medium text-[var(--status-danger-text)]">No avatars could be loaded.</p>
            <p className="max-w-md text-sm text-[var(--text-secondary)]">Check that admin-backend is running and you are logged in. See the banner above for details.</p>
          </div>
        ) : null}
      </PageContainer>

      {drawerMode !== "closed" && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:p-4 md:items-center">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/80 bg-white shadow-[var(--shadow-shell)] sm:max-h-[90vh] sm:rounded-[24px]">
            <div className="flex items-start justify-between gap-3 border-b border-[#eef2ff] px-5 py-4">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">{drawerMode === "upload" ? "Upload avatar" : "Edit avatar"}</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Changes upload through the admin API to Supabase Storage.</p>
              </div>
              <SecondaryButton type="button" className="h-10 w-10 shrink-0 rounded-full p-0" onClick={closeDrawer} aria-label="Close">
                <X className="size-4" />
              </SecondaryButton>
            </div>

            <div className="soft-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Image</label>
                <div
                  className={cn(
                    "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed border-[#c9d8ff] bg-[var(--surface-muted)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/40",
                    filePreview || draft.imageUrl ? "border-solid border-[#d9e4ff]" : "",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.imageUrl} alt="" className="max-h-44 w-full rounded-[var(--radius-sm)] object-contain" />
                  ) : (
                    <>
                      <ImagePlus className="size-10 text-[var(--primary)]" />
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Drop or click to upload</p>
                      <p className="text-xs text-[var(--text-muted)]">PNG or JPG · preview only in browser</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Title</label>
                <input
                  className="soft-input"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Friendly name shown in picker"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Gender type</label>
                <div className="flex gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setDraft({ ...draft, genderType: g })}
                      className={cn(
                        "flex-1 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm font-semibold transition",
                        draft.genderType === g
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[#e8edff] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                      )}
                    >
                      {g === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Category / style</label>
                <input
                  className="soft-input"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="e.g. Lifestyle, Editorial"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Sort order</label>
                <input
                  className="soft-input"
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[#e8edff] bg-[var(--surface-muted)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Active</p>
                  <p className="text-xs text-[var(--text-muted)]">Inactive avatars stay hidden from onboarding.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isActive}
                  onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
                  className={cn(
                    "relative h-8 w-14 shrink-0 rounded-full transition",
                    draft.isActive ? "bg-[var(--primary)]" : "bg-[#cfd6e8]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 size-6 rounded-full bg-white shadow transition",
                      draft.isActive ? "left-7" : "left-1",
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#eef2ff] p-4">
              <PrimaryButton type="button" className="flex-1" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </PrimaryButton>
              <SecondaryButton type="button" className="flex-1" onClick={closeDrawer}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[22px] border border-white/90 bg-white p-6 shadow-[var(--shadow-shell)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Archive this avatar?</h3>
            <p className="mt-2 text-body-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{deleteTarget.title}</span> will be removed from the library and the stored image deleted via the admin API.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-w-[120px] items-center justify-center rounded-[14px] bg-[var(--status-danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--status-danger-text)] shadow-sm transition hover:opacity-90"
                onClick={confirmDelete}
              >
                {saving ? "Archiving..." : "Archive"}
              </button>
              <SecondaryButton type="button" className="min-w-[120px]" onClick={() => setDeleteTarget(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
