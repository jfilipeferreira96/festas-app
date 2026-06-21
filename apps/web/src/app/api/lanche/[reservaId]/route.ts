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

// PATCH /api/lanche/:reservaId — atualizar notas de lanche / itens
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
    });
    return NextResponse.json(menu);
  } catch (error) {
    return handleError(error);
  }
}
