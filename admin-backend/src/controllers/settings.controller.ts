import type { Request, Response } from "express";
import type { AdminUser } from "../types/admin.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { settingsService } from "../services/settings.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

export const settingsController = {
  async get(_req: Request, res: Response) {
    const data = await settingsService.get();
    return ok(res, data);
  },

  async patch(req: Request, res: Response) {
    const admin = (req as RequestWithAdmin).admin;
    if (!admin) return fail(res, "Unauthorized", 401);
    const body = req.body as Record<string, unknown> | null | undefined;
    if (!body || typeof body !== "object") return fail(res, "JSON body is required", 400);
    try {
      const next = await settingsService.patch(body);
      await createAuditLog({
        adminId: admin.id,
        action: "UPDATE_SETTINGS",
        entityType: "app_settings",
        entityId: "global",
        metadata: { adminEmail: admin.email, changedKeys: Object.keys(body) },
      });
      return ok(res, next, "Settings updated");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to update settings", 500);
    }
  },
};
