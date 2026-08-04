"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AgencyWithdrawalRequest, AgencyWithdrawalStatus } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import {
  approveAgencyWithdrawal,
  fetchAgencyWithdrawals,
  markAgencyWithdrawalPaid,
  rejectAgencyWithdrawal,
} from "@/lib/agencies-api";

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

const TABS: Array<AgencyWithdrawalStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "paid",
  "rejected",
];

export default function AgencyWithdrawalsPage() {
  const [rows, setRows] = useState<AgencyWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [txnId, setTxnId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await fetchAgencyWithdrawals());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    try {
      setBusyId(id);
      setError(null);
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/agencies" className="text-sm font-semibold text-[var(--brand-primary)]">
              ← Agencies
            </Link>
            <h1 className="mt-2 text-heading-1 text-[var(--text-primary)]">Agency withdrawals</h1>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">
              Review, approve, and mark agency commission transfers as paid.
            </p>
          </div>
          <SecondaryButton onClick={() => void load()}>Refresh</SecondaryButton>
        </div>

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === t
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <TableShell title="Transfer queue" subtitle="Net payout already includes platform charge + TDS">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Agency</th>
                  <th className="px-5 py-4 font-semibold">Requested</th>
                  <th className="px-5 py-4 font-semibold">Gross</th>
                  <th className="px-5 py-4 font-semibold">Platform</th>
                  <th className="px-5 py-4 font-semibold">TDS</th>
                  <th className="px-5 py-4 font-semibold">Net payout</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={8}>
                      No requests in this tab.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? filtered.map((w) => (
                      <tr key={w.id} className="border-t border-[#eef2ff]">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{w.agencyName}</p>
                          <p className="font-mono text-xs text-[var(--text-muted)]">{w.agencyCode}</p>
                        </td>
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
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {w.status === "pending" ? (
                              <>
                                <PrimaryButton
                                  disabled={busyId === w.id}
                                  onClick={() => void run(w.id, () => approveAgencyWithdrawal(w.id))}
                                >
                                  Approve
                                </PrimaryButton>
                                <SecondaryButton
                                  disabled={busyId === w.id}
                                  onClick={() => void run(w.id, () => rejectAgencyWithdrawal(w.id))}
                                >
                                  Reject
                                </SecondaryButton>
                              </>
                            ) : null}
                            {w.status === "approved" ? (
                              <PrimaryButton
                                disabled={busyId === w.id}
                                onClick={() => {
                                  setPayId(w.id);
                                  setTxnId("");
                                  setPaymentMethod("Bank transfer");
                                }}
                              >
                                Mark paid
                              </PrimaryButton>
                            ) : null}
                            {w.status === "paid" && w.paidTxnId ? (
                              <span className="text-xs text-[var(--text-muted)]">Txn {w.paidTxnId}</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </TableShell>

        {payId ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
            <div className="w-full max-w-md rounded-[20px] border border-white bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-heading-2">Mark agency transfer paid</h2>
              <label className="mt-4 block text-sm font-semibold">
                Transaction ID
                <input className="soft-input mt-1" value={txnId} onChange={(e) => setTxnId(e.target.value)} />
              </label>
              <label className="mt-3 block text-sm font-semibold">
                Payment method
                <select
                  className="soft-input mt-1"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option>Bank transfer</option>
                  <option>UPI</option>
                  <option>NEFT</option>
                  <option>IMPS</option>
                </select>
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <SecondaryButton onClick={() => setPayId(null)}>Cancel</SecondaryButton>
                <PrimaryButton
                  disabled={!txnId.trim() || busyId === payId}
                  onClick={() =>
                    void run(payId, async () => {
                      await markAgencyWithdrawalPaid(payId, { txnId, paymentMethod });
                      setPayId(null);
                    })
                  }
                >
                  Confirm paid
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
