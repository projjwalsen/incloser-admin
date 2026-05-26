"use client";

import type { FemaleModelSummary } from "@incloser/shared-types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminUserAvatar } from "@/components/ui/admin-user-avatar";
import { TableShell } from "@/components/ui/table-shell";
import { fetchModels, updateModelStatus } from "@/lib/models-api";

function verificationBadge(status: FemaleModelSummary["verificationStatus"]) {
  if (status === "approved") return { label: "Approved", variant: "success" as const };
  if (status === "pending") return { label: "Pending", variant: "warning" as const };
  if (status === "rejected") return { label: "Rejected", variant: "danger" as const };
  return { label: "In review", variant: "info" as const };
}

function audioBadge(status: FemaleModelSummary["audioVerificationStatus"]) {
  if (status === "approved") return { label: "Approved", variant: "success" as const };
  if (status === "pending") return { label: "Pending", variant: "warning" as const };
  if (status === "rejected") return { label: "Rejected", variant: "danger" as const };
  return { label: "In review", variant: "info" as const };
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatRegisteredAt(iso: string | null | undefined): { absolute: string; relative: string } {
  if (!iso) return { absolute: "—", relative: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { absolute: "—", relative: "" };
  const absolute = dateFormatter.format(date);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let relative: string;
  if (diffDays < 0) relative = "just now";
  else if (diffDays === 0) relative = "today";
  else if (diffDays === 1) relative = "yesterday";
  else if (diffDays < 30) relative = `${diffDays}d ago`;
  else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}mo ago`;
  else relative = `${Math.floor(diffDays / 365)}y ago`;
  return { absolute, relative };
}

export default function ModelsPage() {
  const router = useRouter();
  const pageSize = 10;
  const [rows, setRows] = useState<FemaleModelSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FemaleModelSummary["verificationStatus"]>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "nickname" | "city" | "verification_status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [draftSearchText, setDraftSearchText] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | FemaleModelSummary["verificationStatus"]>("all");
  const [draftSortBy, setDraftSortBy] = useState<"created_at" | "nickname" | "city" | "verification_status">("created_at");
  const [draftSortDir, setDraftSortDir] = useState<"asc" | "desc">("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-row-actions]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenuId]);

  useEffect(() => {
    const onOpenFilters = () => {
      setDraftSearchText(searchText);
      setDraftStatusFilter(statusFilter);
      setDraftSortBy(sortBy);
      setDraftSortDir(sortDir);
      setFilterOpen(true);
    };
    window.addEventListener("models:open-filters", onOpenFilters);
    return () => window.removeEventListener("models:open-filters", onOpenFilters);
  }, [searchText, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchModels({
          page,
          limit: pageSize,
          search: searchText || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          sortBy,
          sortDir,
        });
        if (!active) return;
        setRows(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load models");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [page, searchText, sortBy, sortDir, statusFilter]);

  const applyFilters = () => {
    setPage(1);
    setSearchText(draftSearchText.trim());
    setStatusFilter(draftStatusFilter);
    setSortBy(draftSortBy);
    setSortDir(draftSortDir);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftSearchText("");
    setDraftStatusFilter("all");
    setDraftSortBy("created_at");
    setDraftSortDir("desc");
  };

  const patchStatus = async (id: string, status: FemaleModelSummary["verificationStatus"]) => {
    try {
      const updated = await updateModelStatus(id, status);
      setRows((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                verificationStatus: updated.verificationStatus,
                audioVerificationStatus: updated.audioVerificationStatus,
                avatarImageUrl: updated.avatarImageUrl,
                accountActivated: updated.accountActivated,
              }
            : x,
        ),
      );
      setOpenMenuId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update model status");
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <TableShell title="Female profiles" subtitle="Verify profile first (Verification → Profile), then audio (Verification → Audio). When both are approved, the user account activates automatically. Reject either step to block activation until resubmission.">
          {error ? (
            <div className="mb-3 rounded-[14px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
              {error}
            </div>
          ) : null}
          <div className="relative w-full overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-14" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="min-w-[200px]" />
              </colgroup>
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Avatar</th>
                  <th className="px-5 py-4 font-semibold">Nickname</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">City/State</th>
                  <th className="px-5 py-4 font-semibold">Languages</th>
                  <th className="px-5 py-4 font-semibold">Registered</th>
                  <th className="px-5 py-4 font-semibold">Verification Status</th>
                  <th className="px-5 py-4 font-semibold">Audio Verification</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((model) => {
                  const v = verificationBadge(model.verificationStatus);
                  const a = audioBadge(model.audioVerificationStatus);
                  const registered = formatRegisteredAt(model.createdAt);
                  return (
                    <tr key={model.id} className="border-t border-[#eef2ff]">
                      <td className="px-5 py-4">
                        <AdminUserAvatar imageUrl={model.avatarImageUrl} name={model.nickname} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--text-primary)]">{model.nickname}</p>
                        <p className="text-xs text-[var(--text-muted)]">ID {model.id}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                          {model.accountActivated ? (
                            <span className="text-emerald-700">Account activated</span>
                          ) : (
                            <span className="text-amber-800">Awaiting profile + audio approval</span>
                          )}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">{model.phone}</td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">{[model.city, model.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-black">{model.primaryLanguage ?? "—"}</p>
                        <p className="mt-0.5 text-sm font-normal text-[var(--text-muted)]">
                          {model.secondaryLanguages.length > 0 ? model.secondaryLanguages.join(", ") : "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--text-primary)]">{registered.absolute}</p>
                        {registered.relative ? (
                          <p className="mt-0.5 text-[11px] font-normal text-[var(--text-muted)]">{registered.relative}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge label={v.label} variant={v.variant} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge label={a.label} variant={a.variant} />
                      </td>
                      <td className="relative px-5 py-4 text-right" data-row-actions>
                        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
                          <SecondaryButton
                            type="button"
                            className="px-3 py-2 text-xs font-semibold"
                            onClick={() => router.push(`/models/${model.id}`)}
                          >
                            Detail
                          </SecondaryButton>
                          <SecondaryButton
                            type="button"
                            className="h-9 w-9 rounded-full p-0"
                            aria-label="Row actions"
                            onClick={() => setOpenMenuId((id) => (id === model.id ? null : model.id))}
                          >
                            <MoreHorizontal className="size-4" />
                          </SecondaryButton>
                        </div>
                        {openMenuId === model.id ? (
                          <div className="absolute right-4 top-[calc(100%-0.25rem)] z-10 w-52 rounded-[14px] border border-[#e7ecff] bg-white p-2 text-left shadow-[var(--shadow-card)]">
                            <button
                              type="button"
                              className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                              onClick={() => {
                                setOpenMenuId(null);
                                router.push(`/models/${model.id}`);
                              }}
                            >
                              Open model profile
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                              onClick={() => patchStatus(model.id, "review")}
                            >
                              Set in review
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                              onClick={() => patchStatus(model.id, model.verificationStatus === "approved" ? "rejected" : "approved")}
                            >
                              {model.verificationStatus === "approved" ? "Reject model" : "Approve model"}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={9}>
                      Loading models...
                    </td>
                  </tr>
                ) : null}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={9}>
                      No models found for current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eef2ff] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
            <p>
              Showing <span className="font-semibold text-[var(--text-primary)]">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>–
              <span className="font-semibold text-[var(--text-primary)]">{Math.min(page * pageSize, total)}</span> of{" "}
              <span className="font-semibold text-[var(--text-primary)]">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <SecondaryButton type="button" className="px-3 py-2 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </SecondaryButton>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
                Page {page} / {totalPages}
              </span>
              <SecondaryButton
                type="button"
                className="px-3 py-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </SecondaryButton>
            </div>
          </div>
        </TableShell>
      </PageContainer>

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 p-4 backdrop-blur-sm md:items-center md:justify-center">
          <div className="w-full max-w-md rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-heading-2 text-[var(--text-primary)]">Filters</h2>
                <p className="text-body-sm text-[var(--text-muted)]">Placeholder filters for model discovery.</p>
              </div>
              <SecondaryButton type="button" className="px-3 py-2 text-xs" onClick={() => setFilterOpen(false)}>
                Close
              </SecondaryButton>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Search</label>
                <input className="soft-input" value={draftSearchText} onChange={(e) => setDraftSearchText(e.target.value)} placeholder="nickname, phone, city, id..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Profile verification</label>
                <select className="soft-input" value={draftStatusFilter} onChange={(e) => setDraftStatusFilter(e.target.value as typeof draftStatusFilter)}>
                  <option value="all">Any</option>
                  <option value="pending">Pending</option>
                  <option value="review">In review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Sort by</label>
                <select className="soft-input" value={draftSortBy} onChange={(e) => setDraftSortBy(e.target.value as typeof draftSortBy)}>
                  <option value="created_at">Created at</option>
                  <option value="nickname">Nickname</option>
                  <option value="city">City</option>
                  <option value="verification_status">Verification</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Sort order</label>
                <select className="soft-input" value={draftSortDir} onChange={(e) => setDraftSortDir(e.target.value as typeof draftSortDir)}>
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <PrimaryButton type="button" className="flex-1" onClick={applyFilters}>
                Apply
              </PrimaryButton>
              <SecondaryButton type="button" className="flex-1" onClick={resetFilters}>
                Reset
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
