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

// PATCH /api/participantes/presenca/em-lote
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { reservaId, presenca } = (await request.json()) as { reservaId: string; presenca: boolean };
    if (!reservaId) {
      return NextResponse.json({ error: "reservaId é obrigatório" }, { status: 400 });
    }

    const participantes = await participanteService.marcarTodosPresenca(reservaId, presenca ?? true);
    return NextResponse.json({ message: t("participante.confirmed"), data: participantes });
  } catch (error) {
    return handleError(error);
  }
}
