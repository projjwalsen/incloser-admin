import { Router } from "express";
import { financeController } from "../../controllers/finance.controller.js";

export const financeRoutes = Router();

financeRoutes.get("/finance/wallets", financeController.wallets);
financeRoutes.get("/finance/revenue", financeController.revenue);
