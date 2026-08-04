import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import type { AgencyJwtPayload } from "../services/agencyAuth.service.js";
import { fail } from "../utils/http.js";

export type AgencyAuthUser = {
  id: string;
  code: string;
};

type RequestWithAgency = Request & { agency?: AgencyAuthUser };

export const requireAgencyAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return fail(res, "Missing bearer token", 401);

  const token = header.slice("Bearer ".length).trim();
  if (!token) return fail(res, "Missing bearer token", 401);

  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET) as AgencyJwtPayload;
    if (payload.typ !== "agency" || !payload.sub) {
      return fail(res, "Invalid agency token", 401);
    }
    (req as RequestWithAgency).agency = { id: payload.sub, code: payload.code };
    return next();
  } catch {
    return fail(res, "Invalid token", 401);
  }
};

export function getRequestAgency(req: Request): AgencyAuthUser | undefined {
  return (req as RequestWithAgency).agency;
}
