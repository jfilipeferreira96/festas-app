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

type Params = { params: Promise<{ id: string }> };

// PATCH /api/participantes/:id/presenca
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { presenca } = (await request.json()) as { presenca: boolean };
    const participante = await participanteService.confirmarPresenca(id, presenca ?? true);
    return NextResponse.json({ message: t("participante.confirmed"), data: participante });
  } catch (error) {
    return handleError(error);
  }
}
