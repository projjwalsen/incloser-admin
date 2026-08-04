import { Router } from "express";
import { adminUsersController } from "../../controllers/adminUsers.controller.js";

export const adminUsersRoutes = Router();

adminUsersRoutes.get("/admin-users", adminUsersController.list);
adminUsersRoutes.post("/admin-users", adminUsersController.create);
adminUsersRoutes.patch("/admin-users/:id", adminUsersController.update);
