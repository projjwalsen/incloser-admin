import { Router } from "express";
import { agenciesController } from "../../controllers/agencies.controller.js";

/** List/create/view/update agencies — super_admin + operations_admin. */
export const agenciesCrudRoutes = Router();

agenciesCrudRoutes.get("/agencies", agenciesController.list);
agenciesCrudRoutes.post("/agencies", agenciesController.create);
agenciesCrudRoutes.get("/agencies/:id", agenciesController.detail);
agenciesCrudRoutes.patch("/agencies/:id", agenciesController.update);

/** Agency payouts + global settings — super_admin only. */
export const agenciesFinanceRoutes = Router();

agenciesFinanceRoutes.get("/agencies/settings", agenciesController.getSettings);
agenciesFinanceRoutes.patch("/agencies/settings", agenciesController.patchSettings);
agenciesFinanceRoutes.get("/agencies/withdrawals", agenciesController.listWithdrawals);
agenciesFinanceRoutes.post("/agencies/withdrawals/:id/approve", agenciesController.approveWithdrawal);
agenciesFinanceRoutes.post("/agencies/withdrawals/:id/reject", agenciesController.rejectWithdrawal);
agenciesFinanceRoutes.post("/agencies/withdrawals/:id/mark-paid", agenciesController.markWithdrawalPaid);

/** @deprecated Combined router — prefer split CRUD/finance routers. */
export const agenciesRoutes = Router();
agenciesRoutes.use(agenciesCrudRoutes);
agenciesRoutes.use(agenciesFinanceRoutes);
