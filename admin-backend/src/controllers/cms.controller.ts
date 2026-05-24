import type { Request, Response } from "express";
import { cmsService } from "../services/cms.service.js";
import { ok } from "../utils/http.js";

export const cmsController = {
  banners(_req: Request, res: Response) {
    return ok(res, cmsService.banners());
  },
  faq(_req: Request, res: Response) {
    return ok(res, cmsService.faq());
  },
  policies(_req: Request, res: Response) {
    return ok(res, cmsService.policies());
  },
};
