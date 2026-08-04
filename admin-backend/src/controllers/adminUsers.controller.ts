import type { Request, Response } from "express";
import { z } from "zod";
import type { AdminUser } from "../types/admin.js";
import { adminUsersService } from "../services/adminUsers.service.js";
import { createAuditLog } from "../services/audit-logs.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

function parseId(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (Array.isArray(v) && v[0]?.trim()) return v[0];
  return null;
}

const createSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120),
  role: z.enum(["operations_admin", "verification_admin"]),
});

const updateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  role: z.enum(["operations_admin", "verification_admin"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const adminUsersController = {
  async list(_req: Request, res: Response) {
    try {
      const rows = await adminUsersService.list();
      return ok(res, rows);
    } catch (error) {
      console.error("[adminUsers] list", error);
      return fail(res, error instanceof Error ? error.message : "Could not load team", 500);
    }
  },

  async create(req: Request, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => i.message).join("; ");
      return fail(res, detail || "Invalid payload");
    }

    const admin = (req as RequestWithAdmin).admin;
    if (!admin?.id) return fail(res, "Unauthorized", 401);

    try {
      const created = await adminUsersService.create(parsed.data);
      try {
        await createAuditLog({
          adminId: admin.id,
          action: "CREATE_ADMIN_USER",
          entityType: "admin_users",
          entityId: created.id,
          metadata: { adminEmail: admin.email, username: created.username, role: created.role },
        });
      } catch (auditError) {
        console.warn("[adminUsers] audit log skipped:", auditError);
      }
      return ok(res, created, "Team member created");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Could not create user", 400);
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid payload");

    const admin = (req as RequestWithAdmin).admin;
    if (!admin?.id) return fail(res, "Unauthorized", 401);

    const id = parseId(req.params.id);
    if (!id) return fail(res, "Invalid id", 400);

    try {
      const updated = await adminUsersService.update(id, parsed.data);
      await createAuditLog({
        adminId: admin.id,
        action: "UPDATE_ADMIN_USER",
        entityType: "admin_users",
        entityId: updated.id,
        metadata: {
          adminEmail: admin.email,
          username: updated.username,
          role: updated.role,
          isActive: updated.isActive,
        },
      });
      return ok(res, updated, "Team member updated");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Could not update user", 400);
    }
  },
};
