import path from "path";
import fs from "fs";
import prisma from "@festas/db";
import Logger from "@/lib/logger";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "profile-photos");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIMES = ["image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 500 * 1024; // 500KB

interface UploadedFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const uploadService = {
  /**
   * Upload a profile photo for a user
   */
  async uploadUserPhoto(userId: string, file: UploadedFile): Promise<string> {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error("INVALID_FILE_TYPE");
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Remove old photo if exists
    if (user.image) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(user.image));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    const filename = `${userId}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, file.buffer);

    const imageUrl = `/api/uploads/profile-photos/${filename}`;
    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    Logger.info(`Profile photo uploaded for user ${userId}`);
    return imageUrl;
  },

  /**
   * Upload a profile photo for a monitor
   */
  async uploadMonitorPhoto(monitorId: string, file: UploadedFile): Promise<string> {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error("INVALID_FILE_TYPE");
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }

    const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) {
      throw new Error("NOT_FOUND");
    }

    // Remove old photo if exists
    if (monitor.fotoUrl) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(monitor.fotoUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    const filename = `monitor-${monitorId}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, file.buffer);

    const imageUrl = `/api/uploads/profile-photos/${filename}`;
    await prisma.monitor.update({
      where: { id: monitorId },
      data: { fotoUrl: imageUrl },
    });

    Logger.info(`Profile photo uploaded for monitor ${monitorId}`);
    return imageUrl;
  },
};