import type { AdminRole } from "@incloser/shared-types";

export const ADMIN_ROLES: ReadonlySet<string> = new Set<AdminRole>([
  "super_admin",
  "operations_admin",
  "moderator",
  "verification_admin",
  "finance_admin",
  "support_admin",
]);

/** Roles that may create/edit agencies and view linked models. */
export const AGENCY_OPERATIONS_ROLES: AdminRole[] = ["super_admin", "operations_admin"];

/** @deprecated Use AGENCY_OPERATIONS_ROLES — kept for imports that meant CRUD access. */
export const AGENCY_MANAGER_ROLES: AdminRole[] = AGENCY_OPERATIONS_ROLES;

/** Super admin only: agency payout queue, global agency settings. */
export const AGENCY_FINANCE_ROLES: AdminRole[] = ["super_admin"];

/** Roles that may approve/reject model verification. */
export const VERIFICATION_ROLES: AdminRole[] = [
  "super_admin",
  "operations_admin",
  "verification_admin",
];

/** Roles that may list/view model profiles during verification. */
export const MODELS_READ_ROLES: AdminRole[] = [
  "super_admin",
  "operations_admin",
  "verification_admin",
  "moderator",
];

/** Only super admins manage CMS staff accounts. */
export const ADMIN_USER_MANAGER_ROLES: AdminRole[] = ["super_admin"];

export function assertAdminRole(role: string): AdminRole {
  if (!ADMIN_ROLES.has(role)) {
    throw new Error(`Invalid admin role: ${role}`);
  }
  return role as AdminRole;
}

export function roleCanManageAgencies(role: AdminRole): boolean {
  return AGENCY_MANAGER_ROLES.includes(role);
}

export function roleCanVerifyModels(role: AdminRole): boolean {
  return VERIFICATION_ROLES.includes(role);
}
