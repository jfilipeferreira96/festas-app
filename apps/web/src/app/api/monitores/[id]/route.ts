import { NextRequest, NextResponse } from "next/server";
import { monitorService } from "@/services/monitor.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "monitor.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Monitor",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/monitores/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const monitor = await monitorService.getById(id);
    return NextResponse.json(monitor);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/monitores/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { nome, contacto, activo, valorHora } = await request.json();
    const monitor = await monitorService.update(id, {
      nome,
      contacto,
      activo,
      valorHora,
    });
    return NextResponse.json(monitor);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/monitores/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await monitorService.delete(id);
    return NextResponse.json({ message: t("monitor.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
