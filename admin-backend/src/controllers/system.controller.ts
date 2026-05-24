import type { Request, Response } from "express";
import { supabaseHealthService } from "../services/supabase-health.service.js";
import { fail, ok } from "../utils/http.js";

export const systemController = {
  async supabasePing(_req: Request, res: Response) {
    try {
      const result = await supabaseHealthService.ping();
      if (!result.ok) return fail(res, `Supabase ping failed: ${result.error ?? "unknown"}`, 502);
      return ok(res, { ok: true }, "Supabase reachable");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return fail(res, `Supabase ping error: ${message}`, 502);
    }
  },
};
