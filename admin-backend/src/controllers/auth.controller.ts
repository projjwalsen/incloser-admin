import type { Request, Response } from "express";
import { z } from "zod";
import type { AdminUser } from "../types/admin.js";
import { AuthLoginError } from "../services/auth.errors.js";
import { authService } from "../services/auth.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: AdminUser };

const loginSchema = z
  .object({
    username: z.string().min(3).max(32).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6),
  })
  .refine((data) => Boolean(data.username?.trim() || data.email?.trim()), {
    message: "Username or email is required",
  });

const reconfirmSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const authController = {
  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid login payload");

    try {
      const result = await authService.login(
        { username: parsed.data.username, email: parsed.data.email },
        parsed.data.password,
      );
      return ok(res, result, "Logged in");
    } catch (error) {
      if (error instanceof AuthLoginError) {
        return fail(res, error.message, error.statusCode);
      }
      console.error("[auth] login", error);
      return fail(res, "Login temporarily unavailable.", 503);
    }
  },

  async me(req: Request, res: Response) {
    const admin = (req as RequestWithAdmin).admin;
    if (!admin?.id) return fail(res, "Unauthorized", 401);

    try {
      const profile = await authService.getProfile(admin.id);
      return ok(res, profile);
    } catch (error) {
      if (error instanceof AuthLoginError) {
        return fail(res, error.message, error.statusCode);
      }
      return fail(res, "Could not load profile", 500);
    }
  },

  async reconfirm(req: Request, res: Response) {
    const parsed = reconfirmSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Password is required");

    const admin = (req as RequestWithAdmin).admin;
    if (!admin?.id) return fail(res, "Unauthorized", 401);

    try {
      await authService.reconfirmPassword(admin.id, parsed.data.password);
      return ok(res, { verified: true as const }, "Password confirmed");
    } catch (error) {
      if (error instanceof AuthLoginError) {
        return fail(res, error.message, error.statusCode);
      }
      console.error("[auth] reconfirm", error);
      return fail(res, "Verification failed", 503);
    }
  },
};
