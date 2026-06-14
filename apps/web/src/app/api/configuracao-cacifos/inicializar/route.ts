import { NextRequest, NextResponse } from "next/server";
import { configuracaoCacifoService } from "@/services/configuracaoCacifo.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    CONFIG_ALREADY_EXISTS: "configuracaoCacifo.alreadyExists",
    CANNOT_REDUCE_OCCUPIED: "configuracaoCacifo.cannotReduceOccupied",
  },
  statusMap: {
    CONFIG_ALREADY_EXISTS: 409,
    CANNOT_REDUCE_OCCUPIED: 409,
  },
  serviceName: "ConfiguracaoCacifo",
});

// POST /api/configuracao-cacifos/inicializar (ADMINISTRADOR, GESTOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR", "GESTOR");
    if (denied) return denied;

    const { totalCacifos } = await request.json();
    const config = await configuracaoCacifoService.inicializar(totalCacifos);
    return NextResponse.json(
      { message: t("configuracaoCacifo.initialized"), data: config },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
