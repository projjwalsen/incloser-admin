import type { DashboardCharts, DashboardSummary } from "@incloser/shared-types";
import { adminGet } from "@/lib/api-client";

export function fetchDashboardSummary() {
  return adminGet<DashboardSummary>("/dashboard/summary");
}

export function fetchDashboardCharts() {
  return adminGet<DashboardCharts>("/dashboard/charts");
}
