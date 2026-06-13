import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/reservas/:id/etapas
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { etapaId } = await request.json();
    const result = await reservaService.toggleEtapa(id, etapaId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
