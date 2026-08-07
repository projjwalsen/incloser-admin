import type { Request, Response } from "express";
import {
  audioVerificationScriptsService,
  type UpdateScriptInput,
} from "../services/audioVerificationScripts.service.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

export const audioVerificationScriptsController = {
  async list(_req: Request, res: Response) {
    try {
      const data = await audioVerificationScriptsService.list();
      return ok(res, data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load audio verification scripts";
      return fail(res, message, 502);
    }
  },

  async update(req: Request, res: Response) {
    const languageCode =
      typeof req.params.languageCode === "string"
        ? req.params.languageCode
        : req.params.languageCode?.[0];
    if (!languageCode) return fail(res, "Missing languageCode", 400);

    const body = req.body as Record<string, unknown>;
    const patch: UpdateScriptInput = {};

    if ("scriptText" in body) {
      if (typeof body.scriptText !== "string") return fail(res, "scriptText must be a string", 422);
      patch.scriptText = body.scriptText;
    }
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") return fail(res, "isActive must be a boolean", 422);
      patch.isActive = body.isActive;
    }
    if ("languageLabel" in body) {
      if (typeof body.languageLabel !== "string") {
        return fail(res, "languageLabel must be a string", 422);
      }
      patch.languageLabel = body.languageLabel;
    }

    if (Object.keys(patch).length === 0) {
      return fail(res, "No fields to update", 422);
    }

    try {
      const row = await audioVerificationScriptsService.update(languageCode, patch);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_CMS_AUDIO_VERIFICATION_SCRIPT",
          entityType: "audio_verification_scripts",
          entityId: row.languageCode,
          metadata: { adminEmail: admin.email, languageCode: row.languageCode },
        });
      }
      return ok(res, row, "Updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update audio verification script";
      const status = message.startsWith("Unsupported") || message.includes("cannot be empty") ? 422 : 502;
      return fail(res, message, status);
    }
  },
};
