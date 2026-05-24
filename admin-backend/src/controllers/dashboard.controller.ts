import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { fail, ok } from "../utils/http.js";

export const dashboardController = {
  async summary(_req: Request, res: Response) {
    try {
      const data = await dashboardService.summary();
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dashboard summary error";
      return fail(res, message, 502);
    }
  },

  async charts(_req: Request, res: Response) {
    try {
      const data = await dashboardService.charts();
      return ok(res, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dashboard charts error";
      return fail(res, message, 502);
    }
  },
};
