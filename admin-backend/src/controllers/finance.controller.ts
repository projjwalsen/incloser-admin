import type { Request, Response } from "express";
import { financeService } from "../services/finance.service.js";
import { ok } from "../utils/http.js";

export const financeController = {
  wallets(_req: Request, res: Response) {
    return ok(res, financeService.wallets());
  },
  revenue(_req: Request, res: Response) {
    return ok(res, financeService.revenue());
  },
};
