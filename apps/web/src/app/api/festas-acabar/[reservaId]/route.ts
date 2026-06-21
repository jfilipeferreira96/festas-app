import { NextRequest, NextResponse } from "next/server";
import { festasAcabarService } from "@/services/festasAcabar.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "FestasAcabar",
});

type Params = { params: Promise<{ reservaId: string }> };

// PATCH /api/festas-acabar/:reservaId — atualizar observações
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "festas_acabar", "escrita");
    if (denied) return denied;

    const { reservaId } = await params;
    const body = await request.json();

    const result = await festasAcabarService.atualizarObservacoes(reservaId, {
      observacoesLesoes: body.observacoesLesoes,
      observacoesBrindes: body.observacoesBrindes,
      observacoesBrindesPais: body.observacoesBrindesPais,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
