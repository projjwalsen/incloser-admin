import { Router } from "express";
import multer from "multer";
import { avatarsController } from "../../controllers/avatars.controller.js";
import { cmsController } from "../../controllers/cms.controller.js";

export const cmsRoutes = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

cmsRoutes.get("/cms/banners", cmsController.banners);
cmsRoutes.get("/cms/faq", cmsController.faq);
cmsRoutes.get("/cms/policies", cmsController.policies);

cmsRoutes.get("/cms/avatars", avatarsController.list);
cmsRoutes.post("/cms/avatars", upload.single("image"), avatarsController.create);
cmsRoutes.patch("/cms/avatars/:id", upload.single("image"), avatarsController.update);
cmsRoutes.delete("/cms/avatars/:id", avatarsController.remove);
