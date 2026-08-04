"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgencyPortalDashboard } from "@incloser/shared-types";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import {
  clearAgencyAuth,
  fetchAgencyPortalDashboard,
  getAgencyToken,
  requestAgencyPortalWithdrawal,
} from "@/lib/agency-portal-api";

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AgencyPortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getAgencyToken()) {
      router.replace("/agency/login");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(await fetchAgencyPortalDashboard());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
      if (/token|Unauthorized|401/i.test(msg)) {
        clearAgencyAuth();
        router.replace("/agency/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = () => {
    clearAgencyAuth();
    router.replace("/agency/login");
  };

  const requestWithdraw = async () => {
    try {
      setBusy(true);
      setError(null);
      await requestAgencyPortalWithdrawal({
        amountInr: Number(amount),
        upiId: upiId || undefined,
        payoutMethod: upiId ? "UPI" : "Bank transfer",
      });
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-6">
        <p className="text-sm text-[var(--text-muted)]">Loading agency dashboard…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-6">
        <div className="text-center">
          <p className="text-sm text-[var(--status-danger-text)]">{error ?? "Unable to load"}</p>
          <SecondaryButton className="mt-4" onClick={logout}>
            Back to login
          </SecondaryButton>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">{data.agency.name}</h1>
            <p className="mt-1 font-mono text-lg font-bold tracking-[0.18em]">{data.agency.code}</p>
          </div>
          <SecondaryButton onClick={logout}>Log out</SecondaryButton>
        </div>

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Available balance</p>
            <p className="mt-2 text-2xl font-bold">{formatInr(data.agency.availableBalanceInr)}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Lifetime earnings</p>
            <p className="mt-2 text-2xl font-bold">{formatInr(data.agency.lifetimeCommissionInr)}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Models</p>
            <p className="mt-2 text-2xl font-bold">{data.agency.modelCount}</p>
          </CardShell>
          <CardShell>
            <p className="text-body-sm text-[var(--text-muted)]">Your commission</p>
            <p className="mt-2 text-2xl font-bold">{data.agency.commissionPercent}%</p>
          </CardShell>
        </div>

        <CardShell className="mb-4">
          <h2 className="text-heading-2">Request withdrawal</h2>
          <p className="mt-1 text-body-sm text-[var(--text-muted)]">
            Platform charge {data.settings.platformWithdrawalChargePercent}% + TDS (
            {data.settings.tdsPercent}% above ₹{data.settings.tdsThresholdInr.toLocaleString("en-IN")}{" "}
            FY) apply on payout.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              className="soft-input"
              type="number"
              min={1}
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className="soft-input"
              placeholder="UPI ID (optional)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <PrimaryButton
              disabled={busy || !amount || Number(amount) <= 0}
              onClick={() => void requestWithdraw()}
            >
              {busy ? "Submitting…" : "Submit request"}
            </PrimaryButton>
          </div>
        </CardShell>

        <TableShell title="Models" subtitle="Registered under your agency code">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nickname</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Commission from model</th>
                </tr>
              </thead>
              <tbody>
                {data.models.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={4}>
                      No models yet. Share code {data.agency.code} at registration.
                    </td>
                  </tr>
                ) : (
                  data.models.map((m) => (
                    <tr key={m.modelId} className="border-t border-[#eef2ff]">
                      <td className="px-5 py-4 font-semibold">{m.nickname}</td>
                      <td className="px-5 py-4">{m.phone ?? "—"}</td>
                      <td className="px-5 py-4">{m.verificationStatus}</td>
                      <td className="px-5 py-4">{formatInr(m.lifetimeCommissionInr)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TableShell>

        <div className="mt-4">
          <TableShell title="Your withdrawal requests" subtitle="Admin will review and pay">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Gross</th>
                    <th className="px-5 py-4 font-semibold">Net</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.withdrawalRequests.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={4}>
                        No requests yet.
                      </td>
                    </tr>
                  ) : (
                    data.withdrawalRequests.map((w) => (
                      <tr key={w.id} className="border-t border-[#eef2ff]">
                        <td className="px-5 py-4">
                          {new Date(w.requestedAt).toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-4">{formatInr(w.requestedAmountInr)}</td>
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
          </TableShell>
        </div>
      </div>
    </main>
  );
}
