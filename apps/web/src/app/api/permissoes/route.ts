import { NextRequest, NextResponse } from "next/server";
import { permissoesService } from "@/services/permissoes.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

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

// GET /api/permissoes (ADMIN)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const permissoes = await permissoesService.list();
    return NextResponse.json(permissoes);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/permissoes (ADMIN)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { funcao, modulo, nivelAcesso } = await request.json();
    const permissao = await permissoesService.update({ funcao, modulo, nivelAcesso });
    return NextResponse.json(permissao);
  } catch (error) {
    return handleError(error);
  }
}
