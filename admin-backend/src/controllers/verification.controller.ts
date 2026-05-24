import type { Request, Response } from "express";
import { createAuditLog } from "../services/audit-logs.service.js";
import { verificationService } from "../services/verification.service.js";
import { fail, ok } from "../utils/http.js";

type RequestWithAdmin = Request & { admin?: { id: string; email: string } };

function parseId(v: string | string[] | undefined): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (Array.isArray(v) && v[0]?.trim()) return v[0];
  return null;
}

export const verificationController = {
  async profileQueue(_req: Request, res: Response) {
    try {
      return ok(res, await verificationService.profileQueue());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to fetch profile queue", 502);
    }
  },

  async approveProfile(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing profile id", 400);
    try {
      await verificationService.approveProfile(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "APPROVE_PROFILE_VERIFICATION",
          entityType: "female_profiles",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id, status: "approved" }, "Profile approved");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to approve profile", 502);
    }
  },

  async rejectProfile(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing profile id", 400);
    try {
      await verificationService.rejectProfile(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "REJECT_PROFILE_VERIFICATION",
          entityType: "female_profiles",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id, status: "rejected" }, "Profile rejected");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to reject profile", 502);
    }
  },

  async audioQueue(_req: Request, res: Response) {
    try {
      return ok(res, await verificationService.audioQueue());
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to fetch audio queue", 502);
    }
  },

  async approveAudio(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing audio verification id", 400);
    try {
      await verificationService.approveAudio(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "APPROVE_AUDIO_VERIFICATION",
          entityType: "audio_verifications",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id, status: "approved" }, "Audio approved");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to approve audio", 502);
    }
  },

  async rejectAudio(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing audio verification id", 400);
    try {
      await verificationService.rejectAudio(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "REJECT_AUDIO_VERIFICATION",
          entityType: "audio_verifications",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id, status: "rejected" }, "Audio rejected");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to reject audio", 502);
    }
  },

  async resubmitAudio(req: Request, res: Response) {
    const id = parseId(req.params.id);
    if (!id) return fail(res, "Missing audio verification id", 400);
    try {
      await verificationService.resubmitAudio(id);
      const admin = (req as RequestWithAdmin).admin;
      if (admin) {
        await createAuditLog({
          adminId: admin.id,
          action: "RESUBMIT_AUDIO_VERIFICATION",
          entityType: "audio_verifications",
          entityId: id,
          metadata: { adminEmail: admin.email },
        });
      }
      return ok(res, { id, status: "review" }, "Audio marked for resubmit");
    } catch (error) {
      return fail(res, error instanceof Error ? error.message : "Failed to mark resubmit", 502);
    }
  },
};
