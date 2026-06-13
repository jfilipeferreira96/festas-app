import { NextRequest, NextResponse } from "next/server";
import { cacifoService } from "@/services/cacifo.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "cacifo.notFound",
    ALREADY_OCCUPIED: "cacifo.alreadyOccupied",
    CANNOT_RELEASE_FREE: "cacifo.cannotReleaseFree",
  },
  statusMap: {
    NOT_FOUND: 404,
    ALREADY_OCCUPIED: 409,
    CANNOT_RELEASE_FREE: 400,
  },
  serviceName: "Cacifo",
});

// POST /api/cacifos/atribuir
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { reservaId, cacifos } = await request.json();
    const results = await cacifoService.atribuirCacifos(reservaId, cacifos);
    return NextResponse.json(results);
  } catch (error) {
    return handleError(error);
  }
}
