import prisma from "@festas/db";

interface CreateMonitorData {
  nome: string;
  contacto: string;
  activo?: boolean;
  valorHora?: number | null;
}

interface UpdateMonitorData {
  nome?: string;
  contacto?: string;
  activo?: boolean;
  valorHora?: number | null;
}

export const monitorService = {
  async list() {
    return prisma.monitor.findMany({
      orderBy: { nome: "asc" },
    });
  },

  async getById(id: string) {
    const monitor = await prisma.monitor.findUnique({
      where: { id },
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
        valorHora: data.valorHora ?? null,
      },
    });
  },

  async update(id: string, data: UpdateMonitorData) {
    await this.getById(id);

    return prisma.monitor.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.contacto !== undefined && { contacto: data.contacto }),
        ...(data.activo !== undefined && { activo: data.activo }),
        ...(data.valorHora !== undefined && { valorHora: data.valorHora }),
      },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.monitor.delete({ where: { id } });
  },

  async listActive() {
    return prisma.monitor.findMany({
      where: { activo: true },
      orderBy: { nome: "asc" },
    });
  },
};
