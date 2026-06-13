import { NextRequest, NextResponse } from "next/server";
import { extraService } from "@/services/extra.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "extra.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Extra",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/extras/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const extra = await extraService.getById(id);
    return NextResponse.json(extra);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/extras/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { nome, descricao, precoUnitario, icone, categoria, subcategoria, requerTexto, locaisIds } =
      await request.json();
    const extra = await extraService.update(id, {
      nome,
      descricao,
      precoUnitario,
      icone,
      categoria,
      subcategoria,
      requerTexto,
      locaisIds,
    });
    return NextResponse.json(extra);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/extras/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await extraService.delete(id);
    return NextResponse.json({ message: t("extra.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
