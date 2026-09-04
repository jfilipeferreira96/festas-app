import { NextRequest, NextResponse } from "next/server";
import { lancheService } from "@/services/lanche.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "FestasAcabar (Lanche Entrada)",
});

type Params = { params: Promise<{ entradaLivreId: string }> };

const ESTADOS_VALIDOS = ["NAO_INICIADO", "A_DECORRER", "TERMINADO"];

// PATCH /api/festas-acabar/entrada/:entradaLivreId/lanche
// Confirmação do lanche de uma entrada livre pelo balcão (FESTAS_ACABAR).
// A rota /api/lanche/entrada/[id] exige módulo "lanche" escrita,
// inacessível a esta função - daí a rota dedicada.
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "festas_acabar", "escrita");
    if (denied) return denied;

    const { entradaLivreId } = await params;
    const body = await request.json();

    if (!body.estadoLanche || !ESTADOS_VALIDOS.includes(body.estadoLanche)) {
      return NextResponse.json({ error: "estadoLanche inválido" }, { status: 400 });
    }

    const result = await lancheService.atualizarEstadoLancheEntrada(
      entradaLivreId,
      body.estadoLanche
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
