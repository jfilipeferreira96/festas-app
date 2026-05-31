import prisma from "@festas/db";

const MAX_PARTICIPANTES_POR_FESTA = 20;

export const participanteService = {
  async listByReserva(reservaId: string) {
    return prisma.participante.findMany({
      where: { reservaId },
      include: { cacifo: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async adicionarParticipante(reservaId: string, nome: string) {
    // 1. Verificar limite de 20
    const count = await prisma.participante.count({ where: { reservaId } });
    if (count >= MAX_PARTICIPANTES_POR_FESTA) throw new Error("MAX_PARTICIPANTES");

    // 2. Verificar se a reserva existe
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("RESERVA_NOT_FOUND");

    // 3. Encontrar próximo cacifo livre
    const cacifo = await prisma.cacifo.findFirst({
      where: { estado: "LIVRE" },
      orderBy: { numero: "asc" },
    });

    // 4. Criar participante e reservar cacifo (transação)
    return prisma.$transaction(async (tx) => {
      // Update cacifo first so the include on create returns fresh data
      if (cacifo) {
        await tx.cacifo.update({
          where: { id: cacifo.id },
          data: {
            estado: "RESERVADO",
            reservaId,
            criancas: nome,
          },
        });
      }

      const participante = await tx.participante.create({
        data: {
          nome,
          reservaId,
          ...(cacifo ? { cacifoId: cacifo.id } : {}),
        },
        include: { cacifo: true },
      });

      return participante;
    });
  },

  async confirmarPresenca(participanteId: string, presenca: boolean) {
    const participante = await prisma.participante.findUnique({
      where: { id: participanteId },
      include: { cacifo: true },
    });
    if (!participante) throw new Error("NOT_FOUND");

    // Se marcar presença e cacifo está RESERVADO → OCUPADO
    if (presenca && participante.cacifoId) {
      await prisma.cacifo.update({
        where: { id: participante.cacifoId },
        data: { estado: "OCUPADO" },
      });
    }

    // Se desmarcar presença e cacifo está OCUPADO → RESERVADO
    if (!presenca && participante.cacifoId) {
      await prisma.cacifo.update({
        where: { id: participante.cacifoId },
        data: { estado: "RESERVADO" },
      });
    }

    return prisma.participante.update({
      where: { id: participanteId },
      data: { presente: presenca },
      include: { cacifo: true },
    });
  },

  async marcarTodosPresenca(reservaId: string, presenca: boolean) {
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("RESERVA_NOT_FOUND");

    const participantes = await prisma.participante.findMany({
      where: { reservaId },
      include: { cacifo: true },
    });

    if (participantes.length === 0) return [];

    await prisma.$transaction(async (tx) => {
      // Update all participantes
      await tx.participante.updateMany({
        where: { reservaId },
        data: { presente: presenca },
      });

      // Update cacifos estado
      const cacifoIds = participantes
        .filter((p) => p.cacifoId)
        .map((p) => p.cacifoId!);

      if (cacifoIds.length > 0) {
        await tx.cacifo.updateMany({
          where: { id: { in: cacifoIds } },
          data: { estado: presenca ? "OCUPADO" : "RESERVADO" },
        });
      }
    });

    // Return updated list
    return prisma.participante.findMany({
      where: { reservaId },
      include: { cacifo: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async removerParticipante(participanteId: string) {
    const participante = await prisma.participante.findUnique({
      where: { id: participanteId },
    });
    if (!participante) throw new Error("NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      // Libertar cacifo
      if (participante.cacifoId) {
        await tx.cacifo.update({
          where: { id: participante.cacifoId },
          data: { estado: "LIVRE", reservaId: null, criancas: null, notas: null },
        });
      }
      await tx.participante.delete({ where: { id: participanteId } });
    });
  },
};