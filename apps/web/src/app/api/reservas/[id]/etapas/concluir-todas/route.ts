import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../../error-handler";

type Params = { params: Promise<{ id: string }> };

// POST /api/reservas/:id/etapas/concluir-todas
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const result = await reservaService.marcarEtapasConcluidas(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
