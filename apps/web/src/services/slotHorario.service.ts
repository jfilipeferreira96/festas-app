import prisma from "@festas/db";
import type { CriarSlotHorarioDTO } from "@saas/shared-types";
import { reservaService } from "./reserva.service";

/** Converte "HH:MM" para minutos desde a meia-noite */
function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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
  localNome: string | null;
}

export interface SlotDiaItem {
  slotId: string;
  horaInicio: string;
  duracaoMin: number;
  ordem: number;
  ocupado: boolean;
  festa: SlotDiaFesta | null;
}

export interface FestaSemSlotItem extends SlotDiaFesta {
  horario: string;
  duracaoMinutos: number;
}

export interface SlotsDiaResult {
  data: string;
  slots: SlotDiaItem[];
  festasSemSlot: FestaSemSlotItem[];
  coresUsadas: string[];
}

export const slotHorarioService = {
  async list() {
    return prisma.slotHorario.findMany({
      where: { activo: true },
      orderBy: { ordem: "asc" },
    });
  },

  async listAll() {
    return prisma.slotHorario.findMany({
      orderBy: { ordem: "asc" },
    });
  },

  /**
   * Retorna os slots activos de um dado dia combinados com as festas existentes.
   * Para cada slot indica se está ocupado (com dados da festa) ou vazio.
   * Inclui também festas com horário custom (que não correspondem a nenhum slot).
   */
  async getSlotsDia(data: string): Promise<SlotsDiaResult> {
    const slots = await this.list();
    const result = await reservaService.list({ data, pageSize: 100 });
    // Apenas festas não canceladas para a vista de slots
    const festasAtivas = result.items.filter((f) => f.estado !== "CANCELADA");

    // Cores já usadas por festas activas neste dia (sugestão de cor disponível)
    const coresUsadas = new Set(
      festasAtivas.filter((f) => f.cor).map((f) => f.cor as string),
    );

    // IDs de festas já associadas a um slot
    const festasAssociadas = new Set<string>();

    // Combinar slots com festas (verificando sobreposição de horário)
    const slotsComFestas: SlotDiaItem[] = slots.map((slot) => {
      const slotInicio = toMinutes(slot.horaInicio);
      const slotFim = slotInicio + slot.duracaoMin;

      // Procurar a primeira festa que se sobrepõe a este slot
      const festa = festasAtivas.find((f) => {
        const fInicio = toMinutes(f.horario);
        const fFim = fInicio + f.duracaoMinutos;
        const overlap = intervalosSobrepõem(fInicio, fFim, slotInicio, slotFim);
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
    const festasSemSlot: FestaSemSlotItem[] = festasAtivas
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

    return {
      data,
      slots: slotsComFestas,
      festasSemSlot,
      coresUsadas: Array.from(coresUsadas),
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
      },
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
      },
    });
  },

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.slotHorario.delete({ where: { id } });
  },
};
