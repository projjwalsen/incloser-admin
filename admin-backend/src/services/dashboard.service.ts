import type { PostgrestError } from "@supabase/supabase-js";
import type { DashboardCharts, DashboardSummary } from "@incloser/shared-types";
import { isLikelySupabaseInfraFailure, isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function buildLastNDays(n: number): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: isoDateOnly(d),
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
    });
  }
  return days;
}

function emptyDashboardSummary(): DashboardSummary {
  return {
    totalUsers: 0,
    totalModels: 0,
    newRegistrationsToday: 0,
    pendingProfileVerifications: 0,
    pendingAudioVerifications: 0,
    pendingWithdrawals: 0,
    totalTokenRevenue: 0,
    platformEarnings: 0,
  };
}

function emptyDashboardCharts(): DashboardCharts {
  const days = buildLastNDays(7);
  return {
    registrationsTrend: days.map(({ label }) => ({ label, value: 0 })),
    revenueTrend: days.map(({ label }) => ({ label, value: 0 })),
    verificationTrend: days.map(({ label }) => ({ label, value: 0 })),
  };
}

function sumAmount(rows: Array<Record<string, unknown>>): number {
  return rows.reduce((sum, row) => {
    const amount = Number(row.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

function groupByDayCount(rows: Array<Record<string, unknown>>, fieldCandidates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = fieldCandidates.map((key) => row[key]).find((v) => typeof v === "string") as string | undefined;
    if (!raw) continue;
    const key = raw.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function groupByDayAmount(rows: Array<Record<string, unknown>>, dateFieldCandidates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = dateFieldCandidates.map((key) => row[key]).find((v) => typeof v === "string") as string | undefined;
    if (!raw) continue;
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount)) continue;
    const key = raw.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return map;
}

export const dashboardService = {
  async summary(): Promise<DashboardSummary> {
    const supabase = getSupabaseAdminClient();
    const todayIso = startOfTodayIso();

    const [
      usersCountRes,
      modelsCountRes,
      pendingProfilesRes,
      pendingAudioRes,
      pendingWithdrawalsRes,
      newUsersTodayRes,
      todayTxRes,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("female_profiles").select("id", { count: "exact", head: true }),
      supabase.from("female_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("audio_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabase.from("transactions").select("amount,platform_earning,platform_earnings").gte("created_at", todayIso),
    ]);

    let skipTransactionsSummary = false;
    /** Per-query failures use 0 for that metric instead of failing the whole dashboard. */
    const summaryDegraded = new Set<string>();
    for (const [label, res] of [
      ["users", usersCountRes],
      ["female_profiles", modelsCountRes],
      ["female_profiles (pending)", pendingProfilesRes],
      ["audio_verifications", pendingAudioRes],
      ["withdrawals", pendingWithdrawalsRes],
      ["users (today)", newUsersTodayRes],
      ["transactions", todayTxRes],
    ] as const) {
      const err = res.error;
      if (!err) continue;
      if (isLikelySupabaseInfraFailure(err)) {
        console.warn("[dashboard] summary: Supabase unreachable, using empty summary:", pgErrorText(err));
        return emptyDashboardSummary();
      }
      if (label === "transactions") {
        console.warn("[dashboard] summary: transactions skipped:", pgErrorText(err));
        skipTransactionsSummary = true;
        continue;
      }
      if (isMissingRelationError(err)) {
        console.warn(`[dashboard] summary: skipping missing relation (${label}):`, pgErrorText(err));
        summaryDegraded.add(label);
        continue;
      }
      console.warn(`[dashboard] summary: ${label} failed, using 0 for that metric:`, pgErrorText(err));
      summaryDegraded.add(label);
    }

    const txRows = (skipTransactionsSummary ? [] : (todayTxRes.data ?? [])) as Array<Record<string, unknown>>;
    const totalTokenRevenue = sumAmount(txRows);
    const platformEarnings = txRows.reduce((sum, row) => {
      const raw = row.platform_earning ?? row.platform_earnings;
      if (raw === null || raw === undefined) return sum;
      const value = Number(raw);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    const countOrZero = (label: string, res: { count: number | null; error: PostgrestError | null }): number => {
      if (summaryDegraded.has(label)) return 0;
      if (!res.error) return res.count ?? 0;
      if (isMissingRelationError(res.error)) return 0;
      return res.count ?? 0;
    };

    return {
      totalUsers: countOrZero("users", usersCountRes),
      totalModels: countOrZero("female_profiles", modelsCountRes),
      newRegistrationsToday: countOrZero("users (today)", newUsersTodayRes),
      pendingProfileVerifications: countOrZero("female_profiles (pending)", pendingProfilesRes),
      pendingAudioVerifications: countOrZero("audio_verifications", pendingAudioRes),
      pendingWithdrawals: countOrZero("withdrawals", pendingWithdrawalsRes),
      totalTokenRevenue,
      platformEarnings: platformEarnings > 0 ? platformEarnings : Math.round(totalTokenRevenue * 0.2),
    };
  },

  async charts(): Promise<DashboardCharts> {
    const supabase = getSupabaseAdminClient();
    const days = buildLastNDays(7);
    const oldest = new Date();
    oldest.setDate(oldest.getDate() - 6);
    oldest.setHours(0, 0, 0, 0);
    const oldestIso = oldest.toISOString();

    const [usersRes, txRes, profileVerRes, audioVerRes] = await Promise.all([
      supabase.from("users").select("created_at").gte("created_at", oldestIso),
      supabase.from("transactions").select("created_at,amount").gte("created_at", oldestIso),
      supabase.from("female_profiles").select("created_at,updated_at").gte("created_at", oldestIso),
      supabase.from("audio_verifications").select("created_at,updated_at").gte("created_at", oldestIso),
    ]);

    let skipTransactionsCharts = false;
    const chartsDegraded = new Set<string>();
    for (const [label, res] of [
      ["users", usersRes],
      ["transactions", txRes],
      ["female_profiles", profileVerRes],
      ["audio_verifications", audioVerRes],
    ] as const) {
      const err = res.error;
      if (!err) continue;
      if (isLikelySupabaseInfraFailure(err)) {
        console.warn("[dashboard] charts: Supabase unreachable, using empty trends:", pgErrorText(err));
        return emptyDashboardCharts();
      }
      if (label === "transactions") {
        console.warn("[dashboard] charts: transactions skipped:", pgErrorText(err));
        skipTransactionsCharts = true;
        continue;
      }
      if (isMissingRelationError(err)) {
        console.warn(`[dashboard] charts: skipping missing relation (${label}):`, pgErrorText(err));
        chartsDegraded.add(label);
        continue;
      }
      console.warn(`[dashboard] charts: ${label} failed, using empty series for that source:`, pgErrorText(err));
      chartsDegraded.add(label);
    }

    const userRows = (chartsDegraded.has("users") ? [] : (usersRes.data ?? [])) as Array<Record<string, unknown>>;
    const txRowsCharts = (skipTransactionsCharts ? [] : (txRes.data ?? [])) as Array<Record<string, unknown>>;
    const profileRows = (chartsDegraded.has("female_profiles") ? [] : (profileVerRes.data ?? [])) as Array<Record<string, unknown>>;
    const audioRows = (chartsDegraded.has("audio_verifications") ? [] : (audioVerRes.data ?? [])) as Array<Record<string, unknown>>;

    const registrationsByDay = groupByDayCount(userRows, ["created_at"]);
    const revenueByDay = groupByDayAmount(txRowsCharts, ["created_at"]);
    const profileByDay = groupByDayCount(profileRows, ["updated_at", "created_at"]);
    const audioByDay = groupByDayCount(audioRows, ["updated_at", "created_at"]);

    const verificationByDay = new Map<string, number>();
    for (const { key } of days) {
      verificationByDay.set(key, (profileByDay.get(key) ?? 0) + (audioByDay.get(key) ?? 0));
    }

    return {
      registrationsTrend: days.map(({ key, label }) => ({ label, value: registrationsByDay.get(key) ?? 0 })),
      revenueTrend: days.map(({ key, label }) => ({ label, value: Math.round(revenueByDay.get(key) ?? 0) })),
      verificationTrend: days.map(({ key, label }) => ({ label, value: verificationByDay.get(key) ?? 0 })),
    };
  },
};
