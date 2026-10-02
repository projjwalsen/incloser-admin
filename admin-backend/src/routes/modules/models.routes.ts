import { Router } from "express";
import { modelsController } from "../../controllers/models.controller.js";
import { MODELS_READ_ROLES, VERIFICATION_ROLES } from "../../lib/adminRoles.js";
import { requireRole } from "../../middleware/requireRole.js";

const readOnly = requireRole(...MODELS_READ_ROLES);
const verifyOnly = requireRole(...VERIFICATION_ROLES);

/** Per-route RBAC — list/detail for verification staff; status changes require verify roles. */
export const modelsRoutes = Router();

modelsRoutes.get("/models", readOnly, modelsController.list);
modelsRoutes.get("/models/:id", readOnly, modelsController.detail);
modelsRoutes.patch("/models/:id/status", verifyOnly, modelsController.updateStatus);
