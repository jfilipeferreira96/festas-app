import { NextRequest, NextResponse } from "next/server";
import { salaLancheService } from "@/services/salaLanche.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "salaLanche.notFound", NAME_REQUIRED: "salaLanche.nameRequired" },
  statusMap: { NOT_FOUND: 404, NAME_REQUIRED: 400 },
  serviceName: "SalaLanche",
});

// GET /api/salas-lanche[?all=true]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const salas = all ? await salaLancheService.listAll() : await salaLancheService.list();
    return NextResponse.json(salas);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/salas-lanche (ADMINISTRADOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const body = await request.json();
    const sala = await salaLancheService.create(body);
    return NextResponse.json(sala, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
