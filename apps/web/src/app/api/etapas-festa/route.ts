import { NextRequest, NextResponse } from "next/server";
import { etapaFestaService } from "@/services/etapaFesta.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "etapaFesta.notFound", NOME_REQUIRED: "etapaFesta.nomeRequired" },
  statusMap: { NOT_FOUND: 404, NOME_REQUIRED: 400 },
  serviceName: "EtapaFesta",
});

// GET /api/etapas-festa
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const etapas = await etapaFestaService.list();
    return NextResponse.json(etapas);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/etapas-festa
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { nome, descricao, ordem, icone } = await request.json();
    const etapa = await etapaFestaService.create({
      nome,
      descricao,
      ordem,
      icone,
    });
    return NextResponse.json(etapa, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
