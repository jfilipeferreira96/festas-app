import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    DATA_REQUIRED: "reserva.dataRequired",
    HORARIO_REQUIRED: "reserva.horarioRequired",
    DURACAO_REQUIRED: "reserva.duracaoRequired",
  },
  statusMap: {
    DATA_REQUIRED: 400,
    HORARIO_REQUIRED: 400,
    DURACAO_REQUIRED: 400,
  },
  serviceName: "Reserva",
});

// GET /api/reservas/disponibilidade?data=&horario=&duracaoMinutos=&excludeId=
// Verifica sobreposição temporal (duração) - aviso apenas, não bloqueia.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data") || undefined;
    const horario = searchParams.get("horario") || undefined;
    const duracaoMinutos = searchParams.get("duracaoMinutos");
    const excludeId = searchParams.get("excludeId") || undefined;

    // Se faltar algum campo, considera disponível (ainda não há slot definido)
    if (!data || !horario || !duracaoMinutos) {
      return NextResponse.json({ disponivel: true, conflitos: [] });
    }

    const resultado = await reservaService.checkDisponibilidade({
      data,
      horario,
      duracaoMinutos: Number(duracaoMinutos),
      excludeId: excludeId || undefined,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    return handleError(error);
  }
}
