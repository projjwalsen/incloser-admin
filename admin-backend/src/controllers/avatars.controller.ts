import type { Request, Response } from "express";
import type { AvatarGenderType } from "@incloser/shared-types";
import { avatarsService, type UpdateAvatarInput } from "../services/avatars.service.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

function parseGender(v: unknown): AvatarGenderType | null {
  if (v === "male" || v === "female") return v;
  return null;
}

export const avatarsController = {
  async list(_req: Request, res: Response) {
    try {
      const data = await avatarsService.list();
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load avatars";
      return fail(res, message, 502);
    }
  },

  async create(req: Request, res: Response) {
    const file = req.file;
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title : "";
    const category = typeof body.category === "string" ? body.category : "";
    const genderType = parseGender(body.genderType);
    const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : body.isActive === "true";

    if (!file) return fail(res, "image file is required", 422);
    if (!title.trim()) return fail(res, "title is required", 422);
    if (!genderType) return fail(res, "genderType must be male or female", 422);
    if (!category.trim()) return fail(res, "category is required", 422);
    if (!Number.isFinite(sortOrder)) return fail(res, "sortOrder must be a number", 422);

    try {
      const row = await avatarsService.create({
        image: {
          bytes: file.buffer,
          contentType: file.mimetype || "application/octet-stream",
          fileName: file.originalname || "avatar.png",
        },
        genderType,
        title,
        category,
        sortOrder,
        isActive,
      });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "CREATE_CMS_AVATAR",
          entityType: "avatars",
          entityId: row.id,
          metadata: {
            adminEmail: admin.email,
            title: row.title,
            genderType: row.genderType,
            category: row.category,
          },
        });
      }
      return ok(res, row, "Created", 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create avatar";
      return fail(res, message, 502);
    }
  },

  async update(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    const body = req.body as Record<string, unknown>;
    const patch: UpdateAvatarInput = {};
    const file = req.file;

    if (file) {
      patch.image = {
        bytes: file.buffer,
        contentType: file.mimetype || "application/octet-stream",
        fileName: file.originalname || "avatar.png",
      };
    }
    if ("title" in body) {
      if (typeof body.title !== "string") return fail(res, "title must be a string", 422);
      patch.title = body.title;
    }
    if ("category" in body) {
      if (typeof body.category !== "string") return fail(res, "category must be a string", 422);
      patch.category = body.category;
    }
    if ("genderType" in body) {
      const g = parseGender(body.genderType);
      if (!g) return fail(res, "genderType must be male or female", 422);
      patch.genderType = g;
    }
    if ("sortOrder" in body) {
      const n = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
      if (!Number.isFinite(n)) return fail(res, "sortOrder must be a number", 422);
      patch.sortOrder = n;
    }
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean" && body.isActive !== "true" && body.isActive !== "false") {
        return fail(res, "isActive must be boolean", 422);
      }
      patch.isActive = body.isActive === true || body.isActive === "true";
    }

    try {
      const row = await avatarsService.update(id, patch);
      if (!row) return fail(res, "Avatar not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_CMS_AVATAR",
          entityType: "avatars",
          entityId: row.id,
          metadata: { adminEmail: admin.email, title: row.title, changed: Object.keys(patch) },
        });
      }
      return ok(res, row, "Updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update avatar";
      return fail(res, message, 502);
    }
  },

  async remove(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    try {
      const removed = await avatarsService.remove(id);
      if (!removed) return fail(res, "Avatar not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "DELETE_CMS_AVATAR",
          entityType: "avatars",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id }, "Deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete avatar";
      return fail(res, message, 502);
    }
  },
};
