import { NextResponse } from "next/server";
import Logger from "@/lib/logger";

/**
 * Generic error handler for Route Handlers.
 *
 * Logs the error and returns a JSON error response with HTTP 500.
 * Used by catch-all blocks in route files that don't configure a
 * dedicated error-code map (see {@link createRouteErrorHandler}).
 */
export function handleError(error: unknown): NextResponse {
  Logger.error("Route handler error:", error);

  const message =
    error instanceof Error ? error.message : "Erro interno do servidor";

  return NextResponse.json({ error: message }, { status: 500 });
}
