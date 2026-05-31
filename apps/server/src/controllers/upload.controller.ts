import type { Request, Response } from "express";
import { uploadService } from "../services/upload.service";

const ERROR_MAP: Record<string, string> = {
  USER_NOT_FOUND: "upload.userNotFound",
  NOT_FOUND: "upload.notFound",
  INVALID_FILE_TYPE: "upload.invalidFileType",
  FILE_TOO_LARGE: "upload.fileTooLarge",
  NO_FILE: "upload.noFile",
};

const STATUS_MAP: Record<string, number> = {
  USER_NOT_FOUND: 404,
  NOT_FOUND: 404,
  INVALID_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  NO_FILE: 400,
};

function handleError(error: unknown, req: Request, res: Response) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const i18nKey = ERROR_MAP[message] || "upload.error";
  const status = STATUS_MAP[message] || 500;
  res.status(status).json({ error: req.t(i18nKey) });
}

export const uploadUserPhoto = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    if (!req.file) throw new Error("NO_FILE");

    const imageUrl = await uploadService.uploadUserPhoto(userId, req.file);
    res.status(200).json({ message: req.t("upload.success"), data: { imageUrl } });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const uploadMonitorPhoto = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { monitorId } = req.params;
    if (!monitorId) return res.status(400).json({ error: "monitorId is required" });

    if (!req.file) throw new Error("NO_FILE");

    const imageUrl = await uploadService.uploadMonitorPhoto(monitorId, req.file);
    res.status(200).json({ message: req.t("upload.success"), data: { imageUrl } });
  } catch (error) {
    handleError(error, req, res);
  }
};