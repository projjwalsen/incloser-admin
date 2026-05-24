import { Router } from "express";
import { withdrawalsController } from "../../controllers/withdrawals.controller.js";

export const withdrawalsRoutes = Router();

withdrawalsRoutes.get("/withdrawals", withdrawalsController.list);
withdrawalsRoutes.get("/withdrawals/:id", withdrawalsController.detail);
withdrawalsRoutes.post("/withdrawals/:id/approve", withdrawalsController.approve);
withdrawalsRoutes.post("/withdrawals/:id/reject", withdrawalsController.reject);
withdrawalsRoutes.post("/withdrawals/:id/mark-paid", withdrawalsController.markPaid);
