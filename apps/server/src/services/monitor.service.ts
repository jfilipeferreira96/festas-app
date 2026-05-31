import prisma from "@festas/db";

interface CreateMonitorData {
  nome: string;
  contacto: string;
  activo?: boolean;
  locaisIds?: string[];
}

interface UpdateMonitorData {
  nome?: string;
  contacto?: string;
  activo?: boolean;
  locaisIds?: string[];
}

export const monitorService = {
  async list() {
    return prisma.monitor.findMany({
      orderBy: { nome: "asc" },
      include: {
        locais: { include: { local: true } },
      },
    });
  },

  async getById(id: string) {
    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        locais: { include: { local: true } },
      },
    });
    if (!monitor) throw new Error("NOT_FOUND");
    return monitor;
  },

  async create(data: CreateMonitorData) {
    if (!data.nome) throw new Error("NOME_REQUIRED");
    if (!data.contacto) throw new Error("CONTACTO_REQUIRED");

    return prisma.monitor.create({
      data: {
        nome: data.nome,
        contacto: data.contacto,
        activo: data.activo !== undefined ? data.activo : true,
        locais: data.locaisIds
          ? {
              create: data.locaisIds.map((localId) => ({ localId })),
            }
          : undefined,
      },
      include: { locais: { include: { local: true } } },
    });
  },

  async update(id: string, data: UpdateMonitorData) {
    await this.getById(id);

    if (data.locaisIds) {
      // Replace all local associations
      await prisma.monitorLocal.deleteMany({ where: { monitorId: id } });
    }

    return prisma.monitor.update({
      where: { id },
      data: {
        nome: data.nome,
        contacto: data.contacto,
        activo: data.activo,
        locais: data.locaisIds
          ? {
              create: data.locaisIds.map((localId) => ({ localId })),
            }
          : undefined,
      },
      include: { locais: { include: { local: true } } },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    await prisma.monitorLocal.deleteMany({ where: { monitorId: id } });
    return prisma.monitor.delete({ where: { id } });
  },

  async listActive() {
    return prisma.monitor.findMany({
      where: { activo: true },
      orderBy: { nome: "asc" },
      include: { locais: { include: { local: true } } },
    });
  },
};
