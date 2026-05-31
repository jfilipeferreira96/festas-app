import type { Request, Response } from "express";
import Logger from "../lib/logger";

export interface ErrorMapConfig {
  errorMap: Record<string, string>;
  statusMap: Record<string, number>;
  serviceName?: string;
}

/**
 * Creates a centralized error handler function for controllers
 */
export function createErrorHandler(config: ErrorMapConfig) {
  const { errorMap, statusMap, serviceName = "Service" } = config;

  return function handleError(error: unknown, req: Request, res: Response) {
    if (error instanceof Error) {
      const errorMessage = errorMap[error.message];

      // Handle mapped errors
      if (errorMessage) {
        const status = statusMap[error.message] || 400;
        return res.status(status).json({ error: req.t(errorMessage) });
      }
    }

    // Log unexpected errors
    Logger.error(`${serviceName} error:`, error);

    // Return internal server error
    return res.status(500).json({
      error: req.t("general.serverError"),
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : undefined
          : undefined,
    });
  };
}
