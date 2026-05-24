import { Router } from "express";
import { auditLogsController } from "../../controllers/audit-logs.controller.js";

export const auditLogsRoutes = Router();

auditLogsRoutes.get("/audit-logs", auditLogsController.list);
