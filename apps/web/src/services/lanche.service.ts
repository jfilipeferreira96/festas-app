import prisma from "@festas/db";
import type {
  LancheFesta,
  LancheEntradaLivre,
  LancheDoDia,
  AtualizarNotasLancheDTO,
  Menu,
} from "@saas/shared-types";

/**
 * Serviço de Lanche — usado pela conta LANCHE.
 * Permite ver os lanches a preparar no dia (festas + entradas livres)
 * e registar notas/alergias por festa.
 */
export const lancheService = {
  /**
   * Lista todos os lanches a preparar hoje:
   * - Festas (reservas CONFIRMADO / EM_CURSO) com o seu menu
   * - Entradas livres ATIVA
   */
  async getLanchesDoDia(data?: Date): Promise<LancheDoDia[]> {
    const dia = data ?? new Date();
    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);

    const [festas, entradas] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          data: { gte: inicio, lt: fim },
          estado: { in: ["CONFIRMADO", "EM_CURSO"] },
        },
        include: {
          local: true,
          aniversariantes: { include: { aniversariante: true } },
          menu: true,
        },
        orderBy: { horario: "asc" },
      }),
      prisma.entradaLivre.findMany({
        where: {
          estado: "ATIVA",
          inicioEm: { gte: inicio, lt: fim },
        },
        include: { local: true },
        orderBy: { inicioEm: "asc" },
      }),
    ]);

    const lanchesFestas: LancheFesta[] = festas.map((r) => {
      const nomesAniv = r.aniversariantes
        .map((a) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");
      const menu = r.menu ? (r.menu as unknown as Menu) : undefined;
      return {
        reservaId: r.id,
        tipo: "FESTA",
        nomeFesta: nomesAniv || "—",
        data: r.data.toISOString(),
        horario: r.horario,
        localNome: r.local?.nome ?? "—",
        numCriancas: r.numCriancas,
        menu,
        notasLanche: r.menu?.notasLanche ?? undefined,
        itensLanche: r.menu?.itensLanche ?? undefined,
      };
    });

    const lanchesEntradas: LancheEntradaLivre[] = entradas.map((e) => {
      const criancas = (e.criancas as { nome: string; idade?: number }[]) ?? [];
      return {
        entradaLivreId: e.id,
        tipo: "ENTRADA_LIVRE",
        encarregadoNome: e.encarregadoNome,
        inicioEm: e.inicioEm.toISOString(),
        localNome: e.local?.nome ?? "—",
        criancas,
        observacoesLesoes: e.observacoesLesoes ?? undefined,
      };
    });

    return [...lanchesFestas, ...lanchesEntradas];
  },

  /**
   * Retorna o lanche (menu + notas) de uma festa específica.
   */
  async getLancheByReservaId(reservaId: string): Promise<LancheFesta> {
    const reserva = await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: {
        local: true,
        aniversariantes: { include: { aniversariante: true } },
        menu: true,
      },
    });
    if (!reserva) throw new Error("NOT_FOUND");

    const nomesAniv = reserva.aniversariantes
      .map((a) => a.aniversariante?.nome)
      .filter(Boolean)
      .join(", ");

    const menu = reserva.menu ? (reserva.menu as unknown as Menu) : undefined;

    return {
      reservaId: reserva.id,
      tipo: "FESTA",
      nomeFesta: nomesAniv || "—",
      data: reserva.data.toISOString(),
      horario: reserva.horario,
      localNome: reserva.local?.nome ?? "—",
      numCriancas: reserva.numCriancas,
      menu,
      notasLanche: reserva.menu?.notasLanche ?? undefined,
      itensLanche: reserva.menu?.itensLanche ?? undefined,
    };
  },

  /**
   * Atualiza as notas de lanche / itens de lanche de uma festa.
   * Cria o menu (vazio) se ainda não existir.
   */
  async atualizarNotasLanche(data: AtualizarNotasLancheDTO) {
    const reserva = await prisma.reserva.findUnique({ where: { id: data.reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    const existing = await prisma.menu.findUnique({ where: { reservaId: data.reservaId } });

    if (existing) {
      return prisma.menu.update({
        where: { reservaId: data.reservaId },
        data: {
          ...(data.notasLanche !== undefined && { notasLanche: data.notasLanche }),
          ...(data.itensLanche !== undefined && { itensLanche: data.itensLanche as object }),
        },
      });
    }

    // Criar menu vazio apenas com notas de lanche
    return prisma.menu.create({
      data: {
        reservaId: data.reservaId,
        nome: "Lanche",
        preco: 0,
        notasLanche: data.notasLanche,
        ...(data.itensLanche !== undefined && { itensLanche: data.itensLanche as object }),
      },
    });
  },

  /**
   * Retorna apenas as festas de hoje que têm notas de alergia/lanche,
   * para destaque visual na conta LANCHE.
   */
  async getAlergias(data?: Date): Promise<{ reservaId: string; nomeFesta: string; notasLanche: string }[]> {
    const lanches = await this.getLanchesDoDia(data);
    return lanches
      .filter((l): l is LancheFesta => l.tipo === "FESTA" && !!l.notasLanche)
      .map((l) => ({
        reservaId: l.reservaId,
        nomeFesta: l.nomeFesta,
        notasLanche: l.notasLanche!,
      }));
  },
};
