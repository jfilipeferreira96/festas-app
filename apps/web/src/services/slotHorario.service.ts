import prisma from "@festas/db";
import type { CriarSlotHorarioDTO } from "@saas/shared-types";
import { reservaService } from "./reserva.service";
import { excecaoCalendarioService } from "./excecaoCalendario.service";

/** Converte "HH:MM" para minutos desde a meia-noite */
function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Converte minutos para "HH:MM" */
function minutesParaHora(total: number): string {
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function eFimDeSemanaOuFeriado(data: string | Date): Promise<boolean> {
  const d = typeof data === "string" ? new Date(`${data}T00:00:00`) : data;
  if (d.getDay() === 0 || d.getDay() === 6) return true;
  try {
    return await excecaoCalendarioService.isFeriado(d);
  } catch {
    return false;
  }
}

/** Um slot aplica-se a um dia quando é "todos os dias" ou quando o tipo coincide. */
function slotAplicaAoDia(fimDeSemana: boolean | null | undefined, diaFds: boolean): boolean {
  return fimDeSemana === null || fimDeSemana === undefined || fimDeSemana === diaFds;
}

/** Verifica se dois intervalos [ini1,fim1) e [ini2,fim2) se sobrepõem */
function intervalosSobrepõem(ini1: number, fim1: number, ini2: number, fim2: number): boolean {
  return (ini1 >= ini2 && ini1 < fim2) || (ini2 >= ini1 && ini2 < fim1);
}

export interface SlotDiaFesta {
  id: string;
  nome: string;
  cor: string | null;
  numCriancas: number;
  estado: string;
  horario: string;
  duracaoMinutos: number;
}

export interface SlotDiaItem {
  slotId: string;
  horaInicio: string;
  duracaoMin: number;
  ordem: number;
  ocupado: boolean;
  festa: SlotDiaFesta | null;
  // ── Defaults do slot (para auto-preencher ao criar festa) ──
  corDefault?: string | null;
  horaLancheDefault?: string | null;
  salaLancheId?: string | null;
  salaLancheNome?: string | null;
}

// Festa com horário custom: herdada de SlotDiaFesta (horario/duracaoMinutos
// já fazem parte da base).
export interface FestaSemSlotItem extends SlotDiaFesta {}

export type TipoDia = "SEMANA" | "FIM_DE_SEMANA";

/** Plano do dia (grelha aplicável) para badges e capacidade do dia. */
export interface PlanoDia {
  tipoDia: TipoDia;
  totalSlots: number;
  inicio: string | null; // HH:MM do primeiro slot
  fim: string | null; // HH:MM a que acaba o último slot
}

export interface SlotsDiaResult {
  data: string;
  slots: SlotDiaItem[];
  festasSemSlot: FestaSemSlotItem[];
  coresUsadas: string[];
  plano: PlanoDia;
}

// Mapeia o resultado do Prisma para o tipo partilhado SlotHorario,
// desnormalizando salaLanche.nome → salaLancheNome.
function mapSlot<T extends { salaLanche?: { nome: string } | null }>(
  s: T,
): Omit<T, "salaLanche"> & { salaLancheNome: string | null } {
  const { salaLanche, ...rest } = s;
  return {
    ...rest,
    salaLancheNome: salaLanche?.nome ?? null,
  };
}

export const slotHorarioService = {
  /**
   * Slots activos. Com `data`, devolve apenas os que se aplicam a esse dia
   * (grelha de fim-de-semana/feriado vs grelha de semana; null = todos os dias).
   */
  async list(opts?: { data?: string }) {
    const where: Record<string, unknown> = { activo: true };
    if (opts?.data) {
      const diaFds = await eFimDeSemanaOuFeriado(opts.data);
      where.OR = [{ fimDeSemana: null }, { fimDeSemana: diaFds }];
    }
    const slots = await prisma.slotHorario.findMany({
      where,
      orderBy: { horaInicio: "asc" },
      include: { salaLanche: true },
    });
    return slots.map(mapSlot);
  },

  async listAll() {
    const slots = await prisma.slotHorario.findMany({
      orderBy: { horaInicio: "asc" },
      include: { salaLanche: true },
    });
    return slots.map(mapSlot);
  },

  /**
   * Retorna os slots activos de um dado dia combinados com as festas existentes.
   * Para cada slot indica se está ocupado (com dados da festa) ou vazio.
   * Inclui também festas com horário custom (que não correspondem a nenhum slot).
   */
  async getSlotsDia(data: string): Promise<SlotsDiaResult> {
    const diaFds = await eFimDeSemanaOuFeriado(data);
    // Apenas a grelha aplicável ao tipo de dia (nunca misturar semana ↔ FDS:
    // 17:15/17:45 existem nas duas grelhas).
    const todosSlots = await this.list();
    const slots = todosSlots.filter((s) => slotAplicaAoDia(s.fimDeSemana, diaFds));

    const result = await reservaService.list({ data, pageSize: 100 });
    // Apenas festas não canceladas para a vista de slots
    const festasAtivas = result.items.filter((f) => f.estado !== "CANCELADA");

    // Cores já usadas por festas activas neste dia (sugestão de cor disponível)
    const coresUsadas = new Set<string>(
      festasAtivas.filter((f) => f.cor).map((f) => f.cor as string),
    );

    // Mapeamento slotId → festaId (cada festa atribuída a no máximo um slot)
    const slotToFestaId = new Map<string, string>();
    const festasComSlot = new Set<string>();

    // Pass 1: match exacto de horaInicio (prioridade máxima)
    // Garante que uma festa às 16:30 vá para o slot das 16:30 e não para o das 14:00
    for (const f of festasAtivas) {
      if (festasComSlot.has(f.id)) continue;
      const slot = slots.find(
        (s) => s.horaInicio === f.horario && !slotToFestaId.has(s.id),
      );
      if (slot) {
        slotToFestaId.set(slot.id, f.id);
        festasComSlot.add(f.id);
      }
    }

    // Pass 2: overlap para festas ainda sem slot exacto
    // (uma festa que termine após o início do slot seguinte)
    for (const f of festasAtivas) {
      if (festasComSlot.has(f.id)) continue;
      const fInicio = toMinutes(f.horario);
      const fFim = fInicio + f.duracaoMinutos;
      const slot = slots.find((s) => {
        if (slotToFestaId.has(s.id)) return false;
        const sInicio = toMinutes(s.horaInicio);
        const sFim = sInicio + s.duracaoMin;
        return intervalosSobrepõem(fInicio, fFim, sInicio, sFim);
      });
      if (slot) {
        slotToFestaId.set(slot.id, f.id);
        festasComSlot.add(f.id);
      }
    }

    // Construir resultado dos slots
    const slotsComFestas: SlotDiaItem[] = slots.map((slot) => {
      const festaId = slotToFestaId.get(slot.id);
      const festa = festaId
        ? (festasAtivas.find((f) => f.id === festaId) ?? null)
        : null;

      return {
        slotId: slot.id,
        horaInicio: slot.horaInicio,
        duracaoMin: slot.duracaoMin,
        ordem: slot.ordem,
        ocupado: !!festa,
        // Defaults do slot para auto-preencher festas
        corDefault: slot.corDefault,
        horaLancheDefault: slot.horaLancheDefault,
        salaLancheId: slot.salaLancheId,
        salaLancheNome: slot.salaLancheNome ?? null,
        festa: festa
          ? {
              id: festa.id,
              nome:
                festa.aniversariantes
                  ?.map((a) => a.aniversariante?.nome)
                  .filter(Boolean)
                  .join(", ") || "-",
              cor: festa.cor ?? null,
              numCriancas: festa.numCriancas ?? 0,
              estado: festa.estado,
              horario: festa.horario,
              duracaoMinutos: festa.duracaoMinutos,
            }
          : null,
      };
    });

    // Festas que não correspondem a nenhum slot (horário custom)
    const festasSemSlot: FestaSemSlotItem[] = festasAtivas
      .filter((f) => !festasComSlot.has(f.id))
      .map((f) => ({
        id: f.id,
        nome:
          f.aniversariantes
            ?.map((a) => a.aniversariante?.nome)
            .filter(Boolean)
            .join(", ") || "-",
        cor: f.cor ?? null,
        numCriancas: f.numCriancas ?? 0,
        estado: f.estado,
        horario: f.horario,
        duracaoMinutos: f.duracaoMinutos,
      }));
    // Plano do dia (para badges "Plano de semana / fim-de-semana")
    const ordenados = [...slots].sort((a, b) => toMinutes(a.horaInicio) - toMinutes(b.horaInicio));
    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    const plano: PlanoDia = {
      tipoDia: diaFds ? "FIM_DE_SEMANA" : "SEMANA",
      totalSlots: slots.length,
      inicio: primeiro?.horaInicio ?? null,
      fim: ultimo ? minutesParaHora(toMinutes(ultimo.horaInicio) + ultimo.duracaoMin) : null,
    };

    return {
      data,
      slots: slotsComFestas,
      festasSemSlot,
      coresUsadas: Array.from(coresUsadas),
      plano,
    };
  },

  async getById(id: string) {
    const slot = await prisma.slotHorario.findUnique({ where: { id } });
    if (!slot) throw new Error("NOT_FOUND");
    return slot;
  },

  async create(data: CriarSlotHorarioDTO) {
    // Garantir ordem automática se não fornecida
    let ordem: number | undefined = data.ordem;
    if (ordem === undefined) {
      const count = await prisma.slotHorario.count();
      ordem = count + 1;
    }
    return prisma.slotHorario.create({
      data: {
        horaInicio: data.horaInicio,
        duracaoMin: data.duracaoMin ?? 135,
        activo: data.activo ?? true,
        ordem,
        fimDeSemana: data.fimDeSemana ?? null,
        corDefault: data.corDefault ?? null,
        horaLancheDefault: data.horaLancheDefault ?? null,
        salaLancheId: data.salaLancheId ?? null,
      },
      include: { salaLanche: true },
    });
  },

  async update(id: string, data: Partial<CriarSlotHorarioDTO>) {
    await this.getById(id);
    return prisma.slotHorario.update({
      where: { id },
      data: {
        ...(data.horaInicio !== undefined && { horaInicio: data.horaInicio }),
        ...(data.duracaoMin !== undefined && { duracaoMin: data.duracaoMin }),
        ...(data.activo !== undefined && { activo: data.activo }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.fimDeSemana !== undefined && { fimDeSemana: data.fimDeSemana }),
        ...(data.corDefault !== undefined && { corDefault: data.corDefault }),
        ...(data.horaLancheDefault !== undefined && { horaLancheDefault: data.horaLancheDefault }),
        ...(data.salaLancheId !== undefined && { salaLancheId: data.salaLancheId }),
      },
      include: { salaLanche: true },
    });
  },

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.slotHorario.delete({ where: { id } });
  },
};
