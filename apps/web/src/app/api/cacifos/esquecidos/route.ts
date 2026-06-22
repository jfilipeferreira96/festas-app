import { NextRequest, NextResponse } from "next/server";
import { cacifoService } from "@/services/cacifo.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "cacifo.notFound",
  },
  statusMap: {
    NOT_FOUND: 404,
  },
  serviceName: "Cacifo",
});

// GET /api/cacifos/esquecidos
// Lista cacifos marcados OCUPADO/RESERVADO cuja reserva já está CONCLUIDA/CANCELADA.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const esquecidos = await cacifoService.getCacifosEsquecidos();
    return NextResponse.json(esquecidos);
  } catch (error) {
    return handleError(error);
  }
}
