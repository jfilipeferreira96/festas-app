import prisma from "@festas/db";

export const menuService = {
  async getByReservaId(reservaId: string) {
    const menu = await prisma.menu.findUnique({
      where: { reservaId },
    });
    if (!menu) throw new Error("NOT_FOUND");
    return menu;
  },

  async create(data: { reservaId: string; nome: string; preco: number; notas?: string }) {
    // Verificar se já existe menu para esta reserva
    const existing = await prisma.menu.findUnique({
      where: { reservaId: data.reservaId },
    });
    if (existing) throw new Error("ALREADY_EXISTS");

    // Verificar se a reserva existe
    const reserva = await prisma.reserva.findUnique({
      where: { id: data.reservaId },
    });
    if (!reserva) throw new Error("RESERVA_NOT_FOUND");

    // Verificar se a reserva já está em curso
    if (reserva.estado === "EM_CURSO" || reserva.estado === "CONCLUIDA") {
      throw new Error("RESERVA_IN_PROGRESS");
    }

    return prisma.menu.create({
      data: {
        reservaId: data.reservaId,
        nome: data.nome,
        preco: data.preco,
        notas: data.notas,
      },
    });
  },

  async update(
    reservaId: string,
    data: { nome?: string; preco?: number; notas?: string }
  ) {
    const menu = await prisma.menu.findUnique({
      where: { reservaId },
    });
    if (!menu) throw new Error("NOT_FOUND");

    // Verificar se a reserva já está em curso
    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
    });
    if (!reserva) throw new Error("RESERVA_NOT_FOUND");
    if (reserva.estado === "EM_CURSO" || reserva.estado === "CONCLUIDA") {
      throw new Error("RESERVA_IN_PROGRESS");
    }

    return prisma.menu.update({
      where: { id: menu.id },
      data: {
        nome: data.nome,
        preco: data.preco,
        notas: data.notas,
      },
    });
  },

  /**
   * Convenience: creates or updates the menu for a reserva.
   */
  async createOrUpdateForReserva(
    reservaId: string,
    data: { nome: string; preco: number; notas?: string }
  ) {
    const existing = await prisma.menu.findUnique({
      where: { reservaId },
    });

    // Verify reserva exists and is not in progress
    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
    });
    if (!reserva) throw new Error("RESERVA_NOT_FOUND");
    if (reserva.estado === "EM_CURSO" || reserva.estado === "CONCLUIDA") {
      throw new Error("RESERVA_IN_PROGRESS");
    }

    if (existing) {
      return prisma.menu.update({
        where: { id: existing.id },
        data: {
          nome: data.nome,
          preco: data.preco,
          notas: data.notas,
        },
      });
    } else {
      return prisma.menu.create({
        data: {
          reservaId,
          nome: data.nome,
          preco: data.preco,
          notas: data.notas,
        },
      });
    }
  },
};