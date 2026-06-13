import { NextRequest, NextResponse } from "next/server";
import { monitorService } from "@/services/monitor.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "monitor.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Monitor",
});

// GET /api/monitores[?ativos=true]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const apenasAtivos = searchParams.get("ativos") === "true";
    const monitores = apenasAtivos
      ? await monitorService.listActive()
      : await monitorService.list();
    return NextResponse.json(monitores);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/monitores
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { nome, contacto, activo } = await request.json();
    const monitor = await monitorService.create({
      nome,
      contacto,
      activo,
    });
    return NextResponse.json(monitor, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
