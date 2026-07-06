import { NextRequest, NextResponse } from "next/server";
import { alocacaoMonitorService } from "@/services/alocacaoMonitor.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    MES_INVALIDO: "Mês inválido",
  },
  statusMap: {
    MES_INVALIDO: 400,
  },
  serviceName: "ResumoMensalMonitores",
});

// GET /api/alocacoes-monitor/resumo-mensal?mes=2026-07
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // Apenas ADMINISTRADOR pode ver compensações monetárias
    const funcao = auth.user.funcao as string | undefined;
    if (funcao !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes");

    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json(
        { error: "Parâmetro 'mes' é obrigatório (formato: YYYY-MM)" },
        { status: 400 },
      );
    }

    const resultado = await alocacaoMonitorService.getResumoMensal(mes);
    return NextResponse.json(resultado);
  } catch (error) {
    return handleError(error);
  }
}
