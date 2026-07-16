import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { cacifoService } from "@/services/cacifo.service";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Apenas CACIFOS e ADMINISTRADOR
  if (session.user.funcao !== "CACIFOS" && session.user.funcao !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { reservaId, cacifoAtualId, novoCacifoId } = await req.json();
  if (!reservaId || !cacifoAtualId || !novoCacifoId) {
    return NextResponse.json(
      { error: "reservaId, cacifoAtualId e novoCacifoId são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const cacifo = await cacifoService.trocarCacifo(reservaId, cacifoAtualId, novoCacifoId);
    return NextResponse.json(cacifo);
  } catch (error) {
    const msg = (error as Error).message;
    const status =
      msg === "NOT_FOUND" ? 404
      : msg === "CACIFO_NOT_FROM_RESERVA" ? 403
      : msg === "SAME_CACIFO" || msg === "CACIFO_NOT_AVAILABLE" ? 409
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
