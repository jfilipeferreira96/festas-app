import { NextRequest, NextResponse } from "next/server";
import { alocacaoMonitorService } from "@/services/alocacaoMonitor.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "alocacao.notFound",
    MONITOR_REQUIRED: "alocacao.monitorRequired",
    LOCAL_REQUIRED: "alocacao.localRequired",
    DATA_REQUIRED: "alocacao.dataRequired",
    HORAS_INVALIDAS: "alocacao.horasInvalidas",
    MONITOR_OVERLAP: "alocacao.monitorOverlap",
  },
  statusMap: {
    NOT_FOUND: 404,
    MONITOR_REQUIRED: 400,
    LOCAL_REQUIRED: 400,
    DATA_REQUIRED: 400,
    HORAS_INVALIDAS: 400,
    MONITOR_OVERLAP: 409,
  },
  serviceName: "AlocacaoMonitor",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/alocacoes-monitor/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const alocacao = await alocacaoMonitorService.getById(id);
    return NextResponse.json(alocacao);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/alocacoes-monitor/:id (ADMINISTRADOR, GESTOR)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const { data, horaInicio, horaFim, monitorId, localId, observacoes } = await request.json();
    const alocacao = await alocacaoMonitorService.update(id, {
      ...(data !== undefined ? { data } : {}),
      ...(horaInicio !== undefined ? { horaInicio: Number(horaInicio) } : {}),
      ...(horaFim !== undefined ? { horaFim: Number(horaFim) } : {}),
      ...(monitorId !== undefined ? { monitorId } : {}),
      ...(localId !== undefined ? { localId } : {}),
      ...(observacoes !== undefined ? { observacoes } : {}),
    });
    return NextResponse.json(alocacao);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/alocacoes-monitor/:id (ADMINISTRADOR, GESTOR)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    await alocacaoMonitorService.delete(id);
    return NextResponse.json({ message: t("alocacao.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
