import { NextRequest, NextResponse } from "next/server";
import { fechoCaixaService } from "@/services/fechoCaixa.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    UNAUTHORIZED: "general.forbidden",
    DATA_INVALIDA: "fechoCaixa.dataInvalida",
  },
  statusMap: {
    UNAUTHORIZED: 403,
    DATA_INVALIDA: 400,
  },
  serviceName: "FechoCaixa",
});

// GET /api/fecho-caixa?data=YYYY-MM-DD — totais do dia por método de pagamento
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data") || new Date().toISOString().slice(0, 10);
    const fecho = await fechoCaixaService.getFechoCaixa(data, auth.user);
    return NextResponse.json(fecho);
  } catch (error) {
    return handleError(error);
  }
}
