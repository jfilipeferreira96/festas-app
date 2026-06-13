import { NextResponse } from "next/server";
import { t } from "@/lib/i18n-server";
import Logger from "@/lib/logger";

export interface RouteErrorMapConfig {
  errorMap: Record<string, string>;
  statusMap: Record<string, number>;
  serviceName?: string;
}

/**
 * Creates an error handler for Next.js Route Handlers.
 *
 * Mirrors the Express `createErrorHandler`: maps UPPER_SNAKE_CASE service error
 * codes to i18n keys + HTTP status codes, and logs unexpected errors.
 */
export function createRouteErrorHandler(config: RouteErrorMapConfig) {
  const { errorMap, statusMap, serviceName = "Service" } = config;

  return function handleRouteError(error: unknown): NextResponse {
    if (error instanceof Error) {
      const i18nKey = errorMap[error.message];

      if (i18nKey) {
        const status = statusMap[error.message] ?? 400;
        return NextResponse.json({ error: t(i18nKey) }, { status });
      }
    }

    Logger.error(`${serviceName} error:`, error);

    return NextResponse.json(
      {
        error: t("general.serverError"),
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  };
}
