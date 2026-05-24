import { getAdminApiBaseUrl } from "@/lib/api-client";

type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export type WithdrawalRowApi = {
  id: string;
  modelId: string;
  modelName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  payoutMethod: string;
  risk: "low" | "medium" | "high";
  bankMasked?: string;
  upiId?: string;
  financeNote?: string;
  paidTxnId?: string;
  paidVia?: string;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") ?? localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const json = (await response.json()) as { message?: string; data?: T };
  if (!response.ok || !json.data) throw new Error(json.message ?? "Request failed");
  return json.data;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as { message?: string; data?: T };
  if (!response.ok || !json.data) throw new Error(json.message ?? "Request failed");
  return json.data;
}

export function fetchWithdrawals() {
  return apiGet<WithdrawalRowApi[]>("/withdrawals");
}

export function fetchWithdrawalById(id: string) {
  return apiGet<WithdrawalRowApi>(`/withdrawals/${id}`);
}

export function approveWithdrawal(id: string) {
  return apiPost<WithdrawalRowApi>(`/withdrawals/${id}/approve`);
}

export function rejectWithdrawal(id: string) {
  return apiPost<WithdrawalRowApi>(`/withdrawals/${id}/reject`);
}

export function markWithdrawalPaid(id: string, payload: { txnId: string; paymentMethod: string }) {
  return apiPost<WithdrawalRowApi>(`/withdrawals/${id}/mark-paid`, payload);
}
