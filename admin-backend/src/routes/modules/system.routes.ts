import { Router } from "express";
import { systemController } from "../../controllers/system.controller.js";

export const systemRoutes = Router();

systemRoutes.get("/integrations/supabase/ping", systemController.supabasePing);
