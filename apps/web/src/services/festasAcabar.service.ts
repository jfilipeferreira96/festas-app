import { differenceInYears } from "date-fns";
import prisma from "@festas/db";

/**
 * Serviço de Festas a Acabar — usado pela conta FESTAS_ACABAR.
 * Mostra as festas EM_CURSO, ordenadas por hora de saída (fimPrevisto).
 */
export const festasAcabarService = {
  /**
   * Dados para o ecrã TV: festas EM_CURSO/CONCLUIDA recentes + entradas livres ativas.
   * Janela de ±5 minutos em torno do fimPrevisto.
   */
  async getFestasTV() {
    const agora = new Date();
    const janelaMin = new Date(agora.getTime() - 5 * 60 * 1000); // 5 min atrás
    const janelaMax = new Date(agora.getTime() + 5 * 60 * 1000); // 5 min à frente

    const [festas, entradas] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          estado: { in: ["EM_CURSO", "CONCLUIDA"] },
          fimPrevisto: { gte: janelaMin, lte: janelaMax },
        },
        include: {
          local: true,
          aniversariantes: { include: { aniversariante: true } },
        },
        orderBy: { fimPrevisto: "asc" },
      }),
      prisma.entradaLivre.findMany({
        where: { estado: "ATIVA" },
        select: {
          id: true,
          criancas: true,
          encarregadoNome: true,
          inicioEm: true,
          fimPrevisto: true,
          duracaoMinutos: true,
        },
        orderBy: { inicioEm: "asc" },
      }),
    ]);

    const festasFormatadas = festas.map((r: typeof festas[number]) => {
      const nomesAniv = r.aniversariantes
        .map((a: typeof r.aniversariantes[number]) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");

      return {
        id: r.id,
        nomeFesta: nomesAniv || "—",
        cor: r.cor,
        numCriancas: r.numCriancas,
        inicioEm: r.inicioEm?.toISOString() ?? null,
        fimPrevisto: r.fimPrevisto?.toISOString() ?? null,
        localNome: r.local?.nome ?? "—",
        estado: r.estado,
      };
    });

    const entradasFormatadas = entradas.map((e: typeof entradas[number]) => {
      const criancasNomes = Array.isArray(e.criancas)
        ? (e.criancas as Array<{ nome?: string }>).map((c) => c.nome).filter(Boolean).join(", ")
        : "";
      return {
        id: e.id,
        criancasNomes: criancasNomes || "—",
        encarregadoNome: e.encarregadoNome,
        inicioEm: e.inicioEm?.toISOString() ?? null,
        fimPrevisto: e.fimPrevisto?.toISOString() ?? null,
        duracaoMinutos: e.duracaoMinutos,
        numCriancas: Array.isArray(e.criancas) ? e.criancas.length : 0,
      };
    });

    return { festas: festasFormatadas, entradas: entradasFormatadas };
  },

  async getFestas() {
    const festas = await prisma.reserva.findMany({
      where: { estado: "EM_CURSO" },
      include: {
        local: true,
        aniversariantes: { include: { aniversariante: true } },
        cacifos: true,
        extras: { include: { extra: true } },
      },
      orderBy: { fimPrevisto: "asc" },
    });

    return festas.map((r) => {
      const nomesAniv = r.aniversariantes
        .map((a) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");

      // Calcular idade do primeiro aniversariante com dataNascimento
      const primeiroAniv = r.aniversariantes.find((a) => a.aniversariante?.dataNascimento);
      const idadeAniversariante =
        primeiroAniv?.aniversariante?.dataNascimento
          ? differenceInYears(new Date(r.data ?? new Date()), new Date(primeiroAniv.aniversariante.dataNascimento))
          : null;

      // Notas dos cacifos atribuídos (concatenadas, primeiro campo preenchido)
      const observacoesCacifo =
        r.cacifos
          .map((c) => c.notas)
          .filter(Boolean)
          .join("; ") || undefined;

      return {
        id: r.id,
        nomeFesta: nomesAniv || "—",
        cor: r.cor,
        idadeAniversariante,
        numCriancas: r.numCriancas,
        inicioEm: r.inicioEm?.toISOString() ?? null,
        fimPrevisto: r.fimPrevisto?.toISOString() ?? null,
        localNome: r.local?.nome ?? "—",
        pago: r.pago,
        valorPago: r.valorPago != null ? Number(r.valorPago) : null,
        extras: r.extras.map((re) => ({
          id: re.id,
          nome: re.extra?.nome ?? "Extra",
          quantidade: re.quantidade,
          concluido: re.concluido,
        })),
        notasCacifos: r.notasCacifos ?? undefined,
        observacoesCacifo,
        observacoesBrindes: r.observacoesBrindes ?? "",
        observacoesBrindesPais: r.observacoesBrindesPais ?? "",
        observacoesLesoes: r.observacoesLesoes ?? "",
      };
    });
  },

  /**
   * Entradas livres ATIVAS — para o balcão (FESTAS_ACABAR) acompanhar
   * pagamento, tempo e confirmação do lanche. Sem acções de gestão
   * (concluir/pagar ficam na página de admin /entradas-livres).
   */
  async getEntradasAtivas() {
    const entradas = await prisma.entradaLivre.findMany({
      where: { estado: "ATIVA" },
      orderBy: { fimPrevisto: "asc" },
    });

    return entradas.map((e) => {
      const criancas = Array.isArray(e.criancas)
        ? (e.criancas as Array<{ nome?: string }>)
        : [];
      return {
        id: e.id,
        criancasNomes: criancas.map((c) => c.nome).filter(Boolean).join(", ") || "—",
        numCriancas: criancas.length,
        encarregadoNome: e.encarregadoNome,
        inicioEm: e.inicioEm.toISOString(),
        fimPrevisto: e.fimPrevisto.toISOString(),
        duracaoMinutos: e.duracaoMinutos,
        pago: e.pago,
        temLanche: e.temLanche,
        estadoLanche: e.estadoLanche,
        horaLanche: e.horaLanche ?? undefined,
        observacoes: e.observacoes ?? undefined,
        observacoesLesoes: e.observacoesLesoes ?? undefined,
      };
    });
  },

  async atualizarObservacoes(
    reservaId: string,
    data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string }
  ) {
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    return prisma.reserva.update({
      where: { id: reservaId },
      data: {
        ...(data.observacoesLesoes !== undefined && { observacoesLesoes: data.observacoesLesoes }),
        ...(data.observacoesBrindes !== undefined && { observacoesBrindes: data.observacoesBrindes }),
        ...(data.observacoesBrindesPais !== undefined && { observacoesBrindesPais: data.observacoesBrindesPais }),
      },
    });
  },
};
