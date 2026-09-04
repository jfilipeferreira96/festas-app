import { NextRequest, NextResponse } from "next/server";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "ajuste.notFound",
    MODO_INVALIDO: "ajuste.modoInvalido",
    VALOR_INVALIDO: "ajuste.valorInvalido",
    MOTIVO_OBRIGATORIO: "ajuste.motivoObrigatorio",
    ALVO_INVALIDO: "ajuste.alvoInvalido",
    CRIANCAS_INVALIDO: "ajuste.criancasInvalido",
  },
  statusMap: {
    NOT_FOUND: 404,
    MODO_INVALIDO: 400,
    VALOR_INVALIDO: 400,
    MOTIVO_OBRIGATORIO: 400,
    ALVO_INVALIDO: 400,
    CRIANCAS_INVALIDO: 400,
  },
  serviceName: "AjustePagamento",
});

// POST /api/ajustes-pagamento/redefinir - redefine o preço final (total ou por criança)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const ajuste = await ajustePagamentoService.redefinirPreco(body, auth.user);
    return NextResponse.json(ajuste, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
