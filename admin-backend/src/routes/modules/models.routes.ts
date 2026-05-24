import { Router } from "express";
import { modelsController } from "../../controllers/models.controller.js";

export const modelsRoutes = Router();

modelsRoutes.get("/models", modelsController.list);
modelsRoutes.get("/models/:id", modelsController.detail);
modelsRoutes.patch("/models/:id/status", modelsController.updateStatus);
