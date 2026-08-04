"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AgencyDetail } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import { fetchAgencyDetail, updateAgency } from "@/lib/agencies-api";

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AgencyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("12");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await fetchAgencyDetail(id);
      setData(detail);
      setName(detail.name);
      setCommissionPercent(String(detail.commissionPercent));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agency");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      await updateAgency(id, {
        name,
        commissionPercent: Number(commissionPercent),
        ...(password ? { password } : {}),
      });
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!id || !data) return;
    try {
      setSaving(true);
      await updateAgency(id, { isActive: !data.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/agencies" className="text-sm font-semibold text-[var(--brand-primary)]">
              ← All agencies
            </Link>
            <h1 className="mt-2 text-heading-1 text-[var(--text-primary)]">
              {data?.name ?? "Agency detail"}
            </h1>
            {data ? (
              <p className="mt-1 font-mono text-lg font-bold tracking-[0.18em] text-[var(--text-primary)]">
                {data.code}
              </p>
            ) : null}
          </div>
          {data ? (
            <SecondaryButton onClick={() => void toggleActive()} disabled={saving}>
              {data.isActive ? "Deactivate" : "Activate"}
            </SecondaryButton>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        {loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}

        {data ? (
          <>
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <CardShell>
                <p className="text-body-sm text-[var(--text-muted)]">Available balance</p>
                <p className="mt-2 text-2xl font-bold">{formatInr(data.availableBalanceInr)}</p>
              </CardShell>
              <CardShell>
                <p className="text-body-sm text-[var(--text-muted)]">Lifetime commission</p>
                <p className="mt-2 text-2xl font-bold">{formatInr(data.lifetimeCommissionInr)}</p>
              </CardShell>
              <CardShell>
                <p className="text-body-sm text-[var(--text-muted)]">Models</p>
                <p className="mt-2 text-2xl font-bold">{data.modelCount}</p>
              </CardShell>
              <CardShell>
                <p className="text-body-sm text-[var(--text-muted)]">Status</p>
                <div className="mt-3">
                  <StatusBadge
                    label={data.isActive ? "Active" : "Inactive"}
                    variant={data.isActive ? "success" : "danger"}
                  />
                </div>
              </CardShell>
            </div>

            <CardShell className="mb-4">
              <h2 className="text-heading-2 text-[var(--text-primary)]">Edit agency</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">
                  Name
                  <input className="soft-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="text-sm font-semibold text-[var(--text-secondary)]">
                  Commission %
                  <input
                    className="soft-input mt-1"
                    type="number"
                    min={0}
                    max={100}
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold text-[var(--text-secondary)] md:col-span-2">
                  Reset password (optional)
                  <input
                    className="soft-input mt-1"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </label>
              </div>
              <div className="mt-4">
                <PrimaryButton onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </PrimaryButton>
              </div>
            </CardShell>

            <TableShell title="Models under agency" subtitle="Registered with this agency code">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Nickname</th>
                      <th className="px-5 py-4 font-semibold">Phone</th>
                      <th className="px-5 py-4 font-semibold">Verification</th>
                      <th className="px-5 py-4 font-semibold">Commission earned</th>
                      <th className="px-5 py-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.models.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                          No models linked yet.
                        </td>
                      </tr>
                    ) : (
                      data.models.map((m) => (
                        <tr key={m.modelId} className="border-t border-[#eef2ff]">
                          <td className="px-5 py-4 font-semibold">{m.nickname}</td>
                          <td className="px-5 py-4">{m.phone ?? "—"}</td>
                          <td className="px-5 py-4">{m.verificationStatus}</td>
                          <td className="px-5 py-4">{formatInr(m.lifetimeCommissionInr)}</td>
                          <td className="px-5 py-4">
                            {new Date(m.createdAt).toLocaleDateString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TableShell>

            <div className="mt-4">
              <TableShell title="Commission ledger" subtitle="Credits from model withdrawals">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Date</th>
                        <th className="px-5 py-4 font-semibold">Model</th>
                        <th className="px-5 py-4 font-semibold">Gross withdrawal</th>
                        <th className="px-5 py-4 font-semibold">Rate</th>
                        <th className="px-5 py-4 font-semibold">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentCommissions.length === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={5}>
                            No commission entries yet (credited when models withdraw).
                          </td>
                        </tr>
                      ) : (
                        data.recentCommissions.map((c) => (
                          <tr key={c.id} className="border-t border-[#eef2ff]">
                            <td className="px-5 py-4">
                              {new Date(c.createdAt).toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4">{c.modelName}</td>
                            <td className="px-5 py-4">{formatInr(c.grossWithdrawalInr)}</td>
                            <td className="px-5 py-4">{c.commissionPercent}%</td>
                            <td className="px-5 py-4 font-semibold">{formatInr(c.commissionInr)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            </div>

            <div className="mt-4">
              <TableShell title="Agency withdrawal requests" subtitle="Transfers requested by this agency">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Requested</th>
                        <th className="px-5 py-4 font-semibold">Gross</th>
                        <th className="px-5 py-4 font-semibold">Platform</th>
                        <th className="px-5 py-4 font-semibold">TDS</th>
                        <th className="px-5 py-4 font-semibold">Net</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.withdrawalRequests.length === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={6}>
                            No withdrawal requests.
                          </td>
                        </tr>
                      ) : (
                        data.withdrawalRequests.map((w) => (
                          <tr key={w.id} className="border-t border-[#eef2ff]">
                            <td className="px-5 py-4">
                              {new Date(w.requestedAt).toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4">{formatInr(w.requestedAmountInr)}</td>
                            <td className="px-5 py-4">{formatInr(w.platformChargeInr)}</td>
                            <td className="px-5 py-4">{formatInr(w.tdsInr)}</td>
                            <td className="px-5 py-4 font-semibold">{formatInr(w.netPayoutInr)}</td>
                            <td className="px-5 py-4">
                              <StatusBadge label={w.status} variant="info" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <Link href="/agencies/withdrawals" className="text-sm font-semibold text-[var(--brand-primary)]">
                    Process all agency withdrawals →
                  </Link>
                </div>
              </TableShell>
            </div>
          </>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
