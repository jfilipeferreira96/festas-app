import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../../error-handler";

type Params = { params: Promise<{ id: string; etapaId: string }> };

// DELETE /api/reservas/:id/etapas/:etapaId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id, etapaId } = await params;
    const result = await reservaService.removerEtapa(id, etapaId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
