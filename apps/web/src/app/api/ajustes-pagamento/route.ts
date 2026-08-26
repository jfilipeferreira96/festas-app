import { NextRequest, NextResponse } from "next/server";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "ajuste.notFound",
    TIPO_INVALIDO: "ajuste.tipoInvalido",
    VALOR_INVALIDO: "ajuste.valorInvalido",
    MOTIVO_OBRIGATORIO: "ajuste.motivoObrigatorio",
    ALVO_INVALIDO: "ajuste.alvoInvalido",
  },
  statusMap: {
    NOT_FOUND: 404,
    TIPO_INVALIDO: 400,
    VALOR_INVALIDO: 400,
    MOTIVO_OBRIGATORIO: 400,
    ALVO_INVALIDO: 400,
  },
  serviceName: "AjustePagamento",
});

// GET /api/ajustes-pagamento?reservaId= | ?entradaLivreId=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const ajustes = await ajustePagamentoService.list({
      reservaId: searchParams.get("reservaId") || undefined,
      entradaLivreId: searchParams.get("entradaLivreId") || undefined,
    });
    return NextResponse.json(ajustes);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/ajustes-pagamento
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const ajuste = await ajustePagamentoService.create(body, auth.user);
    return NextResponse.json(ajuste, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
