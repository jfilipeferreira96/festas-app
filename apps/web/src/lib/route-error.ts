import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { t } from "@/lib/i18n-server";
import Logger from "@/lib/logger";

export interface RouteErrorMapConfig {
  errorMap: Record<string, string>;
  statusMap: Record<string, number>;
  serviceName?: string;
}

/**
 * Traduz erros conhecidos do Prisma para respostas HTTP amigáveis - sem isto,
 * falhas previsíveis (email duplicado, FK de extra/monitor apagado, registo
 * desaparecido) chegavam ao cliente como 500 "Erro interno do servidor".
 */
function traduzirErroPrisma(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (error.code) {
    case "P2002": // Violação de unique (ex.: Cliente.email)
      return { status: 409, message: t("general.registoDuplicado") };
    case "P2003": // FK inválida (ex.: extra/monitor/sala entretanto apagada)
      return { status: 400, message: t("general.registoAssociadoInvalido") };
    case "P2025": // Registo alvo não existe
      return { status: 404, message: t("general.notFound") };
    default:
      return null;
  }
}

/** Corpo JSON malformado é erro do cliente (400), não do servidor (500). */
function ehJsonInvalido(error: unknown): boolean {
  return error instanceof SyntaxError;
}

/**
 * Creates an error handler for Next.js Route Handlers.
 *
 * Mirrors the Express `createErrorHandler`: maps UPPER_SNAKE_CASE service error
 * codes to i18n keys + HTTP status codes, translates Prisma errors, and logs
 * unexpected errors.
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

    const prisma = traduzirErroPrisma(error);
    if (prisma) {
      const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "desconhecido";
      Logger.warn(`${serviceName} Prisma error: ${code}`);
      return NextResponse.json({ error: prisma.message }, { status: prisma.status });
    }

    if (ehJsonInvalido(error)) {
      return NextResponse.json({ error: t("general.badRequest") }, { status: 400 });
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
