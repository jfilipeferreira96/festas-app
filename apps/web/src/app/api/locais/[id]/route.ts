import { NextRequest, NextResponse } from "next/server";
import { localService } from "@/services/local.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "local.notFound", HAS_RESERVAS: "local.hasReservas" },
  statusMap: { NOT_FOUND: 404, HAS_RESERVAS: 409 },
  serviceName: "Local",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/locais/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const local = await localService.getById(id);
    return NextResponse.json(local);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/locais/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { nome, capacidade, activo } = await request.json();
    const local = await localService.update(id, { nome, capacidade, activo });
    return NextResponse.json(local);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/locais/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await localService.delete(id);
    return NextResponse.json({ message: t("local.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
