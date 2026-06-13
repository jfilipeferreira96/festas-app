import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

// GET /api/reservas/ativas
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const reservas = await reservaService.getActive();
    return NextResponse.json(reservas);
  } catch (error) {
    return handleError(error);
  }
}
