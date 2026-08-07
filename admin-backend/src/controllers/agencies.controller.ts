import type { Request, Response } from "express";
import type { AdminRole } from "@incloser/shared-types";
import { createAuditLog } from "../services/audit-logs.service.js";
import { agenciesService } from "../services/agencies.service.js";
import { agencySettingsService } from "../services/agencySettings.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string; role: AdminRole } };

function isSuperAdmin(req: Request): boolean {
  return (req as RequestWithAdmin).admin?.role === "super_admin";
}

function parseId(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (Array.isArray(v) && v[0]?.trim()) return v[0];
  return null;
}

export const agenciesController = {
  async list(_req: Request, res: Response) {
    try {
      return ok(res, await agenciesService.list());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load agencies", 502);
    }
  },

  async create(req: Request, res: Response) {
    const body = (req.body ?? {}) as {
      name?: string;
      password?: string;
      commissionPercent?: number;
    };
    try {
      const data = await agenciesService.create({
        name: String(body.name ?? ""),
        password: String(body.password ?? ""),
        commissionPercent:
          isSuperAdmin(req) && body.commissionPercent != null
            ? Number(body.commissionPercent)
            : undefined,
      });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "CREATE_AGENCY",
          entityType: "agencies",
          entityId: data.id,
          metadata: { adminEmail: admin.email, code: data.code, name: data.name },
        });
      }
      return ok(res, data, "Agency created", 201);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to create agency", 400);
    }
  },

  async detail(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing agency id", 400);
    try {
      const data = await agenciesService.detail(id);
      if (!data) return fail(res, "Agency not found", 404);
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load agency", 502);
    }
  },

  async update(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing agency id", 400);
    const body = (req.body ?? {}) as {
      name?: string;
      password?: string;
      commissionPercent?: number;
      isActive?: boolean;
    };
    try {
      const data = await agenciesService.update(id, {
        name: body.name,
        password: body.password,
        commissionPercent:
          isSuperAdmin(req) && body.commissionPercent != null
            ? Number(body.commissionPercent)
            : undefined,
        isActive: body.isActive,
      });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_AGENCY",
          entityType: "agencies",
          entityId: id,
          metadata: { adminEmail: admin.email, ...(body as Record<string, unknown>) },
        });
      }
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to update agency", 400);
    }
  },

  async listWithdrawals(_req: Request, res: Response) {
    try {
      return ok(res, await agenciesService.listAllWithdrawals());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load agency withdrawals", 502);
    }
  },

  async approveWithdrawal(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    try {
      const data = await agenciesService.approveWithdrawal(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "APPROVE_AGENCY_WITHDRAWAL",
          entityType: "agency_withdrawal_requests",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Approve failed", 400);
    }
  },

  async rejectWithdrawal(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    const note = typeof req.body?.financeNote === "string" ? req.body.financeNote : undefined;
    try {
      const data = await agenciesService.rejectWithdrawal(id, note);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "REJECT_AGENCY_WITHDRAWAL",
          entityType: "agency_withdrawal_requests",
          entityId: id,
          metadata: { adminEmail: admin.email, financeNote: note ?? null },
        });
      }
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Reject failed", 400);
    }
  },

  async markWithdrawalPaid(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing withdrawal id", 400);
    const txnId = String(req.body?.txnId ?? "").trim();
    const paymentMethod = String(req.body?.paymentMethod ?? "").trim();
    if (!txnId || !paymentMethod) {
      return fail(res, "txnId and paymentMethod are required", 400);
    }
    try {
      const data = await agenciesService.markWithdrawalPaid(id, { txnId, paymentMethod });
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "MARK_AGENCY_WITHDRAWAL_PAID",
          entityType: "agency_withdrawal_requests",
          entityId: id,
          metadata: { adminEmail: admin.email, txnId, paymentMethod },
        });
      }
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Mark paid failed", 400);
    }
  },

  async getSettings(_req: Request, res: Response) {
    try {
      return ok(res, await agencySettingsService.load());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to load settings", 502);
    }
  },

  async patchSettings(req: Request, res: Response) {
    try {
      const data = await agencySettingsService.save(req.body ?? {});
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "UPDATE_AGENCY_SETTINGS",
          entityType: "app_agency_settings",
          entityId: "1",
          metadata: { adminEmail: admin.email, ...((req.body ?? {}) as Record<string, unknown>) },
        });
      }
      return ok(res, data);
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to save settings", 400);
    }
  },
};
