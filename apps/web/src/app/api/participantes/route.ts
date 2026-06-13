import { NextRequest, NextResponse } from "next/server";
import { participanteService } from "@/services/participante.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "participante.notFound",
    MAX_PARTICIPANTES: "participante.maxParticipantes",
    RESERVA_NOT_FOUND: "participante.reservaNotFound",
  },
  statusMap: {
    NOT_FOUND: 404,
    MAX_PARTICIPANTES: 400,
    RESERVA_NOT_FOUND: 404,
  },
  serviceName: "Participante",
});

// GET /api/participantes?reservaId=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const reservaId = searchParams.get("reservaId");
    if (!reservaId) {
      return NextResponse.json({ error: "reservaId é obrigatório" }, { status: 400 });
    }

    const participantes = await participanteService.listByReserva(reservaId);
    return NextResponse.json(participantes);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/participantes
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { reservaId, nome } = await request.json();
    const participante = await participanteService.adicionarParticipante(reservaId, nome);
    return NextResponse.json({ message: t("participante.added"), data: participante }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
