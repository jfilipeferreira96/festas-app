import { NextRequest, NextResponse } from "next/server";
import { salaLancheService } from "@/services/salaLanche.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "salaLanche.notFound", NAME_REQUIRED: "salaLanche.nameRequired" },
  statusMap: { NOT_FOUND: 404, NAME_REQUIRED: 400 },
  serviceName: "SalaLanche",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/salas-lanche/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const sala = await salaLancheService.getById(id);
    return NextResponse.json(sala);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/salas-lanche/:id (ADMINISTRADOR)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const sala = await salaLancheService.update(id, body);
    return NextResponse.json(sala);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/salas-lanche/:id (ADMINISTRADOR)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    await salaLancheService.delete(id);
    return NextResponse.json({ message: t("salaLanche.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
