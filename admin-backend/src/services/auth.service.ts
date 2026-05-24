import jwt from "jsonwebtoken";
import type { AdminRole } from "@incloser/shared-types";
import { getEnv } from "../config/env.js";
import { verifyPassword } from "../lib/password.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { AuthLoginError } from "./auth.errors.js";

const ADMIN_ROLES: ReadonlySet<string> = new Set<AdminRole>([
  "super_admin",
  "moderator",
  "verification_admin",
  "finance_admin",
  "support_admin",
]);

export type AdminLoginPayload = {
  token: string;
  admin: {
    id: string;
    email: string;
    full_name: string;
    role: AdminRole;
  };
};

type AdminUserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertAdminRole(role: string): AdminRole {
  if (!ADMIN_ROLES.has(role)) {
    throw new AuthLoginError("Invalid admin configuration for this account.", 500);
  }
  return role as AdminRole;
}

export const authService = {
  async login(email: string, password: string): Promise<AdminLoginPayload> {
    const env = getEnv();
    if (env.supabaseUsesAnonKey) {
      throw new AuthLoginError(
        "Admin login is not configured: set SUPABASE_SERVICE_ROLE_KEY so the server can read admin_users (anon key cannot access this table).",
        503,
      );
    }

    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new AuthLoginError("Invalid credentials", 401);
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id,email,password_hash,full_name,role,is_active")
      .eq("email", normalized)
      .maybeSingle<AdminUserRow>();

    if (error) {
      console.error("[auth] admin_users query", error);
      throw new AuthLoginError("Could not verify credentials. Try again later.", 503);
    }

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

    const role = assertAdminRole(data.role);
    const token = jwt.sign({ sub: data.id, email: data.email, role }, getEnv().JWT_SECRET, { expiresIn: "12h" });

    return {
      token,
      admin: {
        id: data.id,
        email: data.email,
        full_name: data.full_name?.trim() ?? "",
        role,
      },
    };
  },

  /** Re-check password for the signed-in admin (step-up before sensitive actions). */
  async reconfirmPassword(adminId: string, password: string): Promise<void> {
    const env = getEnv();
    if (env.supabaseUsesAnonKey) {
      throw new AuthLoginError(
        "Admin verification is not configured: set SUPABASE_SERVICE_ROLE_KEY so the server can read admin_users.",
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
