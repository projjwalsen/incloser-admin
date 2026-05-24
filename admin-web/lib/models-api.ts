import type { FemaleModelDetail, FemaleModelSummary, PaginatedResult } from "@incloser/shared-types";
import { adminGet, getAdminApiBaseUrl } from "@/lib/api-client";

type ListModelsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: "pending" | "approved" | "rejected" | "review";
  sortBy?: "created_at" | "nickname" | "city" | "verification_status";
  sortDir?: "asc" | "desc";
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") ?? localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

export async function fetchModels(params: ListModelsParams) {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.sortBy ? { sortBy: params.sortBy } : {}),
    ...(params.sortDir ? { sortDir: params.sortDir } : {}),
  });
  return adminGet<PaginatedResult<FemaleModelSummary>>(`/models?${q.toString()}`);
}

export async function fetchModelById(id: string) {
  return adminGet<FemaleModelDetail>(`/models/${id}`);
}

export async function updateModelStatus(id: string, status: FemaleModelSummary["verificationStatus"]) {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}/models/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  const json = (await response.json()) as { message?: string; data?: FemaleModelDetail };
  if (!response.ok || !json.data) {
    throw new Error(json.message ?? "Failed to update model status");
  }
  return json.data;
}
