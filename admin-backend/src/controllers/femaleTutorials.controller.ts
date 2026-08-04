import type { Request, Response } from "express";
import { femaleTutorialsService, type UpdateTutorialInput } from "../services/femaleTutorials.service.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

type UploadedFiles = {
  thumbnail?: Express.Multer.File[];
  video?: Express.Multer.File[];
};

function fileInput(file: Express.Multer.File | undefined) {
  if (!file) return undefined;
  return {
    bytes: file.buffer,
    contentType: file.mimetype || "application/octet-stream",
    fileName: file.originalname || "file",
  };
}

function parseSortOrder(body: Record<string, unknown>, fallback: number) {
  if (!("sortOrder" in body)) return fallback;
  const n = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder);
  return Number.isFinite(n) ? n : fallback;
}

export const femaleTutorialsController = {
  async list(_req: Request, res: Response) {
    try {
      const data = await femaleTutorialsService.list();
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tutorials";
      return fail(res, message, 502);
    }
  },

  async create(req: Request, res: Response) {
    const files = req.files as UploadedFiles | undefined;
    const thumb = files?.thumbnail?.[0];
    const video = files?.video?.[0];
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title : "";
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;
    const sortOrder = parseSortOrder(body, 1);
    const isActive = body.isActive === undefined ? true : body.isActive === true || body.isActive === "true";

    if (!thumb) return fail(res, "thumbnail image is required", 422);
    if (!title.trim()) return fail(res, "title is required", 422);
    if (!video && !videoUrl?.trim()) {
      return fail(res, "upload a video file or paste a video URL", 422);
    }

    try {
      const row = await femaleTutorialsService.create({
        thumbnail: fileInput(thumb)!,
        video: fileInput(video),
        title,
        videoUrl,
        sortOrder,
        isActive,
      });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "CREATE_CMS_TUTORIAL",
          entityType: "female_tutorial_videos",
          entityId: row.id,
          metadata: { adminEmail: admin.email, title: row.title },
        });
      }
      return ok(res, row, "Created", 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create tutorial";
      return fail(res, message, 502);
    }
  },

  async update(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    const files = req.files as UploadedFiles | undefined;
    const thumb = files?.thumbnail?.[0];
    const video = files?.video?.[0];
    const body = req.body as Record<string, unknown>;
    const patch: UpdateTutorialInput = {};

    if (thumb) patch.thumbnail = fileInput(thumb);
    if (video) patch.video = fileInput(video);
    if ("title" in body) {
      if (typeof body.title !== "string") return fail(res, "title must be a string", 422);
      patch.title = body.title;
    }
    if ("videoUrl" in body) {
      patch.videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;
    }
    if ("sortOrder" in body) {
      patch.sortOrder = parseSortOrder(body, 1);
    }
    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean" && body.isActive !== "true" && body.isActive !== "false") {
        return fail(res, "isActive must be boolean", 422);
      }
      patch.isActive = body.isActive === true || body.isActive === "true";
    }

    try {
      const row = await femaleTutorialsService.update(id, patch);
      if (!row) return fail(res, "Tutorial not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_CMS_TUTORIAL",
          entityType: "female_tutorial_videos",
          entityId: row.id,
          metadata: { adminEmail: admin.email, title: row.title, changed: Object.keys(patch) },
        });
      }
      return ok(res, row, "Updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update tutorial";
      return fail(res, message, 502);
    }
  },

  async remove(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!id) return fail(res, "Missing id", 400);
    try {
      const removed = await femaleTutorialsService.remove(id);
      if (!removed) return fail(res, "Tutorial not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "DELETE_CMS_TUTORIAL",
          entityType: "female_tutorial_videos",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id }, "Deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete tutorial";
      return fail(res, message, 502);
    }
  },
};
