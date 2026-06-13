import { NextRequest, NextResponse } from "next/server";
import { etapaFestaService } from "@/services/etapaFesta.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "etapaFesta.notFound", NOME_REQUIRED: "etapaFesta.nomeRequired" },
  statusMap: { NOT_FOUND: 404, NOME_REQUIRED: 400 },
  serviceName: "EtapaFesta",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/etapas-festa/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const etapa = await etapaFestaService.getById(id);
    return NextResponse.json(etapa);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/etapas-festa/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { nome, descricao, ordem, icone, activo } = await request.json();
    const etapa = await etapaFestaService.update(id, {
      nome,
      descricao,
      ordem,
      icone,
      activo,
    });
    return NextResponse.json(etapa);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/etapas-festa/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await etapaFestaService.delete(id);
    return NextResponse.json({ message: t("etapaFesta.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
