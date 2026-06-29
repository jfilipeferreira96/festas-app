import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { slotHorarioService } from "@/services/slotHorario.service";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "SlotsDia",
});

/**
 * GET /api/slots-horario/dia?data=YYYY-MM-DD
 *
 * Retorna os slots ativos do dia, combinados com as festas existentes.
 * Para cada slot, indica se está ocupado (com dados da festa) ou vazio.
 * Também retorna festas que não correspondem a nenhum slot (horários custom).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");

    if (!dataParam) {
      return NextResponse.json(
        { error: "Parâmetro 'data' é obrigatório (formato YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const result = await slotHorarioService.getSlotsDia(dataParam);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
