import type { Request, Response } from "express";
import { financeService } from "../services/finance.service.js";
import { fail, ok } from "../utils/http.js";

export const financeController = {
  async wallets(_req: Request, res: Response) {
    try {
      return ok(res, await financeService.wallets());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load wallets", 502);
    }
  },

  async revenue(_req: Request, res: Response) {
    try {
      return ok(res, await financeService.revenue());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load revenue", 502);
    }
  },
};
