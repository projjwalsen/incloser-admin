import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  ADMIN_USER_MANAGER_ROLES,
  AGENCY_FINANCE_ROLES,
  AGENCY_OPERATIONS_ROLES,
  MODELS_READ_ROLES,
  VERIFICATION_ROLES,
} from "../lib/adminRoles.js";
import { requireRole } from "../middleware/requireRole.js";
import { adminUsersRoutes } from "./modules/adminUsers.routes.js";
import { agenciesCrudRoutes, agenciesFinanceRoutes } from "./modules/agencies.routes.js";
import { agencyAuthRoutes, agencyPortalRoutes } from "./modules/agencyPortal.routes.js";
import { auditLogsRoutes } from "./modules/audit-logs.routes.js";
import { authRoutes } from "./modules/auth.routes.js";
import { cmsRoutes } from "./modules/cms.routes.js";
import { dashboardRoutes } from "./modules/dashboard.routes.js";
import { financeRoutes } from "./modules/finance.routes.js";
import { modelsRoutes } from "./modules/models.routes.js";
import { settingsRoutes } from "./modules/settings.routes.js";
import { systemRoutes } from "./modules/system.routes.js";
import { usersRoutes } from "./modules/users.routes.js";
import { verificationRoutes } from "./modules/verification.routes.js";
import { withdrawalsRoutes } from "./modules/withdrawals.routes.js";

export const adminRouter = Router();

// Public admin + agency auth endpoints
adminRouter.use(authRoutes);
adminRouter.use(agencyAuthRoutes);
adminRouter.use(agencyPortalRoutes);

// Everything below requires admin JWT
adminRouter.use(requireAuth);

adminRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "incloser-admin-backend",
    scope: "admin",
    routes: [
      "/auth/login",
      "/auth/me",
      "/auth/reconfirm",
      "/admin-users",
      "/agency-auth/login",
      "/agency-portal/dashboard",
      "/dashboard/summary",
      "/users",
      "/models",
      "/verification/profile",
      "/verification/audio",
      "/withdrawals",
      "/agencies",
      "/agencies/withdrawals",
      "/finance/wallets",
      "/finance/revenue",
      "/cms/banners",
      "/cms/faq",
      "/cms/policies",
      "/cms/avatars",
      "/cms/female-tutorials",
      "/cms/notice-board",
      "/cms/audio-verification-scripts",
      "/settings",
      "/audit-logs",
      "/integrations/supabase/ping",
    ],
  });
});

adminRouter.use(dashboardRoutes);
adminRouter.use(requireRole("super_admin", "moderator", "finance_admin", "support_admin"), usersRoutes);
adminRouter.use(requireRole(...MODELS_READ_ROLES), modelsRoutes);
adminRouter.use(requireRole(...VERIFICATION_ROLES), verificationRoutes);
adminRouter.use(requireRole("super_admin", "finance_admin"), withdrawalsRoutes);
adminRouter.use(requireRole(...AGENCY_OPERATIONS_ROLES), agenciesCrudRoutes);
adminRouter.use(requireRole(...AGENCY_FINANCE_ROLES), agenciesFinanceRoutes);
adminRouter.use(requireRole("super_admin", "finance_admin"), financeRoutes);
adminRouter.use(requireRole("super_admin", "moderator"), cmsRoutes);
adminRouter.use(requireRole("super_admin"), settingsRoutes);
adminRouter.use(requireRole("super_admin"), auditLogsRoutes);
adminRouter.use(requireRole("super_admin"), systemRoutes);
adminRouter.use(requireRole(...ADMIN_USER_MANAGER_ROLES), adminUsersRoutes);
