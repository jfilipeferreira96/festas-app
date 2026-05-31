import prisma from "@festas/db";

export const campanhaService = {
  async list(tipo?: string) {
    return prisma.campanha.findMany({
      where: {
        ...(tipo ? { tipo: tipo as "EMAIL" | "SMS" } : {}),
      },
      include: {
        segmento: true,
        _count: { select: { envios: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    const campanha = await prisma.campanha.findUnique({
      where: { id },
      include: {
        segmento: true,
        envios: true,
      },
    });
    if (!campanha) throw new Error("NOT_FOUND");
    return campanha;
  },

  async create(data: {
    tipo: "EMAIL" | "SMS";
    assunto?: string;
    mensagem: string;
    segmentoId?: string;
    agendadaPara?: string;
  }) {
    // Verificar se o segmento existe (if provided)
    if (data.segmentoId) {
      const segmento = await prisma.segmento.findUnique({
        where: { id: data.segmentoId },
      });
      if (!segmento) throw new Error("SEGMENTO_NOT_FOUND");
    }

    return prisma.campanha.create({
      data: {
        tipo: data.tipo,
        assunto: data.assunto,
        mensagem: data.mensagem,
        segmentoId: data.segmentoId,
        estado: data.agendadaPara ? "AGENDADA" : "RASCUNHO",
        agendadaPara: data.agendadaPara ? new Date(data.agendadaPara) : null,
      },
      include: { segmento: true },
    });
  },

  async update(
    id: string,
    data: {
      assunto?: string;
      mensagem?: string;
      segmentoId?: string;
      agendadaPara?: string;
    }
  ) {
    const campanha = await this.getById(id);

    // Campanhas enviadas não podem ser editadas
    if (campanha.estado === "ENVIADA") throw new Error("CANNOT_EDIT_SENT");

    if (data.segmentoId) {
      const segmento = await prisma.segmento.findUnique({
        where: { id: data.segmentoId },
      });
      if (!segmento) throw new Error("SEGMENTO_NOT_FOUND");
    }

    return prisma.campanha.update({
      where: { id },
      data: {
        assunto: data.assunto,
        mensagem: data.mensagem,
        segmentoId: data.segmentoId,
        agendadaPara: data.agendadaPara ? new Date(data.agendadaPara) : null,
      },
      include: { segmento: true },
    });
  },

  async enviar(id: string) {
    const campanha = await this.getById(id);

    if (campanha.estado === "ENVIADA") throw new Error("ALREADY_SENT");

    // Obter contactos do segmento
    if (!campanha.segmentoId) throw new Error("NO_SEGMENT");

    const contactos = await prisma.contactoSegmento.findMany({
      where: { segmentoId: campanha.segmentoId },
      include: { contacto: true },
    });

    if (contactos.length === 0) throw new Error("NO_CONTACTS");

    // Criar envios para cada contacto
    await prisma.$transaction(
      contactos.map((cs) =>
        prisma.envioCampanha.create({
          data: {
            campanhaId: id,
            contactoId: cs.contactoId,
          },
        })
      )
    );

    // Marcar campanha como enviada
    return prisma.campanha.update({
      where: { id },
      data: {
        estado: "ENVIADA",
        enviadaEm: new Date(),
      },
      include: { segmento: true },
    });
  },

  async getMetricas(id: string) {
    const campanha = await this.getById(id);

    const [totalEnvios, abertos, falhados] = await Promise.all([
      prisma.envioCampanha.count({ where: { campanhaId: id } }),
      prisma.envioCampanha.count({
        where: { campanhaId: id, aberto: true },
      }),
      prisma.envioCampanha.count({
        where: { campanhaId: id, aberto: false },
      }),
    ]);

    const taxaAbertura = totalEnvios > 0 ? (abertos / totalEnvios) * 100 : 0;

    return {
      totalEnvios,
      abertos,
      falhados,
      taxaAbertura: Math.round(taxaAbertura * 100) / 100,
    };
  },

  async delete(id: string) {
    const campanha = await this.getById(id);
    if (campanha.estado === "ENVIADA") throw new Error("CANNOT_DELETE_SENT");

    await prisma.envioCampanha.deleteMany({ where: { campanhaId: id } });
    return prisma.campanha.delete({ where: { id } });
  },
};
