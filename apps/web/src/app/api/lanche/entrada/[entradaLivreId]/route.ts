import { NextRequest, NextResponse } from "next/server";
import { lancheService } from "@/services/lanche.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Lanche (Entrada Livre)",
});

type Params = { params: Promise<{ entradaLivreId: string }> };

// PATCH /api/lanche/entrada/:entradaLivreId — atualizar estado lanche entrada livre
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "lanche", "escrita");
    if (denied) return denied;

    const { entradaLivreId } = await params;
    const body = await request.json();

    if (body.estadoLanche) {
      if (!["NAO_INICIADO", "A_DECORRER", "TERMINADO"].includes(body.estadoLanche)) {
        return NextResponse.json({ error: "estadoLanche inválido" }, { status: 400 });
      }
      const result = await lancheService.atualizarEstadoLancheEntrada(entradaLivreId, body.estadoLanche);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
