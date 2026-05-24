"use client";

import type { UserSummary } from "@incloser/shared-types";
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { fetchUsers, updateUserStatus } from "@/lib/users-api";

function statusVariant(status: UserSummary["status"]) {
  if (status === "active") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "danger" as const;
}

function statusLabel(status: UserSummary["status"]) {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending";
  return "Suspended";
}

function formatInr(value: number) {
  return `₹ ${Math.round(value).toLocaleString("en-IN")}`;
}

export default function UsersPage() {
  const pageSize = 10;
  const [rows, setRows] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserSummary["status"]>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "nickname" | "phone" | "status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [draftSearchText, setDraftSearchText] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | UserSummary["status"]>("all");
  const [draftSortBy, setDraftSortBy] = useState<"created_at" | "nickname" | "phone" | "status">("created_at");
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
    window.addEventListener("users:open-filters", onOpenFilters);
    return () => window.removeEventListener("users:open-filters", onOpenFilters);
  }, [searchText, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUsers({
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
        setError(e instanceof Error ? e.message : "Failed to load users");
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

  const patchStatus = async (id: string, status: UserSummary["status"]) => {
    try {
      const next = await updateUserStatus(id, status);
      setRows((prev) => prev.map((x) => (x.id === id ? next : x)));
      setOpenMenuId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <TableShell title="All users" subtitle="Premium table layout backed by the admin API">
          {error ? (
            <div className="mb-3 rounded-[14px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
              {error}
            </div>
          ) : null}
          <div className="relative">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">User Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Language</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Wallet</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((user) => (
                  <tr key={user.id} className="border-t border-[#eef2ff]">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{user.nickname}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.phone}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.city ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.language ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={statusLabel(user.status)} variant={statusVariant(user.status)} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{formatInr(user.walletBalance)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })}
                    </td>
                    <td className="relative px-4 py-3 text-right" data-row-actions>
                      <SecondaryButton
                        type="button"
                        className="h-9 w-9 rounded-full p-0"
                        aria-label="Row actions"
                        onClick={() => setOpenMenuId((id) => (id === user.id ? null : user.id))}
                      >
                        <MoreHorizontal className="size-4" />
                      </SecondaryButton>
                      {openMenuId === user.id ? (
                        <div
                          className="absolute right-3 top-12 z-10 w-44 rounded-[14px] border border-[#e7ecff] bg-white p-2 text-left shadow-[var(--shadow-card)]"
                        >
                          <button
                            type="button"
                            disabled
                            title="TODO: Add /users/[id] admin route when user detail API is ready"
                            className="w-full cursor-not-allowed rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)]"
                            onClick={() => setOpenMenuId(null)}
                          >
                            View profile
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                            onClick={() => patchStatus(user.id, user.status === "suspended" ? "active" : "suspended")}
                          >
                            {user.status === "suspended" ? "Activate user" : "Suspend user"}
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-[10px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                            onClick={() => patchStatus(user.id, "pending")}
                          >
                            Mark pending
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      Loading users...
                    </td>
                  </tr>
                ) : null}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      No users found for current filters.
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
                <p className="text-body-sm text-[var(--text-muted)]">Placeholder drawer for future filters.</p>
              </div>
              <SecondaryButton type="button" className="px-3 py-2 text-xs" onClick={() => setFilterOpen(false)}>
                Close
              </SecondaryButton>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Search</label>
                <input className="soft-input" value={draftSearchText} onChange={(e) => setDraftSearchText(e.target.value)} placeholder="name, phone, city, id..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                <select className="soft-input" value={draftStatusFilter} onChange={(e) => setDraftStatusFilter(e.target.value as typeof draftStatusFilter)}>
                  <option value="all">Any</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Sort by</label>
                <select className="soft-input" value={draftSortBy} onChange={(e) => setDraftSortBy(e.target.value as typeof draftSortBy)}>
                  <option value="created_at">Created at</option>
                  <option value="nickname">Nickname</option>
                  <option value="phone">Phone</option>
                  <option value="status">Status</option>
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
