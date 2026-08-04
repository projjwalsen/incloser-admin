import { Router } from "express";
import {
  agencyAuthController,
  agencyPortalController,
} from "../../controllers/agencyPortal.controller.js";
import { requireAgencyAuth } from "../../middleware/agencyAuth.js";

/** Public agency login — mount before admin requireAuth. */
export const agencyAuthRoutes = Router();
agencyAuthRoutes.post("/agency-auth/login", agencyAuthController.login);

/**
 * Agency self-service portal.
 * Auth is attached per-route (not router.use) so mounting this router
 * does not intercept unrelated admin paths like /agencies.
 */
export const agencyPortalRoutes = Router();
agencyPortalRoutes.get(
  "/agency-portal/dashboard",
  requireAgencyAuth,
  agencyPortalController.dashboard
);
agencyPortalRoutes.post(
  "/agency-portal/withdrawals",
  requireAgencyAuth,
  agencyPortalController.requestWithdrawal
);
