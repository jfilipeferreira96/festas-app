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

type Params = { params: Promise<{ id: string }> };

// GET /api/cacifos/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const cacifo = await cacifoService.getById(id);
    return NextResponse.json(cacifo);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/cacifos/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { notas, criancas } = await request.json();
    const cacifo = await cacifoService.actualizarCacifo(id, { notas, criancas });
    return NextResponse.json(cacifo);
  } catch (error) {
    return handleError(error);
  }
}
