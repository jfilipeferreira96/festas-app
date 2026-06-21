import prisma from "@festas/db";
import type { CriarSlotHorarioDTO } from "@saas/shared-types";

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
