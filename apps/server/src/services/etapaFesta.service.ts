import prisma from "@festas/db";

interface CreateEtapaFestaData {
  nome: string;
  descricao?: string;
  ordem?: number;
  icone?: string;
}

interface UpdateEtapaFestaData {
  nome?: string;
  descricao?: string;
  ordem?: number;
  icone?: string;
  activo?: boolean;
}

export const etapaFestaService = {
  async list() {
    return prisma.etapaFesta.findMany({
      orderBy: { ordem: "asc" },
    });
  },

  async listActive() {
    return prisma.etapaFesta.findMany({
      where: { activo: true },
      orderBy: { ordem: "asc" },
    });
  },

  async getById(id: string) {
    const etapa = await prisma.etapaFesta.findUnique({ where: { id } });
    if (!etapa) throw new Error("NOT_FOUND");
    return etapa;
  },

  async create(data: CreateEtapaFestaData) {
    if (!data.nome) throw new Error("NOME_REQUIRED");

    // If ordem not specified, put it last
    if (data.ordem === undefined) {
      const last = await prisma.etapaFesta.findFirst({
        orderBy: { ordem: "desc" },
        select: { ordem: true },
      });
      data.ordem = (last?.ordem ?? 0) + 1;
    }

    return prisma.etapaFesta.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        ordem: data.ordem,
        icone: data.icone,
      },
    });
  },

  async update(id: string, data: UpdateEtapaFestaData) {
    await this.getById(id);
    return prisma.etapaFesta.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        ordem: data.ordem,
        icone: data.icone,
        activo: data.activo,
      },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    // Delete all ReservaEtapa references first
    await prisma.reservaEtapa.deleteMany({ where: { etapaId: id } });
    return prisma.etapaFesta.delete({ where: { id } });
  },
};