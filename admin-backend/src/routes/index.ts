import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
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

// Public admin auth endpoints
adminRouter.use(authRoutes);

// Everything else requires JWT (starter scaffold)
adminRouter.use(requireAuth);
adminRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "incloser-admin-backend",
    scope: "admin",
    routes: [
      "/auth/login",
      "/auth/reconfirm",
      "/dashboard/summary",
      "/users",
      "/models",
      "/verification/profile",
      "/verification/audio",
      "/withdrawals",
      "/finance/wallets",
      "/finance/revenue",
      "/cms/banners",
      "/cms/faq",
      "/cms/policies",
      "/cms/avatars",
      "/settings",
      "/audit-logs",
      "/integrations/supabase/ping",
    ],
  });
});
adminRouter.use(dashboardRoutes);
adminRouter.use(usersRoutes);
adminRouter.use(modelsRoutes);
adminRouter.use(verificationRoutes);
adminRouter.use(withdrawalsRoutes);
adminRouter.use(financeRoutes);
adminRouter.use(cmsRoutes);
adminRouter.use(settingsRoutes);
adminRouter.use(auditLogsRoutes);
adminRouter.use(systemRoutes);
