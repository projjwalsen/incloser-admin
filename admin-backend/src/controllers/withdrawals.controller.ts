import type { Request, Response } from "express";
import { createAuditLog } from "../services/audit-logs.service.js";
import { withdrawalsService } from "../services/withdrawals.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

function parseId(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (Array.isArray(v) && v[0]?.trim()) return v[0];
  return null;
}

export const withdrawalsController = {
  async list(_req: Request, res: Response) {
    try {
      return ok(res, await withdrawalsService.list());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load withdrawals", 502);
    }
  },

  async detail(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    try {
      const data = await withdrawalsService.detail(id);
      if (!data) return fail(res, "Withdrawal not found", 404);
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load withdrawal detail", 502);
    }
  },

  async approve(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    try {
      const data = await withdrawalsService.approve(id);
      if (!data) return fail(res, "Withdrawal not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "APPROVE_WITHDRAWAL",
          entityType: "withdrawals",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, data, "Withdrawal approved");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to approve withdrawal", 502);
    }
  },

  async reject(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    try {
      const data = await withdrawalsService.reject(id);
      if (!data) return fail(res, "Withdrawal not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "REJECT_WITHDRAWAL",
          entityType: "withdrawals",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, data, "Withdrawal rejected");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to reject withdrawal", 502);
    }
  },

  async markPaid(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    const txnId = typeof req.body?.txnId === "string" ? req.body.txnId.trim() : "";
    const paymentMethod = typeof req.body?.paymentMethod === "string" ? req.body.paymentMethod.trim() : "";
    if (!txnId) return fail(res, "txnId is required", 422);
    if (!paymentMethod) return fail(res, "paymentMethod is required", 422);
    try {
      const data = await withdrawalsService.markPaid(id, txnId, paymentMethod);
      if (!data) return fail(res, "Withdrawal not found", 404);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "MARK_WITHDRAWAL_PAID",
          entityType: "withdrawals",
          entityId: id,
          metadata: { adminEmail: admin.email, txnId, paymentMethod },
        });
      }
      return ok(res, data, "Withdrawal marked paid");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to mark withdrawal paid", 502);
    }
  },
};
