import { Router } from "express";
import { settingsController } from "../../controllers/settings.controller.js";

export const settingsRoutes = Router();

settingsRoutes.get("/settings", settingsController.get);
settingsRoutes.patch("/settings", settingsController.patch);
