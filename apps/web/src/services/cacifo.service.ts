import prisma from "@festas/db";
import { Prisma } from "@prisma/client";

/**
 * Entrada do histórico de ocupação de um cacifo.
 */
interface HistoricoEntry {
  reservaId?: string;
  entradaLivreId?: string;
  estadoAnterior: string;
  notas?: string;
  criancas?: string;
  ocupadoEm?: string | null;
  libertadoEm: string;
}

/**
 * Adiciona uma entrada ao histórico JSON de um cacifo.
 */
function adicionarAoHistorico(historicoAtual: unknown, entry: HistoricoEntry): Prisma.InputJsonValue {
  const lista = Array.isArray(historicoAtual) ? (historicoAtual as HistoricoEntry[]) : [];
  return [...lista, entry] as unknown as Prisma.InputJsonValue;
}

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

  /**
   * Cacifos disponíveis (LIVRE) ou já atribuídos à reserva indicada,
   * para permitir re-edição sem perder a atribuição atual.
   */
  async getDisponiveisParaFesta(reservaId?: string) {
    return prisma.cacifo.findMany({
      where: reservaId
        ? { OR: [{ estado: "LIVRE" }, { estado: { in: ["RESERVADO", "OCUPADO"] }, reservaId }] }
        : { estado: "LIVRE" },
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

  /**
   * Liberta o cacifo PRESERVANDO o histórico de ocupação.
   * Os dados da ocupação (notas, criancas, reserva) são movidos para o JSON `historico`.
   */
  async libertar(id: string) {
    const cacifo = await this.getById(id);
    if (cacifo.estado === "LIVRE") throw new Error("CANNOT_RELEASE_FREE");

    // Preservar histórico antes de limpar
    const entry: HistoricoEntry = {
      reservaId: cacifo.reservaId ?? undefined,
      estadoAnterior: cacifo.estado,
      notas: cacifo.notas ?? undefined,
      criancas: cacifo.criancas ?? undefined,
      ocupadoEm: null, // campo opcional para registo futuro
      libertadoEm: new Date().toISOString(),
    };

    return prisma.cacifo.update({
      where: { id },
      data: {
        estado: "LIVRE",
        reservaId: null,
        notas: null,
        criancas: null,
        historico: adicionarAoHistorico(cacifo.historico, entry),
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
    await this.getById(id);

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

  /**
   * Liberta todos os cacifos de uma reserva, preservando histórico.
   */
  async libertarCacifosDaReserva(reservaId: string) {
    const cacifos = await prisma.cacifo.findMany({ where: { reservaId } });

    await Promise.all(
      cacifos.map(async (cacifo) => {
        const entry: HistoricoEntry = {
          reservaId: cacifo.reservaId ?? undefined,
          estadoAnterior: cacifo.estado,
          notas: cacifo.notas ?? undefined,
          criancas: cacifo.criancas ?? undefined,
          ocupadoEm: null,
          libertadoEm: new Date().toISOString(),
        };
        await prisma.cacifo.update({
          where: { id: cacifo.id },
          data: {
            estado: "LIVRE",
            reservaId: null,
            notas: null,
            criancas: null,
            historico: adicionarAoHistorico(cacifo.historico, entry),
          },
        });
      })
    );

    return { count: cacifos.length };
  },

  /**
   * Retorna o histórico de ocupação de um cacifo (JSON preservado).
   */
  async getHistorico(id: string): Promise<HistoricoEntry[]> {
    const cacifo = await this.getById(id);
    if (!cacifo.historico) return [];
    return Array.isArray(cacifo.historico)
      ? (cacifo.historico as unknown as HistoricoEntry[])
      : [];
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

  /**
   * Cacifos "esquecidos": marcados OCUPADO/RESERVADO cuja reserva associada
   * já está CONCLUIDA ou CANCELADA. Devem ser libertados na limpeza diária.
   */
  async getCacifosEsquecidos() {
    return prisma.cacifo.findMany({
      where: {
        estado: { in: ["OCUPADO", "RESERVADO"] },
        reserva: { estado: { in: ["CONCLUIDA", "CANCELADA"] } },
      },
      include: {
        reserva: {
          select: {
            id: true,
            estado: true,
            cliente: { select: { nome: true } },
            aniversariantes: { include: { aniversariante: { select: { nome: true } } } },
          },
        },
      },
      orderBy: { numero: "asc" },
    });
  },

  /**
   * Pré-reserva N cacifos para uma reserva, marcando como RESERVADO
   * com criancas = "Por preencher". Não faz throw se faltarem cacifos.
   */
  async preReservarCacifos(reservaId: string, quantidade: number) {
    const livres = await prisma.cacifo.findMany({
      where: { estado: "LIVRE" },
      orderBy: { numero: "asc" },
      take: quantidade,
    });

    const reservados = await Promise.all(
      livres.map((cacifo) =>
        prisma.cacifo.update({
          where: { id: cacifo.id },
          data: {
            estado: "RESERVADO",
            reservaId,
            criancas: "Por preencher",
          },
        })
      )
    );

    return {
      reservados,
      indisponiveis: Math.max(0, quantidade - reservados.length),
    };
  },

  /**
   * Ajusta o número de cacifos pré-reservados para uma reserva.
   * Se novaQuantidade > actual: reserva cacifos adicionais.
   * Se novaQuantidade < actual: liberta os excedentes (preservando histórico).
   */
  async ajustarPreReserva(reservaId: string, novaQuantidade: number) {
    const actuais = await prisma.cacifo.findMany({
      where: { reservaId, estado: "RESERVADO" },
      orderBy: { numero: "asc" },
    });

    if (novaQuantidade > actuais.length) {
      // Reservar adicionais
      const faltam = novaQuantidade - actuais.length;
      const result = await this.preReservarCacifos(reservaId, faltam);
      return { reservados: result.reservados, libertados: [], indisponiveis: result.indisponiveis };
    }

    if (novaQuantidade < actuais.length) {
      // Libertar excedentes (os últimos)
      const excedentes = actuais.slice(novaQuantidade);
      for (const cacifo of excedentes) {
        await this.libertar(cacifo.id);
      }
      return { reservados: [], libertados: excedentes, indisponiveis: 0 };
    }

    return { reservados: [], libertados: [], indisponiveis: 0 };
  },

  /**
   * Adiciona um cacifo específico (ou o próximo livre) a uma reserva.
   * Usado no modal de cacifos quando se junta uma criança no dia.
   */
  async adicionarCacifoAReserva(reservaId: string, cacifoId?: string) {
    let cacifo;
    if (cacifoId) {
      cacifo = await prisma.cacifo.findUnique({ where: { id: cacifoId } });
      if (!cacifo) throw new Error("NOT_FOUND");
      if (cacifo.estado !== "LIVRE") throw new Error("CACIFO_NOT_AVAILABLE");
    } else {
      cacifo = await prisma.cacifo.findFirst({
        where: { estado: "LIVRE" },
        orderBy: { numero: "asc" },
      });
      if (!cacifo) throw new Error("NO_CACIFOS_AVAILABLE");
    }

    return prisma.cacifo.update({
      where: { id: cacifo.id },
      data: {
        estado: "RESERVADO",
        reservaId,
        criancas: "Por preencher",
      },
    });
  },
};
