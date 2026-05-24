"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Pencil, Plus, X } from "lucide-react";
import type { CmsBanner } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { fetchCmsBanners } from "@/lib/cms-api";

type BannerRow = CmsBanner & { updatedAt: string };

type DraftBanner = Omit<BannerRow, "id" | "updatedAt"> & { id?: string };

export default function CmsBannersPage() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftBanner | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchCmsBanners();
          setBanners(
            data.map((b) => ({
              ...b,
              updatedAt: "—",
            })),
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load banners");
          setBanners([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return banners;
    return banners.filter((b) => `${b.title} ${b.id}`.toLowerCase().includes(q));
  }, [banners, query]);

  const openCreate = () => {
    setDraft({ title: "", imageUrl: "", priority: banners.length + 1, isActive: true });
    setModalOpen(true);
    setBanner(null);
  };

  const openEdit = (b: BannerRow) => {
    setDraft({ id: b.id, title: b.title, imageUrl: b.imageUrl, priority: b.priority, isActive: b.isActive });
    setModalOpen(true);
    setBanner(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setDraft(null);
  };

  const saveDraft = () => {
    if (!draft?.title.trim() || !draft.imageUrl.trim()) {
      setBanner("Title and image URL are required.");
      return;
    }
    // TODO: Wire POST/PATCH /api/admin/cms/banners when write endpoints exist; until then changes stay client-side only.
    const now = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    if (draft.id) {
      setBanners((prev) =>
        prev.map((b) => (b.id === draft.id ? { ...b, title: draft.title, imageUrl: draft.imageUrl, priority: draft.priority, isActive: draft.isActive, updatedAt: now } : b)),
      );
      setBanner(`${draft.id} updated locally (not persisted).`);
    } else {
      const id = `b_${Math.random().toString(16).slice(2, 8)}`;
      setBanners((prev) => [{ id, title: draft.title, imageUrl: draft.imageUrl, priority: draft.priority, isActive: draft.isActive, updatedAt: now }, ...prev]);
      setBanner(`${id} created locally (not persisted).`);
    }
    closeModal();
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="flex flex-col gap-4 rounded-[20px] border border-white/80 bg-white/85 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">CMS</p>
            <h1 className="text-heading-2 text-[var(--text-primary)]">Banners</h1>
            <p className="text-body-sm text-[var(--text-muted)]">Curate homepage and in-app promotional surfaces.</p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-3 md:flex-row md:items-center">
            <input className="soft-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search banner title or id..." />
            <PrimaryButton type="button" className="gap-2 px-4" onClick={openCreate}>
              <Plus className="size-4" />
              New banner
            </PrimaryButton>
          </div>
        </div>

        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">{error}</div>
        ) : null}
        {banner ? (
          <div className="rounded-[16px] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">{banner}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Active banners</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{banners.filter((b) => b.isActive).length}</p>
            <div className="mt-3">
              <StatusBadge label="Live rotation" variant="success" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Draft / paused</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{banners.filter((b) => !b.isActive).length}</p>
            <div className="mt-3">
              <StatusBadge label="Not serving" variant="warning" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Total assets</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{banners.length}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <ImageIcon className="size-4 text-[var(--primary)]" />
              <span>Loaded from admin API</span>
            </div>
          </CardShell>
        </div>

        <TableShell title="Banner library" subtitle="Polished CMS table with quick edit entry points">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Banner</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Updated</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      Loading banners…
                    </td>
                  </tr>
                ) : null}
                {!loading && !error && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      No banners returned from the API.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? rows.map((b) => (
                      <tr key={b.id} className="border-t border-[#eef2ff]">
                        <td className="px-5 py-4">
                          <p className="text-base font-semibold text-[var(--text-primary)]">{b.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{b.imageUrl}</p>
                          <div className="mt-2">
                            <StatusBadge label={b.id} variant="info" />
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{b.priority}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={b.isActive ? "Active" : "Paused"} variant={b.isActive ? "success" : "warning"} />
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">{b.updatedAt}</td>
                        <td className="px-5 py-4 text-right">
                          <SecondaryButton type="button" className="gap-2 px-3 py-2 text-xs font-semibold" onClick={() => openEdit(b)}>
                            <Pencil className="size-4" />
                            Edit
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </TableShell>
      </PageContainer>

      {modalOpen && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 p-4 backdrop-blur-sm md:items-center md:justify-center">
          <div className="w-full max-w-lg rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">{draft.id ? "Edit banner" : "New banner"}</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Edits apply locally until CMS write API ships.</p>
              </div>
              <SecondaryButton type="button" className="h-10 w-10 rounded-full p-0" onClick={closeModal} aria-label="Close">
                <X className="size-4" />
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Title</label>
                <input className="soft-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Campaign title" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Image URL</label>
                <input className="soft-input" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Priority</label>
                  <input
                    className="soft-input"
                    type="number"
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                  <select className="soft-input" value={draft.isActive ? "active" : "paused"} onChange={(e) => setDraft({ ...draft, isActive: e.target.value === "active" })}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <PrimaryButton type="button" className="flex-1" onClick={saveDraft}>
                Save
              </PrimaryButton>
              <SecondaryButton type="button" className="flex-1" onClick={closeModal}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
