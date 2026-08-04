import type { AdminRole, AdminUserAccount } from "@incloser/shared-types";
import { hashPassword } from "../lib/password.js";
import { assertAdminRole } from "../lib/adminRoles.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import {
  internalEmailForUsername,
  mapAccount,
  normalizeUsername,
} from "./auth.service.js";

type AdminUserRow = {
  id: string;
  username: string | null;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const STAFF_ROLES: AdminRole[] = ["operations_admin", "verification_admin"];

export type CreateAdminUserInput = {
  username: string;
  password: string;
  fullName: string;
  role: AdminRole;
};

export type UpdateAdminUserInput = {
  fullName?: string;
  role?: AdminRole;
  isActive?: boolean;
  password?: string;
};

function assertCreatableRole(role: AdminRole): void {
  if (role === "super_admin") {
    throw new Error("Use the create-admin script to add super admins.");
  }
  if (!STAFF_ROLES.includes(role)) {
    throw new Error("Only operations_admin or verification_admin staff accounts can be created here.");
  }
}

export const adminUsersService = {
  async list(): Promise<AdminUserAccount[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id,username,email,full_name,role,is_active,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        throw new Error("Run supabase/admin_users_username.sql in Supabase.");
      }
      console.error("[adminUsers] list", pgErrorText(error));
      throw new Error("Could not load admin users");
    }

    return (data ?? []).map((row) => mapAccount(row as AdminUserRow));
  },

  async create(input: CreateAdminUserInput): Promise<AdminUserAccount> {
    const username = normalizeUsername(input.username);
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new Error("Username must be 3–32 characters (letters, numbers, . _ -).");
    }

    const role = assertAdminRole(input.role);
    assertCreatableRole(role);

    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const supabase = getSupabaseAdminClient();
    const password_hash = await hashPassword(input.password);
    const email = internalEmailForUsername(username);

    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        username,
        email,
        password_hash,
        full_name: input.fullName.trim(),
        role,
        is_active: true,
      })
      .select("id,username,email,full_name,role,is_active,created_at,updated_at")
      .single<AdminUserRow>();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Username already exists.");
      }
      console.error("[adminUsers] create", pgErrorText(error));
      throw new Error("Could not create admin user");
    }

    return mapAccount(data);
  },

  async update(id: string, input: UpdateAdminUserInput): Promise<AdminUserAccount> {
    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("admin_users")
      .select("id,role")
      .eq("id", id)
      .maybeSingle<{ id: string; role: string }>();

    if (fetchError || !existing) {
      throw new Error("Admin user not found");
    }

    if (existing.role === "super_admin" && input.role && input.role !== "super_admin") {
      throw new Error("Cannot change super admin role from the team panel.");
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.fullName !== undefined) patch.full_name = input.fullName.trim();
    if (input.role !== undefined) {
      assertCreatableRole(input.role);
      patch.role = input.role;
    }
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.password !== undefined) {
      if (input.password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      patch.password_hash = await hashPassword(input.password);
    }

    const { data, error } = await supabase
      .from("admin_users")
      .update(patch)
      .eq("id", id)
      .select("id,username,email,full_name,role,is_active,created_at,updated_at")
      .single<AdminUserRow>();

    if (error) {
      console.error("[adminUsers] update", pgErrorText(error));
      throw new Error("Could not update admin user");
    }

    return mapAccount(data);
  },
};
