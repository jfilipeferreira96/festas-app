import prisma from "@festas/db";

interface CreateLocalData {
  nome: string;
  activo?: boolean;
}

interface UpdateLocalData {
  nome?: string;
  activo?: boolean;
}

export const localService = {
  async list() {
    return prisma.local.findMany({
      orderBy: { nome: "asc" },
    });
  },

  async getById(id: string) {
    const local = await prisma.local.findUnique({ where: { id } });
    if (!local) throw new Error("NOT_FOUND");
    return local;
  },

  async create(data: CreateLocalData) {
    if (!data.nome) throw new Error("NAME_REQUIRED");

    return prisma.local.create({
      data: {
        nome: data.nome,
        activo: data.activo !== undefined ? data.activo : true,
      },
    });
  },

  async update(id: string, data: UpdateLocalData) {
    await this.getById(id);
    return prisma.local.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    // Check for alocações de monitores activas (o local serve alocação/extras,
    // já não festas - Reserva deixou de ter localId)
    const alocacoesCount = await prisma.alocacaoMonitor.count({
      where: { localId: id },
    });

    if (alocacoesCount > 0) throw new Error("HAS_ACTIVE_RESERVAS");

    // Soft delete by setting activo = false
    return prisma.local.update({
      where: { id },
      data: { activo: false },
    });
  },

  async listActive() {
    return prisma.local.findMany({
      where: { activo: true },
      orderBy: { nome: "asc" },
    });
  },
};
