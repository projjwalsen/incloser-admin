import type { AdminRole, AdminUserAccount } from "@incloser/shared-types";
import { adminGet, adminPatch, adminPost } from "./api-client";

export type CreateAdminUserPayload = {
  username: string;
  password: string;
  fullName: string;
  role: Extract<AdminRole, "operations_admin" | "verification_admin">;
};

export type UpdateAdminUserPayload = {
  fullName?: string;
  role?: Extract<AdminRole, "operations_admin" | "verification_admin">;
  isActive?: boolean;
  password?: string;
};

export async function fetchAdminUsers(): Promise<AdminUserAccount[]> {
  return adminGet<AdminUserAccount[]>("/admin-users");
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserAccount> {
  return adminPost<AdminUserAccount>("/admin-users", payload);
}

export async function updateAdminUser(id: string, payload: UpdateAdminUserPayload): Promise<AdminUserAccount> {
  return adminPatch<AdminUserAccount>(`/admin-users/${id}`, payload);
}

export async function fetchAdminProfile(): Promise<AdminUserAccount> {
  return adminGet<AdminUserAccount>("/auth/me");
}
