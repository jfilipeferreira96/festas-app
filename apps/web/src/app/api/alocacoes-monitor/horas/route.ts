import { NextRequest, NextResponse } from "next/server";
import { alocacaoMonitorService } from "@/services/alocacaoMonitor.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "monitor.notFound",
  },
  statusMap: {
    NOT_FOUND: 404,
  },
  serviceName: "HorasMonitor",
});

// GET /api/alocacoes-monitor/horas?monitorId=&dataInicio=&dataFim=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // Apenas ADMINISTRADOR pode ver custos/horas trabalhadas
    const funcao = auth.user.funcao as string | undefined;
    if (funcao !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const monitorId = searchParams.get("monitorId");
    const dataInicio = searchParams.get("dataInicio") ?? undefined;
    const dataFim = searchParams.get("dataFim") ?? undefined;

    if (!monitorId) {
      return NextResponse.json(
        { error: "monitorId é obrigatório" },
        { status: 400 }
      );
    }

    const resultado = await alocacaoMonitorService.calcularHorasMonitor(
      monitorId,
      dataInicio,
      dataFim
    );
    return NextResponse.json(resultado);
  } catch (error) {
    return handleError(error);
  }
}
