import { NextRequest, NextResponse } from "next/server";
import { localService } from "@/services/local.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "local.notFound", HAS_RESERVAS: "local.hasReservas" },
  statusMap: { NOT_FOUND: 404, HAS_RESERVAS: 409 },
  serviceName: "Local",
});

// GET /api/locais[?activo=true]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const apenasAtivos = searchParams.get("activo") === "true";
    const locais = apenasAtivos
      ? await localService.listActive()
      : await localService.list();
    return NextResponse.json(locais);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/locais
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { nome, capacidade, activo } = await request.json();
    const local = await localService.create({ nome, capacidade, activo });
    return NextResponse.json(local, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
