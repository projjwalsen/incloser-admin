"use client";

import { useEffect, useState } from "react";
import type { FinanceWalletRow } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminUserAvatar } from "@/components/ui/admin-user-avatar";
import { TableShell } from "@/components/ui/table-shell";
import { fetchFinanceWallets } from "@/lib/finance-api";

function statusBadge(status: FinanceWalletRow["status"]) {
  if (status === "active") return { label: "Active", variant: "success" as const };
  if (status === "limited") return { label: "Limited", variant: "warning" as const };
  return { label: "Frozen", variant: "danger" as const };
}

function formatInr(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

export default function FinanceWalletsPage() {
  const [rows, setRows] = useState<FinanceWalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchFinanceWallets();
          setRows(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load wallets");
          setRows([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totalBalance = rows.reduce((sum, w) => sum + w.balance, 0);
  const totalTxns = rows.reduce((sum, w) => sum + w.txnCount, 0);

  return (
    <AdminShell>
      <PageContainer>
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">{error}</div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Wallets in view</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{rows.length}</p>
            <div className="mt-3">
              <StatusBadge label="From admin API" variant="info" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Total balance</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{formatInr(totalBalance)}</p>
            <div className="mt-3">
              <StatusBadge label="Liquidity snapshot" variant="success" />
            </div>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Transactions (sum)</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{totalTxns.toLocaleString("en-IN")}</p>
            <div className="mt-3">
              <StatusBadge label="Txn volume" variant="warning" />
            </div>
          </CardShell>
        </div>

        <TableShell title="Wallet balances" subtitle="Premium finance table with clear wallet health signals">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="w-16 px-3 py-4 text-center font-semibold">Avatar</th>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">Balance</th>
                  <th className="px-5 py-4 font-semibold">Txn count</th>
                  <th className="px-5 py-4 font-semibold">Last activity</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={7}>
                      Loading wallets…
                    </td>
                  </tr>
                ) : null}
                {!loading && !error && rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={7}>
                      No wallet rows returned from the API.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? rows.map((w) => {
                      const b = statusBadge(w.status);
                      return (
                        <tr key={w.id} className="border-t border-[#eef2ff]">
                          <td className="px-3 py-4">
                            <div className="flex justify-center">
                              <AdminUserAvatar imageUrl={w.avatarImageUrl} name={w.nickname} />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-base font-semibold text-[var(--text-primary)]">{w.nickname}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <StatusBadge label={`User ${w.userId}`} variant="info" />
                              <StatusBadge label={w.id} variant="info" />
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[var(--text-secondary)]">{w.phone}</td>
                          <td className="px-5 py-4 text-base font-bold text-[var(--text-primary)]">{formatInr(w.balance)}</td>
                          <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{w.txnCount.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-4 text-[var(--text-secondary)]">{w.lastActivity}</td>
                          <td className="px-5 py-4">
                            <StatusBadge label={b.label} variant={b.variant} />
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </TableShell>
      </PageContainer>
    </AdminShell>
  );
}
