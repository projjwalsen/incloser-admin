import { Router } from "express";
import { agenciesController } from "../../controllers/agencies.controller.js";
import { AGENCY_FINANCE_ROLES, AGENCY_OPERATIONS_ROLES } from "../../lib/adminRoles.js";
import { requireRole } from "../../middleware/requireRole.js";

const opsOnly = requireRole(...AGENCY_OPERATIONS_ROLES);
const financeOnly = requireRole(...AGENCY_FINANCE_ROLES);

/**
 * Agency routes with per-path RBAC.
 * Finance paths (settings, withdrawals) must register before `/agencies/:id`.
 */
export const agenciesRoutes = Router();

agenciesRoutes.get("/agencies/settings", financeOnly, agenciesController.getSettings);
agenciesRoutes.patch("/agencies/settings", financeOnly, agenciesController.patchSettings);
agenciesRoutes.get("/agencies/withdrawals", financeOnly, agenciesController.listWithdrawals);
agenciesRoutes.post(
  "/agencies/withdrawals/:id/approve",
  financeOnly,
  agenciesController.approveWithdrawal,
);
agenciesRoutes.post(
  "/agencies/withdrawals/:id/reject",
  financeOnly,
  agenciesController.rejectWithdrawal,
);
agenciesRoutes.post(
  "/agencies/withdrawals/:id/mark-paid",
  financeOnly,
  agenciesController.markWithdrawalPaid,
);

agenciesRoutes.get("/agencies", opsOnly, agenciesController.list);
agenciesRoutes.post("/agencies", opsOnly, agenciesController.create);
agenciesRoutes.get("/agencies/:id", opsOnly, agenciesController.detail);
agenciesRoutes.patch("/agencies/:id", opsOnly, agenciesController.update);

/** @deprecated Use `agenciesRoutes` — kept for older imports. */
export const agenciesCrudRoutes = agenciesRoutes;

/** @deprecated Finance routes are on `agenciesRoutes` with per-route guards. */
export const agenciesFinanceRoutes = agenciesRoutes;
