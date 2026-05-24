import type { AdminRole, AdminUser } from "@incloser/shared-types";

export type { AdminRole, AdminUser };

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
};
