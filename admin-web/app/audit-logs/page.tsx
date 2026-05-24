"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { fetchAuditLogs, type AuditLogRow } from "@/lib/audit-logs-api";

function formatTs(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default function AuditLogsPage() {
  const [sourceLogs, setSourceLogs] = useState<AuditLogRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [admin, setAdmin] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const adminQ = admin.trim().toLowerCase();
    const entityQ = entity.trim().toLowerCase();
    const actionQ = action.trim().toLowerCase();

    const fromDate = from ? startOfDay(new Date(`${from}T00:00:00`)) : null;
    const toDate = to ? endOfDay(new Date(`${to}T00:00:00`)) : null;

    return sourceLogs.filter((row) => {
      const ts = new Date(row.timestampIso);
      if (fromDate && ts < fromDate) return false;
      if (toDate && ts > toDate) return false;

      if (adminQ && !row.admin.toLowerCase().includes(adminQ)) return false;
      if (entityQ && !row.entity.toLowerCase().includes(entityQ)) return false;
      if (actionQ && !row.action.toLowerCase().includes(actionQ)) return false;

      if (!q) return true;
      const hay = `${row.admin} ${row.action} ${row.entity} ${row.entityId} ${row.note}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sourceLogs, query, admin, entity, action, from, to]);

  const reset = () => {
    setQuery("");
    setAdmin("");
    setEntity("");
    setAction("");
    setFrom("");
    setTo("");
  };

  useEffect(() => {
    const onReset = () => reset();
    window.addEventListener("audit-logs:reset-filters", onReset);
    return () => window.removeEventListener("audit-logs:reset-filters", onReset);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoadError(null);
          const data = await fetchAuditLogs();
          setSourceLogs(data);
        } catch (e) {
          setSourceLogs([]);
          setLoadError(e instanceof Error ? e.message : "Failed to load audit logs");
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AdminShell>
      <PageContainer>
        {loadError ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {loadError}
          </div>
        ) : null}
        <CardShell>
          <div className="grid gap-3 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Search</label>
              <input className="soft-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything in the row..." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Admin</label>
              <input className="soft-input" value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="email contains..." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Entity</label>
              <input className="soft-input" value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="table / domain..." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Action</label>
              <input className="soft-input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="action contains..." />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">From</label>
                <input className="soft-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">To</label>
                <input className="soft-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            <StatusBadge label={`${rows.length} results`} variant="info" />
            <span className="text-[var(--text-muted)]">Tip: combine admin + date range to mimic finance investigations.</span>
          </div>
        </CardShell>

        <TableShell title="Audit trail" subtitle="Wide, readable rows with soft separators and a polished header">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Admin</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                  <th className="px-5 py-4 font-semibold">Entity</th>
                  <th className="px-5 py-4 font-semibold">Entity ID</th>
                  <th className="px-5 py-4 font-semibold">Timestamp</th>
                  <th className="px-5 py-4 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#eef2ff]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[var(--text-primary)]">{row.admin}</p>
                      <div className="mt-2">
                        <StatusBadge label={row.id} variant="info" />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{row.action}</span>
                    </td>
                    <td className="px-5 py-4 font-medium text-[var(--text-primary)]">{row.entity}</td>
                    <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{row.entityId}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{formatTs(row.timestampIso)}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableShell>
      </PageContainer>
    </AdminShell>
  );
}
