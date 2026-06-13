import { NextRequest, NextResponse } from "next/server";
import { extraService } from "@/services/extra.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "extra.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Extra",
});

// GET /api/extras
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const extras = await extraService.list();
    return NextResponse.json(extras);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/extras
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { nome, descricao, precoUnitario, icone, categoria, subcategoria, requerTexto, locaisIds } =
      await request.json();
    const extra = await extraService.create({
      nome,
      descricao,
      precoUnitario,
      icone,
      categoria,
      subcategoria,
      requerTexto,
      locaisIds: locaisIds || [],
    });
    return NextResponse.json(extra, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
