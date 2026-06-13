import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/reservas/:id/estado
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { estado } = await request.json();
    const reserva = await reservaService.updateStatus(id, estado);
    return NextResponse.json(reserva);
  } catch (error) {
    return handleError(error);
  }
}
