import { Router } from "express";
import { agenciesController } from "../../controllers/agencies.controller.js";

export const agenciesRoutes = Router();

agenciesRoutes.get("/agencies", agenciesController.list);
agenciesRoutes.post("/agencies", agenciesController.create);
agenciesRoutes.get("/agencies/settings", agenciesController.getSettings);
agenciesRoutes.patch("/agencies/settings", agenciesController.patchSettings);
agenciesRoutes.get("/agencies/withdrawals", agenciesController.listWithdrawals);
agenciesRoutes.post("/agencies/withdrawals/:id/approve", agenciesController.approveWithdrawal);
agenciesRoutes.post("/agencies/withdrawals/:id/reject", agenciesController.rejectWithdrawal);
agenciesRoutes.post("/agencies/withdrawals/:id/mark-paid", agenciesController.markWithdrawalPaid);
agenciesRoutes.get("/agencies/:id", agenciesController.detail);
agenciesRoutes.patch("/agencies/:id", agenciesController.update);
