import { Router } from "express";
import { usersController } from "../../controllers/users.controller.js";

export const usersRoutes = Router();

usersRoutes.get("/users", usersController.list);
usersRoutes.get("/users/:id", usersController.detail);
usersRoutes.patch("/users/:id/status", usersController.updateStatus);
