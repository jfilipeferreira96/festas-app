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

// GET /api/cacifos/contadores
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const contadores = await cacifoService.getContadores();
    return NextResponse.json(contadores);
  } catch (error) {
    return handleError(error);
  }
}
