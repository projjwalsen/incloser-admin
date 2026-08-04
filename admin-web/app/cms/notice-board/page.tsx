"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import type { CmsNoticeBoardItem } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import {
  createNoticeBoardItem,
  deleteNoticeBoardItem,
  fetchNoticeBoardItems,
  updateNoticeBoardItem,
} from "@/lib/notice-board-api";

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  accent: string;
  actionKey: string;
  sortOrder: number;
  isActive: boolean;
};

function emptyDraft(sortOrder: number): Draft {
  return {
    title: "",
    subtitle: "",
    imageUrl: "",
    accent: "#DB2777",
    actionKey: "",
    sortOrder,
    isActive: true,
  };
}

export default function NoticeBoardPage() {
  const [rows, setRows] = useState<CmsNoticeBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNoticeBoardItems();
      setRows(data);
      setBanner(null);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Failed to load notice board");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.subtitle ?? ""} ${r.id}`.toLowerCase().includes(q));
  }, [rows, query]);

  const closeModal = () => {
    setModalOpen(false);
    setDraft(null);
    setPickedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreate = () => {
    setDraft(emptyDraft(rows.length + 1));
    setModalOpen(true);
  };

  const openEdit = (row: CmsNoticeBoardItem) => {
    setDraft({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? "",
      imageUrl: row.imageUrl ?? "",
      accent: row.accent,
      actionKey: row.actionKey ?? "",
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setModalOpen(true);
    setPickedFile(null);
    setFilePreview(null);
  };

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
    if (!draft?.title.trim()) {
      setBanner("Title is required.");
      return;
    }
    try {
      setSaving(true);
      if (draft.id) {
        await updateNoticeBoardItem(draft.id, {
          image: pickedFile ?? undefined,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim() || null,
          accent: draft.accent,
          actionKey: draft.actionKey.trim() || null,
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
        setBanner("Notice updated.");
      } else {
        await createNoticeBoardItem({
          image: pickedFile ?? undefined,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim() || undefined,
          accent: draft.accent,
          actionKey: draft.actionKey.trim() || undefined,
          sortOrder: draft.sortOrder,
          isActive: draft.isActive,
        });
        setBanner("Notice created.");
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
    if (!window.confirm("Delete this notice card?")) return;
    try {
      await deleteNoticeBoardItem(id);
      setBanner("Notice deleted.");
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
            <h1 className="text-heading-2 text-[var(--text-primary)]">Notice board</h1>
            <p className="text-body-sm text-[var(--text-muted)]">
              Horizontal promo cards on the female model home screen (rank, safety tips, etc.).
            </p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-3 md:flex-row md:items-center">
            <input
              className="soft-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or id..."
            />
            <PrimaryButton type="button" className="gap-2 px-4" onClick={openCreate}>
              <Plus className="size-4" />
              New notice
            </PrimaryButton>
          </div>
        </div>

        {banner ? (
          <div className="rounded-[16px] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">
            {banner}
          </div>
        ) : null}

        <TableShell title="Notice cards" subtitle="Tap actions in app can use action key (rank, safe, etc.)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="px-5 py-4 font-semibold">Image</th>
                  <th className="px-5 py-4 font-semibold">Title</th>
                  <th className="px-5 py-4 font-semibold">Subtitle</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                  <th className="px-5 py-4 font-semibold">Order</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)]">
                      Loading notices…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)]">
                      No notice cards yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-5 py-4">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.imageUrl} alt="" className="h-12 w-20 rounded-lg object-cover" />
                        ) : (
                          <div
                            className="flex h-12 w-20 items-center justify-center rounded-lg text-xs text-white"
                            style={{ backgroundColor: row.accent }}
                          >
                            No img
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-[var(--text-primary)]">{row.title}</td>
                      <td className="px-5 py-4 text-[var(--text-muted)]">{row.subtitle || "—"}</td>
                      <td className="px-5 py-4 text-[var(--text-muted)]">{row.actionKey || "—"}</td>
                      <td className="px-5 py-4">{row.sortOrder}</td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          variant={row.isActive ? "success" : "info"}
                          label={row.isActive ? "Active" : "Hidden"}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <SecondaryButton type="button" className="gap-1 px-3 py-1.5 text-xs" onClick={() => openEdit(row)}>
                            <Pencil className="size-3.5" />
                            Edit
                          </SecondaryButton>
                          <SecondaryButton type="button" className="gap-1 px-3 py-1.5 text-xs" onClick={() => void onDelete(row.id)}>
                            <Trash2 className="size-3.5" />
                            Delete
                          </SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TableShell>

        {modalOpen && draft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] border border-white/80 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-heading-2 text-[var(--text-primary)]">
                  {draft.id ? "Edit notice" : "New notice"}
                </h2>
                <button type="button" onClick={closeModal} className="rounded-full p-2 hover:bg-[#f3f4f6]">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Banner image (optional)</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d1d5db] bg-[#fafafa]"
                  >
                    {draft.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <ImagePlus className="size-5" />
                        Upload image
                      </span>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Title</label>
                  <input className="soft-input w-full" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Subtitle</label>
                  <input className="soft-input w-full" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Accent color</label>
                    <input className="soft-input w-full" value={draft.accent} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Action key</label>
                    <input
                      className="soft-input w-full"
                      value={draft.actionKey}
                      onChange={(e) => setDraft({ ...draft, actionKey: e.target.value })}
                      placeholder="rank, safe, ..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Sort order</label>
                    <input
                      className="soft-input w-full"
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                      Active
                    </label>
                  </div>
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
