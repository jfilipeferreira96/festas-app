import { NextRequest, NextResponse } from "next/server";
import { slotHorarioService } from "@/services/slotHorario.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "slotHorario.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "SlotHorario",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/slots-horario/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const slot = await slotHorarioService.getById(id);
    return NextResponse.json(slot);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/slots-horario/:id (ADMINISTRADOR)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const body = await request.json();
    const slot = await slotHorarioService.update(id, body);
    return NextResponse.json(slot);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/slots-horario/:id (ADMINISTRADOR)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    await slotHorarioService.delete(id);
    return NextResponse.json({ message: t("slotHorario.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
