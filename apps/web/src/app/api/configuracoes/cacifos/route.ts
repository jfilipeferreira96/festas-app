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

// GET /api/configuracoes/cacifos
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const config = await configuracaoCacifoService.getConfig();
    return NextResponse.json(config);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/configuracoes/cacifos
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR", "GESTOR");
    if (denied) return denied;

    const { totalCacifos, nomes } = await request.json();
    const config = await configuracaoCacifoService.updateConfig({ totalCacifos, nomes });
    return NextResponse.json({ message: t("configuracaoCacifo.updated"), data: config });
  } catch (error) {
    return handleError(error);
  }
}
