"use client";

import { useEffect, useMemo, useState } from "react";
import type { FinanceRevenuePayload } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchFinanceRevenue } from "@/lib/finance-api";

function MiniBarChart({ values, accent }: { values: number[]; accent: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-52 items-end gap-2 rounded-[16px] border border-[#e7edff] bg-white p-4">
      {values.map((value, idx) => (
        <div key={`${value}-${idx}`} className="flex flex-1 items-end">
          <div
            className="w-full rounded-[8px]"
            style={{
              height: `${Math.max((value / max) * 100, 10)}%`,
              background: accent,
              boxShadow: "0 6px 14px rgba(41, 98, 255, 0.2)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function formatInrBig(n: number) {
  return `₹ ${Math.round(n).toLocaleString("en-IN")}`;
}

export default function FinanceRevenuePage() {
  const [data, setData] = useState<FinanceRevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          setData(await fetchFinanceRevenue());
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load revenue");
          setData(null);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Gross revenue (30d)", value: formatInrBig(data.gross30d), delta: "From admin API", tone: "success" as const },
      { label: "Net revenue (30d)", value: formatInrBig(data.net30d), delta: "From admin API", tone: "success" as const },
      { label: "Token sales volume", value: formatInrBig(data.tokenSales30d), delta: "From admin API", tone: "info" as const },
      { label: "Platform take rate", value: `${data.takeRatePercent}%`, delta: "From admin API", tone: "info" as const },
    ];
  }, [data]);

  // TODO: Add narrative `notes[]` to FinanceRevenuePayload + backend when finance wants curated commentary in-app.
  const insightNotes = [
    "Trends below are driven by the admin API payload (replace backend source with warehouse/ledger data when ready).",
    "Payout metrics are computed from the same snapshot as KPIs.",
  ];

  return (
    <AdminShell>
      <PageContainer>
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">{error}</div>
        ) : null}
        {loading ? (
          <CardShell>
            <p className="text-sm text-[var(--text-muted)]">Loading revenue…</p>
          </CardShell>
        ) : null}

        {!loading && data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <CardShell key={kpi.label}>
                  <p className="text-body-sm text-[var(--text-muted)]">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{kpi.value}</p>
                  <div className="mt-3">
                    <StatusBadge label={kpi.delta} variant={kpi.tone} />
                  </div>
                </CardShell>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CardShell>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-heading-2 text-[var(--text-primary)]">Revenue trend</h2>
                  <StatusBadge label="12 periods" variant="info" />
                </div>
                <MiniBarChart values={data.revenueTrend} accent="linear-gradient(180deg, #7aa2ff 0%, #2962ff 100%)" />
              </CardShell>

              <CardShell>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-heading-2 text-[var(--text-primary)]">Token sales</h2>
                  <StatusBadge label="Bundles + top-ups" variant="warning" />
                </div>
                <MiniBarChart values={data.tokenSalesTrend} accent="linear-gradient(180deg, #9ab7ff 0%, #4f7df2 100%)" />
              </CardShell>
            </div>

            <CardShell>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-heading-2 text-[var(--text-primary)]">Payout summary</h2>
                  <p className="text-body-sm text-[var(--text-muted)]">Cash movement signals for finance ops.</p>
                </div>
                <StatusBadge label="From admin API" variant="info" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Pending payouts</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{formatInrBig(data.pendingPayoutsInr)}</p>
                </div>
                <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Paid out (30d)</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{formatInrBig(data.paidOut30dInr)}</p>
                </div>
                <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Avg payout time</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{data.avgPayoutHours}h</p>
                </div>
                <div className="rounded-[16px] border border-[#e7ecff] bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Reversal rate</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{data.reversalRatePercent}%</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2 rounded-[16px] border border-[#e7ecff] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
                {insightNotes.map((note) => (
                  <li key={note} className="leading-relaxed">
                    • {note}
                  </li>
                ))}
              </ul>
            </CardShell>
          </>
        ) : null}

        {!loading && !data && !error ? (
          <CardShell>
            <p className="text-sm text-[var(--text-muted)]">No revenue data available.</p>
          </CardShell>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
