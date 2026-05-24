"use client";

import type { DashboardCharts, DashboardSummary } from "@incloser/shared-types";
import { useEffect, useMemo, useState } from "react";
import { fetchDashboardCharts, fetchDashboardSummary } from "@/lib/dashboard-api";

type DashboardDataState = {
  summary: DashboardSummary | null;
  charts: DashboardCharts | null;
  loading: boolean;
  error: string | null;
};

export function useDashboardData() {
  const [state, setState] = useState<DashboardDataState>({
    summary: null,
    charts: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [summary, charts] = await Promise.all([fetchDashboardSummary(), fetchDashboardCharts()]);
        if (!active) return;
        setState({ summary, charts, loading: false, error: null });
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load dashboard data";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const empty = useMemo(() => {
    if (!state.summary || !state.charts) return false;
    return (
      state.summary.totalUsers === 0 &&
      state.summary.totalModels === 0 &&
      state.summary.pendingProfileVerifications === 0 &&
      state.summary.pendingAudioVerifications === 0 &&
      state.summary.pendingWithdrawals === 0 &&
      state.charts.registrationsTrend.every((x) => x.value === 0) &&
      state.charts.revenueTrend.every((x) => x.value === 0) &&
      state.charts.verificationTrend.every((x) => x.value === 0)
    );
  }, [state.charts, state.summary]);

  return { ...state, empty };
}
