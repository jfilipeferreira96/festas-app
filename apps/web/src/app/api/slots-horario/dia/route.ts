import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { slotHorarioService } from "@/services/slotHorario.service";
import { reservaService } from "@/services/reserva.service";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "SlotsDia",
});

/** Converte "HH:MM" para minutos desde a meia-noite */
function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

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

    // Buscar slots ativos ordenados por ordem
    const slots = await slotHorarioService.list();

    // Buscar festas do dia (pageSize alto para obter todas do dia)
    const result = await reservaService.list({ data: dataParam, pageSize: 100 });
    // Apenas festas não canceladas para a vista de slots
    const festasAtivas = result.items.filter((f) => f.estado !== "CANCELADA");

    // Cores já usadas por festas ATIVAS neste dia (para sugestão de cor disponível)
    const coresUsadas = new Set(
      festasAtivas
        .filter((f) => f.cor)
        .map((f) => f.cor as string),
    );

    // IDs de festas já associadas a um slot
    const festasAssociadas = new Set<string>();

    // Combinar slots com festas (verificando sobreposição de horário)
    const slotsComFestas = slots.map((slot) => {
      const slotInicio = toMinutes(slot.horaInicio);
      const slotFim = slotInicio + slot.duracaoMin;

      // Procurar festa que se sobrepõe a este slot (início dentro do intervalo do slot)
      const festa = festasAtivas.find((f) => {
        const fInicio = toMinutes(f.horario);
        const fFim = fInicio + f.duracaoMinutos;
        // Sobreposição: início da festa dentro do slot OU slot dentro da festa
        const overlap =
          (fInicio >= slotInicio && fInicio < slotFim) ||
          (slotInicio >= fInicio && slotInicio < fFim);
        if (overlap) festasAssociadas.add(f.id);
        return overlap;
      });

      return {
        slotId: slot.id,
        horaInicio: slot.horaInicio,
        duracaoMin: slot.duracaoMin,
        ordem: slot.ordem,
        ocupado: !!festa,
        festa: festa
          ? {
              id: festa.id,
              nome:
                festa.aniversariantes
                  ?.map((a) => a.aniversariante?.nome)
                  .filter(Boolean)
                  .join(", ") || "—",
              cor: festa.cor ?? null,
              numCriancas: festa.numCriancas ?? 0,
              estado: festa.estado,
              localNome: festa.local?.nome ?? null,
            }
          : null,
      };
    });

    // Festas que não correspondem a nenhum slot (horário custom)
    const festasSemSlot = festasAtivas
      .filter((f) => !festasAssociadas.has(f.id))
      .map((f) => ({
        id: f.id,
        nome:
          f.aniversariantes
            ?.map((a) => a.aniversariante?.nome)
            .filter(Boolean)
            .join(", ") || "—",
        cor: f.cor ?? null,
        numCriancas: f.numCriancas ?? 0,
        estado: f.estado,
        localNome: f.local?.nome ?? null,
        horario: f.horario,
        duracaoMinutos: f.duracaoMinutos,
      }));

    return NextResponse.json({
      data: dataParam,
      slots: slotsComFestas,
      festasSemSlot,
      coresUsadas: Array.from(coresUsadas),
    });
  } catch (error) {
    return handleError(error);
  }
}
