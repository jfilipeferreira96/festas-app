import { NextRequest, NextResponse } from "next/server";
import { permissoesService } from "@/services/permissoes.service";
import { requireAuth } from "@/lib/auth-server";
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

// GET /api/permissoes/minhas (any authenticated user)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const funcao = (auth.user as Record<string, unknown>).funcao as Parameters<
      typeof permissoesService.getByFuncao
    >[0];
    const permissoes = await permissoesService.getByFuncao(funcao);

    // Return as a map { modulo: nivelAcesso } for easy frontend consumption
    const permMap: Record<string, string> = {};
    for (const p of permissoes) {
      permMap[p.modulo] = p.nivelAcesso;
    }
    return NextResponse.json({ funcao, permissoes: permMap });
  } catch (error) {
    return handleError(error);
  }
}
