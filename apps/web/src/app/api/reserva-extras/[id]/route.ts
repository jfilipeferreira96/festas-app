import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    EXTRA_NOT_FOUND: "extra.notFound",
  },
  statusMap: {
    EXTRA_NOT_FOUND: 404,
  },
  serviceName: "ReservaExtra",
});

// PATCH /api/reserva-extras/[id] - alterna o estado de conclusão do extra
// (entregue/prestado no dia da festa - check na tabela de festas)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const result = await reservaService.toggleReservaExtra(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
