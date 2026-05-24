import { Router } from "express";
import { authController } from "../../controllers/auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/auth/login", authController.login);
authRoutes.post("/auth/reconfirm", requireAuth, authController.reconfirm);
