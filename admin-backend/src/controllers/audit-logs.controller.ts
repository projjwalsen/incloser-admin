import type { Request, Response } from "express";
import { auditLogsService } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

export const auditLogsController = {
  async list(_req: Request, res: Response) {
    try {
      return ok(res, await auditLogsService.list());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load audit logs", 502);
    }
  },
};
