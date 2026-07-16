import prisma from "@festas/db";
import type {
  LancheFesta,
  LancheEntradaLivre,
  LancheDoDia,
  AtualizarNotasLancheDTO,
  EstadoLanche,
  Menu,
} from "@saas/shared-types";

/**
 * Serviço de Lanche — usado pela conta LANCHE.
 * Permite ver os lanches a preparar no dia (festas + entradas livres)
 * e registar notas/alergias por festa.
 */

function calcularIdade(dataNascimento: Date | null, dataFesta: Date): number | undefined {
  if (!dataNascimento) return undefined;
  const diff = dataFesta.getTime() - dataNascimento.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

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
          salaLanche: true,
          aniversariantes: { include: { aniversariante: true } },
          menu: true,
          extras: { include: { extra: true } },
          cacifos: true,
        },
        orderBy: { horario: "asc" },
      }),
      prisma.entradaLivre.findMany({
        where: {
          estado: "ATIVA",
          inicioEm: { gte: inicio, lt: fim },
        },
        include: { extras: { include: { extra: true } } },
        orderBy: { inicioEm: "asc" },
      }),
    ]);

    const lanchesFestas: LancheFesta[] = festas.map((r) => {
      const nomesAniv = r.aniversariantes
        .map((a) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");
      const menu = r.menu ? (r.menu as unknown as Menu) : undefined;

      // Calcular idade do primeiro aniversariante
      const primeiroAniv = r.aniversariantes[0]?.aniversariante;
      const idadeAniversariante = primeiroAniv
        ? calcularIdade(primeiroAniv.dataNascimento, r.data)
        : undefined;

      // Extrair nomes dos extras
      const extrasNomes = r.extras
        .map((re) => re.extra?.nome)
        .filter(Boolean) as string[];

      // Extrair extras de lanche (categoria LANCHE ou nome contém "lanche")
      const extrasLancheNomes = r.extras
        .filter((re) => re.extra?.categoria === "EXTRA" && re.extra?.subcategoria?.toLowerCase().includes("lanche"))
        .map((re) => re.extra?.nome)
        .filter(Boolean) as string[];

      // Notas do cacifo (primeiro cacifo com notas)
      const observacoesCacifo = r.cacifos
        .map((c) => c.notas)
        .filter(Boolean)
        .join("; ") || undefined;

      return {
        reservaId: r.id,
        tipo: "FESTA",
        nomeFesta: nomesAniv || "—",
        data: r.data.toISOString(),
        horario: r.horario,
        horaLanche: r.horaLanche ?? undefined,
        localNome: r.local?.nome ?? "—",
        salaLancheNome: r.salaLanche?.nome ?? undefined,
        cor: r.cor ?? undefined,
        numCriancas: r.numCriancas,
        previsaoCriancas: r.previsaoCriancas ?? undefined,
        numConfirmados: r.cacifos.filter((c) => c.criancas && c.criancas.trim() !== "" && c.criancas.trim() !== "Por preencher").length,
        idadeAniversariante,
        menu,
        notasLanche: r.menu?.notasLanche ?? undefined,
        notasLancheReserva: r.notasLanche ?? undefined,
        notasCacifos: r.notasCacifos ?? undefined,
        itensLanche: r.menu?.itensLanche ?? undefined,
        observacoesLesoes: r.observacoesLesoes ?? undefined,
        observacoesCacifo,
        extrasNomes,
        extrasLancheNomes,
        estadoLanche: (r.estadoLanche ?? "NAO_INICIADO") as EstadoLanche,
      };
    });

    const lanchesEntradas: LancheEntradaLivre[] = entradas.map((e) => {
      const criancas = (e.criancas as { nome: string; idade?: number }[]) ?? [];
      return {
        entradaLivreId: e.id,
        tipo: "ENTRADA_LIVRE",
        encarregadoNome: e.encarregadoNome,
        inicioEm: e.inicioEm.toISOString(),
        horaLanche: e.horaLanche ?? undefined,
        localNome: "Parque Geral",
        criancas,
        observacoesLesoes: e.observacoesLesoes ?? undefined,
        estadoLanche: (e.estadoLanche ?? "NAO_INICIADO") as EstadoLanche,
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
        salaLanche: true,
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

    const primeiroAniv = reserva.aniversariantes[0]?.aniversariante;
    const idadeAniversariante = primeiroAniv
      ? calcularIdade(primeiroAniv.dataNascimento, reserva.data)
      : undefined;

    return {
      reservaId: reserva.id,
      tipo: "FESTA",
      nomeFesta: nomesAniv || "—",
      data: reserva.data.toISOString(),
      horario: reserva.horario,
      horaLanche: reserva.horaLanche ?? undefined,
      localNome: reserva.local?.nome ?? "—",
      salaLancheNome: reserva.salaLanche?.nome ?? undefined,
      cor: reserva.cor ?? undefined,
      numCriancas: reserva.numCriancas,
      previsaoCriancas: reserva.previsaoCriancas ?? undefined,
      idadeAniversariante,
      menu,
      notasLanche: reserva.menu?.notasLanche ?? undefined,
      notasLancheReserva: reserva.notasLanche ?? undefined,
      notasCacifos: reserva.notasCacifos ?? undefined,
      itensLanche: reserva.menu?.itensLanche ?? undefined,
      observacoesLesoes: reserva.observacoesLesoes ?? undefined,
      estadoLanche: (reserva.estadoLanche ?? "NAO_INICIADO") as EstadoLanche,
    };
  },

  /**
   * Atualiza as notas de lanche / itens de lanche / observações de lesões de uma festa.
   * Cria o menu (vazio) se ainda não existir.
   */
  async atualizarNotasLanche(data: AtualizarNotasLancheDTO) {
    const reserva = await prisma.reserva.findUnique({ where: { id: data.reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    // Atualizar observações de lesões + hora do lanche na própria reserva
    const reservaUpdates: Record<string, unknown> = {};
    if (data.observacoesLesoes !== undefined) {
      reservaUpdates.observacoesLesoes = data.observacoesLesoes;
    }
    if (data.horaLanche !== undefined) {
      reservaUpdates.horaLanche = data.horaLanche;
    }
    if (Object.keys(reservaUpdates).length > 0) {
      await prisma.reserva.update({
        where: { id: data.reservaId },
        data: reservaUpdates,
      });
    }

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
   * Atualiza o estado do lanche de uma festa (não iniciado / a decorrer / terminado).
   */
  async atualizarEstadoLanche(reservaId: string, estado: EstadoLanche) {
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    return prisma.reserva.update({
      where: { id: reservaId },
      data: { estadoLanche: estado },
    });
  },

  /**
   * Atualiza o estado do lanche de uma entrada livre.
   */
  async atualizarEstadoLancheEntrada(entradaLivreId: string, estado: EstadoLanche) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id: entradaLivreId } });
    if (!entrada) throw new Error("NOT_FOUND");

    return prisma.entradaLivre.update({
      where: { id: entradaLivreId },
      data: { estadoLanche: estado },
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
