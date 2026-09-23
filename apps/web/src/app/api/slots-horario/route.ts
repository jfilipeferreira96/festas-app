import { NextRequest, NextResponse } from "next/server";
import { slotHorarioService } from "@/services/slotHorario.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "slotHorario.notFound",
    EXTRA_NOT_FOUND: "slotHorario.extraNotFound",
    EXTRAS_OBRIGATORIOS_INVALID: "slotHorario.extrasInvalid",
  },
  statusMap: {
    NOT_FOUND: 404,
    EXTRA_NOT_FOUND: 400,
    EXTRAS_OBRIGATORIOS_INVALID: 400,
  },
  serviceName: "SlotHorario",
});

// GET /api/slots-horario[?all=true]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const data = searchParams.get("data") ?? undefined;
    const slots = all
      ? await slotHorarioService.listAll()
      : await slotHorarioService.list(data ? { data } : undefined);
    return NextResponse.json(slots);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/slots-horario (ADMINISTRADOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const body = await request.json();
    const slot = await slotHorarioService.create(body);
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
