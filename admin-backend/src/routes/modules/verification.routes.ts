import { Router } from "express";
import { verificationController } from "../../controllers/verification.controller.js";

export const verificationRoutes = Router();

verificationRoutes.get("/verification/profile", verificationController.profileQueue);
verificationRoutes.post("/verification/profile/:id/approve", verificationController.approveProfile);
verificationRoutes.post("/verification/profile/:id/reject", verificationController.rejectProfile);
verificationRoutes.get("/verification/audio", verificationController.audioQueue);
verificationRoutes.post("/verification/audio/:id/approve", verificationController.approveAudio);
verificationRoutes.post("/verification/audio/:id/reject", verificationController.rejectAudio);
verificationRoutes.post("/verification/audio/:id/resubmit", verificationController.resubmitAudio);
