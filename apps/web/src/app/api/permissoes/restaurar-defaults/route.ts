import { NextRequest, NextResponse } from "next/server";
import { permissoesService } from "@/services/permissoes.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "permissao.notFound",
    INVALID_MODULO: "permissao.invalidModulo",
    INVALID_NIVEL: "permissao.invalidNivel",
    ADMIN_IMMUTABLE: "permissao.adminImmutable",
  },
  statusMap: {
    NOT_FOUND: 404,
    INVALID_MODULO: 400,
    INVALID_NIVEL: 400,
    ADMIN_IMMUTABLE: 403,
  },
  serviceName: "Permissão",
});

// POST /api/permissoes/restaurar-defaults (ADMIN)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    // Delete all existing permissions and re-seed
    await permissoesService.seedDefaults();
    const permissoes = await permissoesService.list();
    return NextResponse.json({
      message: t("permissao.restoredDefaults"),
      data: permissoes,
    });
  } catch (error) {
    return handleError(error);
  }
}
