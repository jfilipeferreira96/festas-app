import { NextRequest, NextResponse } from "next/server";
import { relatorioService } from "@/services/relatorio.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    INVALID_DATE_RANGE: "relatorio.invalidDateRange",
    DATA_INICIO_REQUIRED: "relatorio.dataInicioRequired",
    DATA_FIM_REQUIRED: "relatorio.dataFimRequired",
  },
  statusMap: {
    INVALID_DATE_RANGE: 400,
    DATA_INICIO_REQUIRED: 400,
    DATA_FIM_REQUIRED: 400,
  },
  serviceName: "Relatório",
});

// GET /api/relatorios/financeiro?dataInicio=&dataFim=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    if (!dataInicio) throw new Error("DATA_INICIO_REQUIRED");
    if (!dataFim) throw new Error("DATA_FIM_REQUIRED");

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new Error("INVALID_DATE_RANGE");
    }
    if (inicio > fim) {
      throw new Error("INVALID_DATE_RANGE");
    }

    const relatorio = await relatorioService.getRelatorioFinanceiro(inicio, fim);
    return NextResponse.json(relatorio);
  } catch (error) {
    return handleError(error);
  }
}
