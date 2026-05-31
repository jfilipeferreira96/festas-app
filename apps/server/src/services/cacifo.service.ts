import prisma from "@festas/db";

export const cacifoService = {
  async list(filtros?: { estado?: string; reservaId?: string }) {
    return prisma.cacifo.findMany({
      where: {
        ...(filtros?.estado ? { estado: filtros.estado as "LIVRE" | "OCUPADO" | "RESERVADO" } : {}),
        ...(filtros?.reservaId ? { reservaId: filtros.reservaId } : {}),
      },
      orderBy: { numero: "asc" },
      include: {
        reserva: { include: { cliente: true, aniversariantes: { include: { aniversariante: true } } } },
        participante: true,
      },
    });
  },

  async getById(id: string) {
    const cacifo = await prisma.cacifo.findUnique({
      where: { id },
      include: {
        reserva: { include: { cliente: true, aniversariantes: { include: { aniversariante: true } }, local: true } },
        participante: true,
      },
    });
    if (!cacifo) throw new Error("NOT_FOUND");
    return cacifo;
  },

  async getDisponiveis() {
    return prisma.cacifo.findMany({
      where: { estado: "LIVRE" },
      orderBy: { numero: "asc" },
    });
  },

  async marcarOcupado(id: string, reservaId: string, dados?: { notas?: string; criancas?: string }) {
    const cacifo = await this.getById(id);
    if (cacifo.estado === "OCUPADO") throw new Error("ALREADY_OCCUPIED");

    return prisma.cacifo.update({
      where: { id },
      data: {
        estado: "OCUPADO",
        reservaId,
        notas: dados?.notas,
        criancas: dados?.criancas,
      },
    });
  },

  async libertar(id: string) {
    const cacifo = await this.getById(id);
    if (cacifo.estado === "LIVRE") throw new Error("CANNOT_RELEASE_FREE");

    return prisma.cacifo.update({
      where: { id },
      data: {
        estado: "LIVRE",
        reservaId: null,
        notas: null,
        criancas: null,
      },
    });
  },

  async marcarReservado(id: string, reservaId: string, dados?: { notas?: string; criancas?: string }) {
    const cacifo = await this.getById(id);
    if (cacifo.estado === "OCUPADO") throw new Error("ALREADY_OCCUPIED");

    return prisma.cacifo.update({
      where: { id },
      data: {
        estado: "RESERVADO",
        reservaId,
        notas: dados?.notas,
        criancas: dados?.criancas,
      },
    });
  },

  async actualizarCacifo(id: string, dados: { notas?: string; criancas?: string }) {
    const cacifo = await this.getById(id);

    return prisma.cacifo.update({
      where: { id },
      data: {
        notas: dados.notas,
        criancas: dados.criancas,
      },
    });
  },

  async atribuirCacifos(reservaId: string, cacifos: { id: string; notas?: string; criancas?: string }[]) {
    // Verify reserva exists
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    const results = await prisma.$transaction(
      cacifos.map((c) =>
        prisma.cacifo.update({
          where: { id: c.id },
          data: {
            estado: "RESERVADO",
            reservaId,
            notas: c.notas,
            criancas: c.criancas,
          },
        })
      )
    );
    return results;
  },

  async libertarCacifosDaReserva(reservaId: string) {
    return prisma.cacifo.updateMany({
      where: { reservaId },
      data: {
        estado: "LIVRE",
        reservaId: null,
        notas: null,
        criancas: null,
      },
    });
  },

  async getContadores() {
    const [livres, ocupados, reservados, total] = await Promise.all([
      prisma.cacifo.count({ where: { estado: "LIVRE" } }),
      prisma.cacifo.count({ where: { estado: "OCUPADO" } }),
      prisma.cacifo.count({ where: { estado: "RESERVADO" } }),
      prisma.cacifo.count(),
    ]);

    return { livres, ocupados, reservados, total };
  },
};