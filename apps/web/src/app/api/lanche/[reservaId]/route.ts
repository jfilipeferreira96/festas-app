import { NextRequest, NextResponse } from "next/server";
import { lancheService } from "@/services/lanche.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Lanche",
});

type Params = { params: Promise<{ reservaId: string }> };

// GET /api/lanche/:reservaId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "lanche", "leitura");
    if (denied) return denied;

    const { reservaId } = await params;
    const lanche = await lancheService.getLancheByReservaId(reservaId);
    return NextResponse.json(lanche);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/lanche/:reservaId — atualizar notas de lanche / itens / observações lesões
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "lanche", "escrita");
    if (denied) return denied;

    const { reservaId } = await params;
    const body = await request.json();
    const menu = await lancheService.atualizarNotasLanche({
      reservaId,
      notasLanche: body.notasLanche,
      itensLanche: body.itensLanche,
      observacoesLesoes: body.observacoesLesoes,
    });
    return NextResponse.json(menu);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/lanche/:reservaId/estado — atualizar estado do lanche
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "lanche", "escrita");
    if (denied) return denied;

    const { reservaId } = await params;
    const body = await request.json();
    if (!body.estadoLanche || !["NAO_INICIADO", "A_DECORRER", "TERMINADO"].includes(body.estadoLanche)) {
      return NextResponse.json({ error: "estadoLanche inválido" }, { status: 400 });
    }
    const result = await lancheService.atualizarEstadoLanche(reservaId, body.estadoLanche);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
