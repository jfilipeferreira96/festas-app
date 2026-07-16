import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { reservaService } from "@/services/reserva.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Apenas CACIFOS e ADMINISTRADOR
  if (session.user.funcao !== "CACIFOS" && session.user.funcao !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const result = await reservaService.actualizarEstadoCacifos(id, {
      chamado: body.chamado,
      concluido: body.concluido,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}