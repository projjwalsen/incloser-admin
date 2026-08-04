import type {
  AgencyLoginPayload,
  AgencyPortalDashboard,
  AgencyWithdrawalRequest,
} from "@incloser/shared-types";
import { getAdminApiBaseUrl } from "@/lib/api-client";

const AGENCY_TOKEN_KEY = "agency_token";

export function getAgencyToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AGENCY_TOKEN_KEY);
}

export function clearAgencyAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AGENCY_TOKEN_KEY);
}

export function setAgencyToken(token: string): void {
  localStorage.setItem(AGENCY_TOKEN_KEY, token);
}

async function agencyRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const token = getAgencyToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const json = (await response.json()) as { ok?: boolean; message?: string; data?: T };
  if (!response.ok || json.ok === false || json.data === undefined) {
    throw new Error(json.message ?? `Request failed (${response.status})`);
  }
  return json.data;
}

export async function agencyLogin(code: string, password: string): Promise<AgencyLoginPayload> {
  return agencyRequest<AgencyLoginPayload>("/agency-auth/login", {
    method: "POST",
    body: { code, password },
    auth: false,
  });
}

export function fetchAgencyPortalDashboard() {
  return agencyRequest<AgencyPortalDashboard>("/agency-portal/dashboard");
}

export function requestAgencyPortalWithdrawal(input: {
  amountInr: number;
  payoutMethod?: string;
  bankMasked?: string;
  upiId?: string;
}) {
  return agencyRequest<AgencyWithdrawalRequest>("/agency-portal/withdrawals", {
    method: "POST",
    body: input,
  });
}
