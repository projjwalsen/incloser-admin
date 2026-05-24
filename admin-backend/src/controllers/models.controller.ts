import type { Request, Response } from "express";
import type { FemaleModelSummary } from "@incloser/shared-types";
import type { AdminUser } from "../types/admin.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { modelsService } from "../services/models.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

export const modelsController = {
  async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page ?? 1) || 1;
      const limit = Number(req.query.limit ?? 10) || 10;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const status = typeof req.query.status === "string" ? (req.query.status as FemaleModelSummary["verificationStatus"]) : undefined;
      const sortBy = typeof req.query.sortBy === "string" ? (req.query.sortBy as "created_at" | "nickname" | "city" | "verification_status") : undefined;
      const sortDir = typeof req.query.sortDir === "string" ? (req.query.sortDir as "asc" | "desc") : undefined;
      const data = await modelsService.list({ page, limit, search, status, sortBy, sortDir });
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown models list error";
      return fail(res, message, 502);
    }
  },

  async detail(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return fail(res, "Model id is required", 400);
    try {
      const data = await modelsService.getById(id);
      if (!data) return fail(res, "Model not found", 404);
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown model detail error";
      return fail(res, message, 502);
    }
  },

  async updateStatus(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return fail(res, "Model id is required", 400);
    const status = req.body?.status as FemaleModelSummary["verificationStatus"] | undefined;
    if (!status || !["pending", "approved", "rejected", "review"].includes(status)) {
      return fail(res, "Invalid status", 400);
    }
    try {
      const data = await modelsService.updateStatus(id, status);
      if (!data) return fail(res, "Model not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_MODEL_STATUS",
          entityType: "female_profiles",
          entityId: id,
          metadata: { adminEmail: admin.email, status },
        });
      }
      return ok(res, data, "Model status updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown model status update error";
      return fail(res, message, 502);
    }
  },
};
