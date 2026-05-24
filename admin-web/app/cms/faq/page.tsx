"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { FaqItem as SharedFaqItem } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { fetchCmsFaq } from "@/lib/cms-api";

type FaqRow = SharedFaqItem & { updatedAt: string };

type DraftFaq = Omit<FaqRow, "updatedAt" | "id"> & { id?: string };

export default function CmsFaqPage() {
  const [items, setItems] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFaq | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchCmsFaq();
          setItems(
            data.map((row) => ({
              ...row,
              updatedAt: "—",
            })),
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load FAQ");
          setItems([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => items, [items]);

  const openCreate = () => {
    setDraft({ question: "", answer: "", isActive: true });
    setModalOpen(true);
    setBanner(null);
  };

  const openEdit = (f: FaqRow) => {
    setDraft({ id: f.id, question: f.question, answer: f.answer, isActive: f.isActive });
    setModalOpen(true);
    setBanner(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setDraft(null);
  };

  const save = () => {
    if (!draft?.question.trim() || !draft.answer.trim()) {
      setBanner("Question and answer are required.");
      return;
    }
    // TODO: Wire POST/PATCH /api/admin/cms/faq when write endpoints exist; until then changes stay client-side only.
    const now = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    if (draft.id) {
      setItems((prev) => prev.map((x) => (x.id === draft.id ? { ...x, question: draft.question, answer: draft.answer, isActive: draft.isActive, updatedAt: now } : x)));
      setBanner(`${draft.id} saved locally (not persisted).`);
    } else {
      const id = `faq_${Math.random().toString(16).slice(2, 8)}`;
      setItems((prev) => [{ id, question: draft.question, answer: draft.answer, isActive: draft.isActive, updatedAt: now }, ...prev]);
      setBanner(`${id} created locally (not persisted).`);
    }
    closeModal();
  };

  const remove = (id: string) => {
    const ok = window.confirm(`Delete ${id}?`);
    if (!ok) return;
    // TODO: Wire DELETE /api/admin/cms/faq/:id when available.
    setItems((prev) => prev.filter((x) => x.id !== id));
    setBanner(`${id} removed locally (not persisted).`);
  };

  useEffect(() => {
    const onOpenCreate = () => openCreate();
    window.addEventListener("cms-faq:open-create", onOpenCreate);
    return () => window.removeEventListener("cms-faq:open-create", onOpenCreate);
  }, []);

  return (
    <AdminShell>
      <PageContainer>
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">{error}</div>
        ) : null}
        {banner ? (
          <div className="rounded-[16px] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">{banner}</div>
        ) : null}

        <TableShell title="Questions" subtitle="Compact rows with decisive actions for editorial workflows">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Question</th>
                  <th className="px-5 py-4 font-semibold">Answer preview</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Updated</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      Loading FAQ…
                    </td>
                  </tr>
                ) : null}
                {!loading && !error && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                      No FAQ entries returned from the API.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? rows.map((f) => (
                      <tr key={f.id} className="border-t border-[#eef2ff]">
                        <td className="px-5 py-4">
                          <p className="text-base font-semibold text-[var(--text-primary)]">{f.question}</p>
                          <div className="mt-2">
                            <StatusBadge label={f.id} variant="info" />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">{f.answer.length > 96 ? `${f.answer.slice(0, 96)}…` : f.answer}</td>
                        <td className="px-5 py-4">
                          <StatusBadge label={f.isActive ? "Published" : "Hidden"} variant={f.isActive ? "success" : "warning"} />
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)]">{f.updatedAt}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                            <SecondaryButton
                              type="button"
                              className="h-9 w-9 rounded-full p-0"
                              title="Edit question"
                              aria-label="Edit question"
                              onClick={() => openEdit(f)}
                            >
                              <Pencil className="size-4" />
                            </SecondaryButton>
                            <SecondaryButton
                              type="button"
                              className="h-9 w-9 rounded-full p-0"
                              title="Delete question"
                              aria-label="Delete question"
                              onClick={() => remove(f.id)}
                            >
                              <Trash2 className="size-4" />
                            </SecondaryButton>
                          </div>
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
          <div className="w-full max-w-2xl rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">{draft.id ? "Edit FAQ" : "New FAQ"}</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Rich text editor will plug in later — textarea for now.</p>
              </div>
              <SecondaryButton type="button" className="h-10 w-10 rounded-full p-0" onClick={closeModal} aria-label="Close">
                <X className="size-4" />
              </SecondaryButton>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Question</label>
                <input className="soft-input" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Answer</label>
                <textarea className="soft-input min-h-[180px] resize-y" value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Visibility</label>
                <select className="soft-input" value={draft.isActive ? "published" : "hidden"} onChange={(e) => setDraft({ ...draft, isActive: e.target.value === "published" })}>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <PrimaryButton type="button" className="flex-1" onClick={save}>
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
