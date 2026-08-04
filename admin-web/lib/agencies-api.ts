import type {
  AgencyDetail,
  AgencySettings,
  AgencySummary,
  AgencyWithdrawalRequest,
} from "@incloser/shared-types";
import { adminGet, adminPatch, adminPost } from "@/lib/api-client";

export function fetchAgencies() {
  return adminGet<AgencySummary[]>("/agencies");
}

export function fetchAgencyDetail(id: string) {
  return adminGet<AgencyDetail>(`/agencies/${id}`);
}

export function createAgency(input: {
  name: string;
  password: string;
  commissionPercent?: number;
}) {
  return adminPost<AgencySummary>("/agencies", input);
}

export function updateAgency(
  id: string,
  input: {
    name?: string;
    password?: string;
    commissionPercent?: number;
    isActive?: boolean;
  }
) {
  return adminPatch<AgencySummary>(`/agencies/${id}`, input);
}

export function fetchAgencyWithdrawals() {
  return adminGet<AgencyWithdrawalRequest[]>("/agencies/withdrawals");
}

export function approveAgencyWithdrawal(id: string) {
  return adminPost<AgencyWithdrawalRequest>(`/agencies/withdrawals/${id}/approve`);
}

export function rejectAgencyWithdrawal(id: string, financeNote?: string) {
  return adminPost<AgencyWithdrawalRequest>(`/agencies/withdrawals/${id}/reject`, {
    financeNote,
  });
}

export function markAgencyWithdrawalPaid(
  id: string,
  input: { txnId: string; paymentMethod: string }
) {
  return adminPost<AgencyWithdrawalRequest>(`/agencies/withdrawals/${id}/mark-paid`, input);
}

export function fetchAgencySettings() {
  return adminGet<AgencySettings>("/agencies/settings");
}

export function patchAgencySettings(patch: Partial<AgencySettings>) {
  return adminPatch<AgencySettings>("/agencies/settings", patch);
}
