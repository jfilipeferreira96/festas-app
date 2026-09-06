import { NextResponse } from "next/server";
import Logger from "@/lib/logger";

/** Códigos de serviço conhecidos → mensagem PT + status HTTP. */
const KNOWN_ERRORS: Record<string, { message: string; status: number }> = {
  NOT_FOUND: { message: "Registo não encontrado.", status: 404 },
  CANNOT_DELETE_ACTIVE: {
    message: "Não é possível eliminar uma entrada em curso. Conclua ou cancele primeiro.",
    status: 409,
  },
  CANNOT_MODIFY_IN_PROGRESS: {
    message: "Não é possível alterar um registo em curso.",
    status: 409,
  },
};

/**
 * Generic error handler for Route Handlers.
 *
 * Logs the error and returns a JSON error response with HTTP 500.
 * Used by catch-all blocks in route files that don't configure a
 * dedicated error-code map (see {@link createRouteErrorHandler}).
 */
export function handleError(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : undefined;
  const known = code ? KNOWN_ERRORS[code] : undefined;

  if (known) {
    Logger.warn(`Route handler error: ${code}`);
    return NextResponse.json({ error: known.message }, { status: known.status });
  }

  Logger.error("Route handler error:", error);

  const message =
    error instanceof Error ? error.message : "Erro interno do servidor";

  return NextResponse.json({ error: message }, { status: 500 });
}
