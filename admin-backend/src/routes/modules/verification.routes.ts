import { Router } from "express";
import { verificationController } from "../../controllers/verification.controller.js";
import { VERIFICATION_ROLES } from "../../lib/adminRoles.js";
import { requireRole } from "../../middleware/requireRole.js";

const verifyOnly = requireRole(...VERIFICATION_ROLES);

/** Per-route RBAC so staff roles are not blocked by earlier router stacks. */
export const verificationRoutes = Router();

verificationRoutes.get("/verification/profile", verifyOnly, verificationController.profileQueue);
verificationRoutes.post(
  "/verification/profile/:id/approve",
  verifyOnly,
  verificationController.approveProfile,
);
verificationRoutes.post(
  "/verification/profile/:id/reject",
  verifyOnly,
  verificationController.rejectProfile,
);
verificationRoutes.get("/verification/audio", verifyOnly, verificationController.audioQueue);
verificationRoutes.post(
  "/verification/audio/:id/approve",
  verifyOnly,
  verificationController.approveAudio,
);
verificationRoutes.post(
  "/verification/audio/:id/reject",
  verifyOnly,
  verificationController.rejectAudio,
);
verificationRoutes.post(
  "/verification/audio/:id/resubmit",
  verifyOnly,
  verificationController.resubmitAudio,
);
