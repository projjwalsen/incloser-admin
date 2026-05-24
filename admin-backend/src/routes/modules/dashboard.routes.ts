import { Router } from "express";
import { dashboardController } from "../../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/dashboard/summary", dashboardController.summary);
dashboardRoutes.get("/dashboard/charts", dashboardController.charts);
