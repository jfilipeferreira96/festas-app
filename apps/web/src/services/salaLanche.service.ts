import prisma from "@festas/db";
import type { CriarSalaLancheDTO } from "@saas/shared-types";

export const salaLancheService = {
  async list() {
    return prisma.salaLanche.findMany({
      where: { activo: true },
      orderBy: { nome: "asc" },
    });
  },

  async listAll() {
    return prisma.salaLanche.findMany({
      orderBy: { nome: "asc" },
    });
  },

  async getById(id: string) {
    const sala = await prisma.salaLanche.findUnique({ where: { id } });
    if (!sala) throw new Error("NOT_FOUND");
    return sala;
  },

  async create(data: CriarSalaLancheDTO) {
    if (!data.nome) throw new Error("NAME_REQUIRED");

    return prisma.salaLanche.create({
      data: {
        nome: data.nome,
        activo: data.activo !== undefined ? data.activo : true,
      },
    });
  },

  async update(id: string, data: Partial<CriarSalaLancheDTO>) {
    await this.getById(id);
    return prisma.salaLanche.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.salaLanche.delete({ where: { id } });
  },
};
