import { NextRequest, NextResponse } from "next/server";
import { alocacaoMonitorService } from "@/services/alocacaoMonitor.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

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

// GET /api/alocacoes-monitor[?data=&dataInicio=&dataFim=&monitorId=&localId=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const monitorId = searchParams.get("monitorId");
    const localId = searchParams.get("localId");

    const alocacoes = await alocacaoMonitorService.list({
      ...(data ? { data } : {}),
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
      ...(monitorId ? { monitorId } : {}),
      ...(localId ? { localId } : {}),
    });
    return NextResponse.json(alocacoes);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/alocacoes-monitor (ADMINISTRADOR, GESTOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR", "GESTOR");
    if (denied) return denied;

    const { data, horaInicio, horaFim, monitorId, localId, observacoes } = await request.json();
    const alocacao = await alocacaoMonitorService.create({
      data,
      horaInicio: Number(horaInicio),
      horaFim: Number(horaFim),
      monitorId,
      localId,
      observacoes,
    });
    return NextResponse.json(alocacao, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
