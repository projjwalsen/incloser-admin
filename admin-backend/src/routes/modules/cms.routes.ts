import { Router } from "express";
import multer from "multer";
import { avatarsController } from "../../controllers/avatars.controller.js";
import { cmsController } from "../../controllers/cms.controller.js";
import { femaleTutorialsController } from "../../controllers/femaleTutorials.controller.js";
import { noticeBoardController } from "../../controllers/noticeBoard.controller.js";

export const cmsRoutes = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const tutorialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

cmsRoutes.get("/cms/banners", cmsController.banners);
cmsRoutes.get("/cms/faq", cmsController.faq);
cmsRoutes.get("/cms/policies", cmsController.policies);

cmsRoutes.get("/cms/avatars", avatarsController.list);
cmsRoutes.post("/cms/avatars", upload.single("image"), avatarsController.create);
cmsRoutes.patch("/cms/avatars/:id", upload.single("image"), avatarsController.update);
cmsRoutes.delete("/cms/avatars/:id", avatarsController.remove);

cmsRoutes.get("/cms/female-tutorials", femaleTutorialsController.list);
cmsRoutes.post(
  "/cms/female-tutorials",
  tutorialUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  femaleTutorialsController.create,
);
cmsRoutes.patch(
  "/cms/female-tutorials/:id",
  tutorialUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  femaleTutorialsController.update,
);
cmsRoutes.delete("/cms/female-tutorials/:id", femaleTutorialsController.remove);

cmsRoutes.get("/cms/notice-board", noticeBoardController.list);
cmsRoutes.post("/cms/notice-board", upload.single("image"), noticeBoardController.create);
cmsRoutes.patch("/cms/notice-board/:id", upload.single("image"), noticeBoardController.update);
cmsRoutes.delete("/cms/notice-board/:id", noticeBoardController.remove);
