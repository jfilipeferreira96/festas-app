import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/authMiddleware";
import { uploadUserPhoto, uploadMonitorPhoto } from "../controllers/upload.controller";

const router = Router();

// Configure multer — memory storage, max 500KB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

// Upload user profile photo (admin can upload for any user)
router.post(
  "/user/:userId",
  requireAuth,
  upload.single("photo"),
  uploadUserPhoto
);

// Upload monitor profile photo
router.post(
  "/monitor/:monitorId",
  requireAuth,
  upload.single("photo"),
  uploadMonitorPhoto
);

export default router;