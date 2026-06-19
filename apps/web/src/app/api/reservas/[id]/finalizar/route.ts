import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// POST /api/reservas/:id/finalizar
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reserva = await reservaService.finalizar(id, {
      custoExcessoManual: typeof body.custoExcesso === "number" ? body.custoExcesso : undefined,
    });
    return NextResponse.json(reserva);
  } catch (error) {
    return handleError(error);
  }
}
