import jwt from "jsonwebtoken";
import type { AdminRole, AdminUserAccount } from "@incloser/shared-types";
import { getEnv } from "../config/env.js";
import { assertAdminRole } from "../lib/adminRoles.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { AuthLoginError } from "./auth.errors.js";

export type AdminLoginPayload = {
  token: string;
  admin: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: AdminRole;
  };
};

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

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function internalEmailForUsername(username: string): string {
  return `${username}@incloser.internal`;
}

function mapAccount(row: AdminUserRow): AdminUserAccount {
  return {
    id: row.id,
    username: row.username?.trim() ?? row.email.split("@")[0] ?? "",
    email: row.email,
    fullName: row.full_name?.trim() ?? "",
    role: assertAdminRole(row.role),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function signToken(row: Pick<AdminUserRow, "id" | "email" | "username" | "role">): string {
  const username = row.username?.trim() ?? "";
  return jwt.sign(
    { sub: row.id, email: row.email, username, role: row.role },
    getEnv().JWT_SECRET,
    { expiresIn: "12h" },
  );
}

async function findAdminByCredential(credential: {
  username?: string;
  email?: string;
}): Promise<AdminUserRow | null> {
  const supabase = getSupabaseAdminClient();

  if (credential.username) {
    const normalized = normalizeUsername(credential.username);
    const { data, error } = await supabase
      .from("admin_users")
      .select("id,username,email,password_hash,full_name,role,is_active,created_at,updated_at")
      .eq("username", normalized)
      .maybeSingle<AdminUserRow>();

    if (error) {
      if (isMissingRelationError(error)) {
        throw new AuthLoginError(
          "Admin login requires the username column. Run supabase/admin_users_username.sql.",
          503,
        );
      }
      console.error("[auth] admin_users username query", pgErrorText(error));
      throw new AuthLoginError("Could not verify credentials. Try again later.", 503);
    }
    if (data) return data;
  }

  if (credential.email) {
    const normalized = normalizeEmail(credential.email);
    const { data, error } = await supabase
      .from("admin_users")
      .select("id,username,email,password_hash,full_name,role,is_active,created_at,updated_at")
      .eq("email", normalized)
      .maybeSingle<AdminUserRow>();

    if (error) {
      console.error("[auth] admin_users email query", pgErrorText(error));
      throw new AuthLoginError("Could not verify credentials. Try again later.", 503);
    }
    return data;
  }

  return null;
}

export const authService = {
  async login(credential: { username?: string; email?: string }, password: string): Promise<AdminLoginPayload> {
    const env = getEnv();
    if (env.supabaseUsesAnonKey) {
      throw new AuthLoginError(
        "Admin login is not configured: set SUPABASE_SERVICE_ROLE_KEY so the server can read admin_users.",
        503,
      );
    }

    if (!credential.username?.trim() && !credential.email?.trim()) {
      throw new AuthLoginError("Invalid credentials", 401);
    }

    const data = await findAdminByCredential(credential);
    if (!data) {
      throw new AuthLoginError("Invalid credentials", 401);
    }

    if (!data.is_active) {
      throw new AuthLoginError("This account has been deactivated.", 403);
    }

    const passwordOk = await verifyPassword(password, data.password_hash);
    if (!passwordOk) {
      throw new AuthLoginError("Invalid credentials", 401);
    }

    let role: AdminRole;
    try {
      role = assertAdminRole(data.role);
    } catch {
      throw new AuthLoginError("Invalid admin configuration for this account.", 500);
    }
    const token = signToken(data);

    return {
      token,
      admin: {
        id: data.id,
        username: data.username?.trim() ?? data.email.split("@")[0] ?? "",
        email: data.email,
        full_name: data.full_name?.trim() ?? "",
        role,
      },
    };
  },

  async getProfile(adminId: string): Promise<AdminUserAccount> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id,username,email,full_name,role,is_active,created_at,updated_at")
      .eq("id", adminId)
      .maybeSingle<AdminUserRow>();

    if (error || !data) {
      throw new AuthLoginError("Admin account not found", 404);
    }
    if (!data.is_active) {
      throw new AuthLoginError("This account has been deactivated.", 403);
    }

    return mapAccount(data);
  },

  async reconfirmPassword(adminId: string, password: string): Promise<void> {
    const env = getEnv();
    if (env.supabaseUsesAnonKey) {
      throw new AuthLoginError(
        "Admin verification is not configured: set SUPABASE_SERVICE_ROLE_KEY.",
        503,
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("password_hash,is_active")
      .eq("id", adminId)
      .maybeSingle<{ password_hash: string; is_active: boolean }>();

    if (error) {
      console.error("[auth] reconfirm admin_users query", error);
      throw new AuthLoginError("Could not verify password. Try again later.", 503);
    }
    if (!data) {
      throw new AuthLoginError("Invalid password", 401);
    }
    if (!data.is_active) {
      throw new AuthLoginError("This account has been deactivated.", 403);
    }

    const passwordOk = await verifyPassword(password, data.password_hash);
    if (!passwordOk) {
      throw new AuthLoginError("Invalid password", 401);
    }
  },
};

export { normalizeUsername, internalEmailForUsername, mapAccount };
