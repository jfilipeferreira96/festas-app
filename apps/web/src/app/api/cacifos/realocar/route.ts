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

  const { reservaId } = await req.json();
  if (!reservaId) {
    return NextResponse.json({ error: "reservaId é obrigatório" }, { status: 400 });
  }

  try {
    const resultado = await cacifoService.realocarTodos(reservaId);
    return NextResponse.json(resultado);
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
