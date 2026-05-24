import type { Response } from "express";
import type { ApiError, ApiResponse } from "../types/api.js";

export function ok<T>(res: Response, data: T, message = "OK", status = 200) {
  const body: ApiResponse<T> = { ok: true, message, data };
  return res.status(status).json(body);
}

export function fail(res: Response, message: string, status = 400) {
  const body: ApiError = { ok: false, message };
  return res.status(status).json(body);
}
