"use client";

import { useMemo } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";

function formatInr(value: number): string {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function MiniBarChart({ values, accent }: { values: number[]; accent: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-44 items-end gap-2 rounded-[16px] border border-[#e7edff] bg-white p-4">
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

function LoadingDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardShell key={i}>
            <div className="h-4 w-24 animate-pulse rounded bg-[#edf2ff]" />
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-[#edf2ff]" />
            <div className="mt-3 h-5 w-20 animate-pulse rounded bg-[#edf2ff]" />
          </CardShell>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardShell key={i}>
            <div className="h-44 animate-pulse rounded-[16px] bg-[#edf2ff]" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { summary, charts, loading, error, empty } = useDashboardData();

  const kpiItems = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Users", value: summary.totalUsers.toLocaleString("en-IN"), delta: "Live", tone: "success" as const },
      { label: "Total Models", value: summary.totalModels.toLocaleString("en-IN"), delta: "Live", tone: "success" as const },
      {
        label: "Pending Verifications",
        value: (summary.pendingProfileVerifications + summary.pendingAudioVerifications).toLocaleString("en-IN"),
        delta: `${summary.pendingProfileVerifications} profile • ${summary.pendingAudioVerifications} audio`,
        tone: "warning" as const,
      },
      { label: "Pending Withdrawals", value: summary.pendingWithdrawals.toLocaleString("en-IN"), delta: "Needs finance review", tone: "warning" as const },
      { label: "Revenue Today", value: formatInr(summary.totalTokenRevenue), delta: "From transactions table", tone: "info" as const },
      { label: "Platform Earnings", value: formatInr(summary.platformEarnings), delta: "Computed live", tone: "info" as const },
    ];
  }, [summary]);

  const pendingActions = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Profile verification queue", count: summary.pendingProfileVerifications, priority: "high" as const },
      { label: "Audio verification queue", count: summary.pendingAudioVerifications, priority: "medium" as const },
      { label: "Withdrawal approvals", count: summary.pendingWithdrawals, priority: "high" as const },
      { label: "New registrations today", count: summary.newRegistrationsToday, priority: "low" as const },
    ];
  }, [summary]);

  if (loading) {
    return (
      <AdminShell>
        <PageContainer>
          <LoadingDashboard />
        </PageContainer>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell>
        <PageContainer>
          <CardShell>
            <h3 className="text-heading-2 text-[var(--text-primary)]">Dashboard unavailable</h3>
            <p className="mt-2 text-sm text-[var(--status-danger-text)]">{error}</p>
            <div className="mt-4">
              <SecondaryButton type="button" onClick={() => window.location.reload()}>
                Retry
              </SecondaryButton>
            </div>
          </CardShell>
        </PageContainer>
      </AdminShell>
    );
  }

  if (!summary || !charts || empty) {
    return (
      <AdminShell>
        <PageContainer>
          <CardShell>
            <h3 className="text-heading-2 text-[var(--text-primary)]">No dashboard data yet</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              We connected live APIs, but current tables returned no dashboard records for the selected period.
            </p>
          </CardShell>
        </PageContainer>
      </AdminShell>
    );
  }

  const registrationsTrend = charts.registrationsTrend.map((x) => x.value);
  const revenueTrend = charts.revenueTrend.map((x) => x.value);
  const verificationTrend = charts.verificationTrend.map((x) => x.value);
  const labelSpan = charts.registrationsTrend.map((x) => x.label).join(" · ");

  const recentActivity = [
    {
      title: "Profiles pending review",
      detail: `${summary.pendingProfileVerifications} profile submissions are waiting for review.`,
      time: "Live",
      status: "warning" as const,
    },
    {
      title: "Audio queue status",
      detail: `${summary.pendingAudioVerifications} audio submissions are currently in queue.`,
      time: "Live",
      status: "info" as const,
    },
    {
      title: "Withdrawal pressure",
      detail: `${summary.pendingWithdrawals} withdrawal requests need finance actions.`,
      time: "Live",
      status: "danger" as const,
    },
    {
      title: "Registrations today",
      detail: `${summary.newRegistrationsToday} users registered today.`,
      time: "Live",
      status: "success" as const,
    },
  ];

  return (
    <AdminShell>
      <PageContainer>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpiItems.map((item) => (
            <CardShell key={item.label}>
              <p className="text-body-sm text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{item.value}</p>
              <div className="mt-3">
                <StatusBadge label={item.delta} variant={item.tone} />
              </div>
            </CardShell>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <CardShell className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-heading-2 text-[var(--text-primary)]">Registrations Trend</h3>
              <StatusBadge label="7 days" variant="info" />
            </div>
            <MiniBarChart values={registrationsTrend} accent="linear-gradient(180deg, #7aa2ff 0%, #2962ff 100%)" />
          </CardShell>

          <CardShell className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-heading-2 text-[var(--text-primary)]">Revenue Trend</h3>
              <StatusBadge label="Live" variant="success" />
            </div>
            <MiniBarChart values={revenueTrend} accent="linear-gradient(180deg, #73a8ff 0%, #2f6ef6 100%)" />
          </CardShell>

          <CardShell className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-heading-2 text-[var(--text-primary)]">Verification Trend</h3>
              <StatusBadge label={labelSpan} variant="warning" />
            </div>
            <MiniBarChart values={verificationTrend} accent="linear-gradient(180deg, #9ab7ff 0%, #4f7df2 100%)" />
          </CardShell>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <CardShell>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-heading-2 text-[var(--text-primary)]">Recent Activity</h3>
              <SecondaryButton className="px-3 py-2 text-xs">View all</SecondaryButton>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.title} className="rounded-[14px] border border-[#e7ecff] bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.detail}</p>
                    </div>
                    <StatusBadge label={item.time} variant={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-heading-2 text-[var(--text-primary)]">Pending Actions</h3>
              <PrimaryButton className="px-3 py-2 text-xs">Resolve</PrimaryButton>
            </div>
            <div className="space-y-3">
              {pendingActions.map((item) => (
                <div key={item.label} className="rounded-[14px] border border-[#e7ecff] bg-white px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xl font-bold text-[var(--text-primary)]">{item.count.toLocaleString("en-IN")}</p>
                    <StatusBadge
                      label={item.priority === "high" ? "High" : item.priority === "medium" ? "Medium" : "Low"}
                      variant={item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "info"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardShell>
        </div>
      </PageContainer>
    </AdminShell>
  );
}
