import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

// GET /api/reservas/concluidas[?data=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data") || undefined;
    const reservas = await reservaService.getConcluidas(data);
    return NextResponse.json(reservas);
  } catch (error) {
    return handleError(error);
  }
}
