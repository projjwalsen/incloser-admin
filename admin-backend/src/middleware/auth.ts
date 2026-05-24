import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import type { AdminJwtPayload, AdminUser } from "../types/admin.js";
import { fail } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

function isPublicAdminPath(pathname: string) {
  return pathname === "/auth/login";
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (isPublicAdminPath(req.path)) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return fail(res, "Missing bearer token", 401);

  const token = header.slice("Bearer ".length).trim();
  if (!token) return fail(res, "Missing bearer token", 401);

  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as AdminJwtPayload;
    const admin: AdminUser = { id: payload.sub, email: payload.email, role: payload.role };
    (req as RequestWithAdmin).admin = admin;
    return next();
  } catch {
    return fail(res, "Invalid token", 401);
  }
};
