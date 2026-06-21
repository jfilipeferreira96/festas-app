import { NextRequest, NextResponse } from "next/server";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "ConfiguracaoPreco",
});

// GET /api/configuracoes/precos
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const config = await configuracaoPrecoService.getConfig();
    return NextResponse.json(config);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/configuracoes/precos (ADMINISTRADOR, GESTOR)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const body = await request.json();
    const config = await configuracaoPrecoService.updateConfig(body);
    return NextResponse.json({ message: t("configuracaoPreco.updated"), data: config });
  } catch (error) {
    return handleError(error);
  }
}
