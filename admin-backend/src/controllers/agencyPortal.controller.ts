import type { Request, Response } from "express";
import { AgencyAuthError, agencyAuthService } from "../services/agencyAuth.service.js";
import { getRequestAgency } from "../middleware/agencyAuth.js";
import { agencyPortalService } from "../services/agencyPortal.service.js";
import { fail, ok } from "../utils/http.js";

export const agencyAuthController = {
  async login(req: Request, res: Response) {
    const code = String(req.body?.code ?? req.body?.agencyCode ?? "");
    const password = String(req.body?.password ?? "");
    try {
      return ok(res, await agencyAuthService.login(code, password));
    } catch (error) {
      if (error instanceof AgencyAuthError) {
        return fail(res, error.message, error.status);
      }
      return fail(res, "Login failed", 500);
    }
  },
};

export const agencyPortalController = {
  async dashboard(req: Request, res: Response) {
    const agency = getRequestAgency(req);
    if (!agency) return fail(res, "Unauthorized", 401);
    try {
      return ok(res, await agencyPortalService.dashboard(agency.id));
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load dashboard", 502);
    }
  },

  async requestWithdrawal(req: Request, res: Response) {
    const agency = getRequestAgency(req);
    if (!agency) return fail(res, "Unauthorized", 401);
    try {
      const data = await agencyPortalService.requestWithdrawal(agency.id, {
        amountInr: Number(req.body?.amountInr ?? req.body?.amount ?? 0),
        payoutMethod: typeof req.body?.payoutMethod === "string" ? req.body.payoutMethod : undefined,
        bankMasked: typeof req.body?.bankMasked === "string" ? req.body.bankMasked : undefined,
        upiId: typeof req.body?.upiId === "string" ? req.body.upiId : undefined,
      });
      return ok(res, data, "Withdrawal requested", 201);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Request failed", 400);
    }
  },
};
