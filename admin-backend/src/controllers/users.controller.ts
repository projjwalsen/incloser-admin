import type { Request, Response } from "express";
import type { UserSummary } from "@incloser/shared-types";
import type { AdminUser } from "../types/admin.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { usersService } from "../services/users.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

export const usersController = {
  async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page ?? 1) || 1;
      const limit = Number(req.query.limit ?? 10) || 10;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const status = typeof req.query.status === "string" ? (req.query.status as UserSummary["status"]) : undefined;
      const sortBy = typeof req.query.sortBy === "string" ? (req.query.sortBy as "created_at" | "nickname" | "phone" | "status") : undefined;
      const sortDir = typeof req.query.sortDir === "string" ? (req.query.sortDir as "asc" | "desc") : undefined;
      const data = await usersService.list({ page, limit, search, status, sortBy, sortDir });
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown users list error";
      return fail(res, message, 502);
    }
  },

  async detail(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return fail(res, "User id is required", 400);
    try {
      const data = await usersService.getById(id);
      if (!data) return fail(res, "User not found", 404);
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown user detail error";
      return fail(res, message, 502);
    }
  },

  async updateStatus(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return fail(res, "User id is required", 400);
    const status = req.body?.status as UserSummary["status"] | undefined;
    if (!status || !["active", "suspended", "pending"].includes(status)) {
      return fail(res, "Invalid status", 400);
    }
    try {
      const data = await usersService.updateStatus(id, status);
      if (!data) return fail(res, "User not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_USER_STATUS",
          entityType: "users",
          entityId: id,
          metadata: { adminEmail: admin.email, status },
        });
      }
      return ok(res, data, "User status updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown user status update error";
      return fail(res, message, 502);
    }
  },
};
