import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { cacifoService } from "@/services/cacifo.service";

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { reservaId, quantidade } = await req.json();
  if (!reservaId || !quantidade) {
    return NextResponse.json({ error: "reservaId e quantidade são obrigatórios" }, { status: 400 });
  }

  try {
    const result = await cacifoService.preReservarCacifos(reservaId, quantidade);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}