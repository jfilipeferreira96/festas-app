import { NextRequest, NextResponse } from "next/server";
import { excecaoCalendarioService } from "@/services/excecaoCalendario.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { ALREADY_EXISTS: "excecaoCalendario.alreadyExists" },
  statusMap: { ALREADY_EXISTS: 409 },
  serviceName: "ExcecaoCalendario",
});

// GET /api/excecoes-calendario
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const excecoes = await excecaoCalendarioService.list();
    return NextResponse.json(excecoes);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/excecoes-calendario (ADMINISTRADOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const body = await request.json();
    const excecao = await excecaoCalendarioService.create(body);
    return NextResponse.json(excecao, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
