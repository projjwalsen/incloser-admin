"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, RefreshCw, Settings2 } from "lucide-react";
import type { AgencySummary } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { createAgency, fetchAgencies } from "@/lib/agencies-api";

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AgenciesPage() {
  const [rows, setRows] = useState<AgencySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("12");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await fetchAgencies());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agencies");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totals = useMemo(() => {
    return {
      count: rows.length,
      balance: rows.reduce((s, r) => s + r.availableBalanceInr, 0),
      lifetime: rows.reduce((s, r) => s + r.lifetimeCommissionInr, 0),
      models: rows.reduce((s, r) => s + r.modelCount, 0),
    };
  }, [rows]);

  const onCreate = async () => {
    try {
      setSaving(true);
      setError(null);
      const created = await createAgency({
        name,
        password,
        commissionPercent: Number(commissionPercent),
      });
      setCreatedCode(created.code);
      setName("");
      setPassword("");
      setCommissionPercent("12");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">Agency management</h1>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">
              Create agencies, track commission earnings, and process agency transfers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/agencies/withdrawals">
              <SecondaryButton>Agency withdrawals</SecondaryButton>
            </Link>
            <Link href="/agencies/settings">
              <SecondaryButton>
                <Settings2 className="mr-1.5 h-4 w-4" />
                Settings
              </SecondaryButton>
            </Link>
            <SecondaryButton onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setCreatedCode(null);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add agency
            </PrimaryButton>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Agencies</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totals.count}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Models under agencies</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totals.models}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Available balance</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{formatInr(totals.balance)}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Lifetime commission</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{formatInr(totals.lifetime)}</p>
          </CardShell>
        </div>

        <TableShell
          title="Agencies"
          subtitle="Each agency gets a unique 6-character code for model registration"
        >
          <div className="mb-4">
            <input
              className="soft-input max-w-md"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or code..."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Agency</th>
                  <th className="px-5 py-4 font-semibold">Code</th>
                  <th className="px-5 py-4 font-semibold">Commission</th>
                  <th className="px-5 py-4 font-semibold">Models</th>
                  <th className="px-5 py-4 font-semibold">Available</th>
                  <th className="px-5 py-4 font-semibold">Lifetime</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold"> </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      Loading agencies…
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      No agencies yet. Create one to generate an agency code.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? filtered.map((row) => (
                      <tr key={row.id} className="border-t border-[#eef2ff]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                            <span className="font-semibold text-[var(--text-primary)]">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-base font-bold tracking-wider text-[var(--text-primary)]">
                          {row.code}
                        </td>
                        <td className="px-5 py-4">{row.commissionPercent}%</td>
                        <td className="px-5 py-4">{row.modelCount}</td>
                        <td className="px-5 py-4 font-semibold">{formatInr(row.availableBalanceInr)}</td>
                        <td className="px-5 py-4">{formatInr(row.lifetimeCommissionInr)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            label={row.isActive ? "Active" : "Inactive"}
                            variant={row.isActive ? "success" : "danger"}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/agencies/${row.id}`}
                            className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </TableShell>

        {modalOpen ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
            <div className="w-full max-w-md rounded-[20px] border border-white bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-heading-2 text-[var(--text-primary)]">Create agency</h2>
              <p className="mt-1 text-body-sm text-[var(--text-muted)]">
                A unique 6-character agency code is generated automatically.
              </p>

              {createdCode ? (
                <div className="mt-5 rounded-[16px] border border-[#c7f0d8] bg-[#f0fdf6] p-4 text-center">
                  <p className="text-sm text-[var(--text-muted)]">Agency code</p>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-[var(--text-primary)]">
                    {createdCode}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Share this code with models during registration.
                  </p>
                  <div className="mt-4">
                    <PrimaryButton
                      onClick={() => {
                        setModalOpen(false);
                        setCreatedCode(null);
                      }}
                    >
                      Done
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                    Agency name
                    <input
                      className="soft-input mt-1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Star Talent Agency"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                    Login password
                    <input
                      className="soft-input mt-1"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                    Commission %
                    <input
                      className="soft-input mt-1"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                    />
                  </label>
                  <div className="flex justify-end gap-2 pt-2">
                    <SecondaryButton onClick={() => setModalOpen(false)} disabled={saving}>
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton onClick={() => void onCreate()} disabled={saving || !name || !password}>
                      {saving ? "Creating…" : "Create"}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
