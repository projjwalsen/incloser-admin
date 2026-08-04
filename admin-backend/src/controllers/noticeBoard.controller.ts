import type { Request, Response } from "express";
import { noticeBoardService, type UpdateNoticeInput } from "../services/noticeBoard.service.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

export const noticeBoardController = {
  async list(_req: Request, res: Response) {
    try {
      const data = await noticeBoardService.list();
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notice board";
      return fail(res, message, 502);
    }
  },

  async create(req: Request, res: Response) {
    const file = req.file;
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title : "";
    const subtitle = typeof body.subtitle === "string" ? body.subtitle : null;
    const accent = typeof body.accent === "string" ? body.accent : "#DB2777";
    const actionKey = typeof body.actionKey === "string" ? body.actionKey : null;
    const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
    const isActive = typeof body.isActive === "boolean" ? body.isActive : body.isActive === "true";

    if (!title.trim()) return fail(res, "title is required", 422);
    if (!Number.isFinite(sortOrder)) return fail(res, "sortOrder must be a number", 422);

    try {
      const row = await noticeBoardService.create({
        image: file
          ? {
              bytes: file.buffer,
              contentType: file.mimetype || "application/octet-stream",
              fileName: file.originalname || "notice.jpg",
            }
          : undefined,
        title,
        subtitle,
        accent,
        actionKey,
        sortOrder,
        isActive,
      });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "CREATE_CMS_NOTICE",
          entityType: "female_notice_board_items",
          entityId: row.id,
          metadata: { adminEmail: admin.email, title: row.title },
        });
      }
      return ok(res, row, "Created", 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create notice";
      return fail(res, message, 502);
    }
  },

  async update(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    const body = req.body as Record<string, unknown>;
    const patch: UpdateNoticeInput = {};
    const file = req.file;

    if (file) {
      patch.image = {
        bytes: file.buffer,
        contentType: file.mimetype || "application/octet-stream",
        fileName: file.originalname || "notice.jpg",
      };
    }
    if ("title" in body) {
      if (typeof body.title !== "string") return fail(res, "title must be a string", 422);
      patch.title = body.title;
    }
    if ("subtitle" in body) {
      patch.subtitle = typeof body.subtitle === "string" ? body.subtitle : null;
    }
    if ("accent" in body) {
      if (typeof body.accent !== "string") return fail(res, "accent must be a string", 422);
      patch.accent = body.accent;
    }
    if ("actionKey" in body) {
      patch.actionKey = typeof body.actionKey === "string" ? body.actionKey : null;
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
      const row = await noticeBoardService.update(id, patch);
      if (!row) return fail(res, "Notice not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_CMS_NOTICE",
          entityType: "female_notice_board_items",
          entityId: row.id,
          metadata: { adminEmail: admin.email, title: row.title, changed: Object.keys(patch) },
        });
      }
      return ok(res, row, "Updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update notice";
      return fail(res, message, 502);
    }
  },

  async remove(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    try {
      const removed = await noticeBoardService.remove(id);
      if (!removed) return fail(res, "Notice not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "DELETE_CMS_NOTICE",
          entityType: "female_notice_board_items",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id }, "Deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete notice";
      return fail(res, message, 502);
    }
  },
};
