import type { PaginatedResult, UserSummary } from "@incloser/shared-types";
import { adminGet, getAdminApiBaseUrl } from "@/lib/api-client";

type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  status?: "active" | "suspended" | "pending";
  sortBy?: "created_at" | "nickname" | "phone" | "status";
  sortDir?: "asc" | "desc";
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") ?? localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

export async function fetchUsers(params: ListUsersParams) {
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.sortBy ? { sortBy: params.sortBy } : {}),
    ...(params.sortDir ? { sortDir: params.sortDir } : {}),
  });
  return adminGet<PaginatedResult<UserSummary>>(`/users?${q.toString()}`);
}

export async function fetchUserById(id: string) {
  return adminGet<UserSummary>(`/users/${id}`);
}

export async function updateUserStatus(id: string, status: UserSummary["status"]) {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}/users/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  const json = (await response.json()) as { message?: string; data?: UserSummary };
  if (!response.ok || !json.data) {
    throw new Error(json.message ?? "Failed to update user status");
  }
  return json.data;
}
