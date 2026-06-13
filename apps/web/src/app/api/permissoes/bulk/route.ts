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

// PUT /api/permissoes/bulk (ADMIN)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { permissoes } = await request.json();
    if (!Array.isArray(permissoes)) throw new Error("INVALID_NIVEL");

    // Filter out ADMINISTRADOR entries — they are immutable
    const filtered = permissoes.filter(
      (p: { funcao: string }) => p.funcao !== "ADMINISTRADOR"
    );

    const results = await permissoesService.bulkUpdate(filtered);
    return NextResponse.json({
      message: t("permissao.updatedSuccessfully"),
      data: results,
    });
  } catch (error) {
    return handleError(error);
  }
}
