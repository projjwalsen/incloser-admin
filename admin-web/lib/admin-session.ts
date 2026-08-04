"use client";

import type { AdminRole } from "@incloser/shared-types";

export type AdminSession = {
  token: string;
  role: AdminRole;
  username: string;
  fullName: string;
  email: string;
};

const SESSION_KEYS = {
  token: "admin_token",
  role: "admin_role",
  username: "admin_username",
  fullName: "admin_full_name",
  email: "admin_email",
} as const;

export function setAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEYS.token, session.token);
  localStorage.setItem(SESSION_KEYS.role, session.role);
  localStorage.setItem(SESSION_KEYS.username, session.username);
  localStorage.setItem(SESSION_KEYS.fullName, session.fullName);
  localStorage.setItem(SESSION_KEYS.email, session.email);
}

export function getAdminRole(): AdminRole | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem(SESSION_KEYS.role);
  return role as AdminRole | null;
}

export function getAdminUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_KEYS.username) ?? "";
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
}

/** Nav visibility by role — operations staff see agencies + verification only. */
export function canAccessNav(href: string, role: AdminRole | null): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;

  const operationsAllowed = [
    "/dashboard",
    "/agencies",
    "/agencies/withdrawals",
    "/agencies/settings",
    "/verification/profile",
    "/verification/audio",
    "/models",
    "/settings/team",
  ];

  const verificationAllowed = [
    "/dashboard",
    "/verification/profile",
    "/verification/audio",
    "/models",
  ];

  const prefixes =
    role === "operations_admin"
      ? operationsAllowed
      : role === "verification_admin"
        ? verificationAllowed
        : [];

  if (prefixes.length === 0) return true;

  return prefixes.some((p) => href === p || href.startsWith(`${p}/`));
}

export function defaultLandingPath(role: AdminRole): string {
  if (role === "operations_admin") return "/agencies";
  if (role === "verification_admin") return "/verification/profile";
  return "/dashboard";
}
