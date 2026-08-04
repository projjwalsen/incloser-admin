import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AdminRole } from "@incloser/shared-types";
import type { AdminUser } from "../types/admin.js";
import { fail } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

export function requireRole(...allowed: AdminRole[]): RequestHandler {
  const allowedSet = new Set<AdminRole>(allowed);

  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as RequestWithAdmin).admin;
    if (!admin?.role) {
      return fail(res, "Unauthorized", 401);
    }

    if (admin.role === "super_admin" || allowedSet.has(admin.role)) {
      return next();
    }

    return fail(res, "You do not have permission for this action", 403);
  };
}
