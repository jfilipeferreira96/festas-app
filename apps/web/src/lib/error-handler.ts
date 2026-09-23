import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Logger from "@/lib/logger";

/** Códigos de serviço conhecidos → mensagem PT + status HTTP. */
const KNOWN_ERRORS: Record<string, { message: string; status: number }> = {
  NOT_FOUND: { message: "Registo não encontrado.", status: 404 },
  VALOR_INVALIDO: { message: "Valor inválido.", status: 400 },
  NOT_ACTIVE: {
    message: "A entrada já não está activa. Actualize a página.",
    status: 409,
  },
  PAGAMENTO_OBRIGATORIO: {
    message: "É obrigatório indicar o estado do pagamento.",
    status: 400,
  },
  PAGAMENTO_VALOR_INVALIDO: {
    message: "Valor de pagamento inválido.",
    status: 400,
  },
  PAGAMENTO_METODO_OBRIGATORIO: {
    message: "Método de pagamento inválido.",
    status: 400,
  },
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
 * Traduz erros conhecidos do Prisma para respostas HTTP amigáveis - sem isto,
 * falhas previsíveis (email duplicado, FK de extra apagado, registo
 * desaparecido) chegavam ao cliente como 500 "Erro interno do servidor".
 */
function traduzirErroPrisma(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (error.code) {
    case "P2002":
      return { status: 409, message: "Já existe um registo com estes dados." };
    case "P2003":
      return { status: 400, message: "Um dos registos associados já não existe. Recarregue a página e tente novamente." };
    case "P2025":
      return { status: 404, message: "Registo não encontrado." };
    default:
      return null;
  }
}

/**
 * Generic error handler for Route Handlers.
 *
 * Maps known UPPER_SNAKE_CASE service codes and Prisma errors to friendly PT
 * messages; malformed request JSON becomes 400 (não 500). Used by catch-all
 * blocks in route files that don't configure a dedicated error-code map
 * (see {@link createRouteErrorHandler}).
 */
export function handleError(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : undefined;
  const known = code ? KNOWN_ERRORS[code] : undefined;

  if (known) {
    Logger.warn(`Route handler error: ${code}`);
    return NextResponse.json({ error: known.message }, { status: known.status });
  }

  const prisma = traduzirErroPrisma(error);
  if (prisma) {
    Logger.warn(`Route handler Prisma error (${prisma.status})`);
    return NextResponse.json({ error: prisma.message }, { status: prisma.status });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  Logger.error("Route handler error:", error);

  const message =
    error instanceof Error ? error.message : "Erro interno do servidor";

  return NextResponse.json({ error: message }, { status: 500 });
}
