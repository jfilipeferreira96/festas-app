import { differenceInYears } from "date-fns";
import prisma from "@festas/db";
import { reservaService } from "@/services/reserva.service";

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Serviço de Festas a Acabar - usado pela conta FESTAS_ACABAR.
 * Mostra as festas EM_CURSO, ordenadas por hora de saída (fimPrevisto).
 */
export const festasAcabarService = {
  /**
   * Dados para o ecrã TV: festas EM_CURSO/CONCLUIDA recentes + entradas livres ativas.
   * Janela de ±5 minutos em torno do fimPrevisto.
   */
  async getFestasTV() {
    const agora = new Date();
    await reservaService.autoIniciarVencidas().catch(() => undefined);
    // Pedido do cliente (19/09/2026): o monitor mostra festas/entradas quando
    // faltam 10 min para o fim e mantém-nas até serem concluídas (sem limite
    // inferior - festas atrasadas continuam visíveis).
    const limiteSuperior = new Date(agora.getTime() + 10 * 60 * 1000);
    // Lanche: chamar 10 min antes da horaLanche (janela de 30 min depois)
    const lancheMin = new Date(agora.getTime() - 30 * 60 * 1000);
    const lancheMax = new Date(agora.getTime() + 10 * 60 * 1000);

    const hoje = new Date(agora);
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);

    const [festas, entradas, festasLancheHoje] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          estado: "EM_CURSO",
          fimPrevisto: { lte: limiteSuperior },
        },
        include: {
          aniversariantes: { include: { aniversariante: true } },
        },
        orderBy: { fimPrevisto: "asc" },
      }),
      prisma.entradaLivre.findMany({
        where: {
          estado: "ATIVA",
          fimPrevisto: { lte: limiteSuperior },
        },
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
      // Lanches de hoje (EM_CURSO com horaLanche marcada) - a TV avisa a
      // equipa 10 min antes da hora do lanche
      prisma.reserva.findMany({
        where: {
          estado: "EM_CURSO",
          data: { gte: hoje, lt: amanha },
          horaLanche: { not: null },
        },
        include: { aniversariantes: { include: { aniversariante: { select: { nome: true } } } } },
        orderBy: { horaLanche: "asc" },
      }),
    ]);

    const festasFormatadas = festas.map((r: typeof festas[number]) => {
      const nomesAniv = r.aniversariantes
        .map((a: typeof r.aniversariantes[number]) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");

      return {
        id: r.id,
        nomeFesta: nomesAniv || "-",
        cor: r.cor,
        numCriancas: r.numCriancas,
        inicioEm: r.inicioEm?.toISOString() ?? null,
        fimPrevisto: r.fimPrevisto?.toISOString() ?? null,
        estado: r.estado,
      };
    });

    const entradasFormatadas = entradas.map((e: typeof entradas[number]) => {
      const criancasNomes = Array.isArray(e.criancas)
        ? (e.criancas as Array<{ nome?: string }>).map((c) => c.nome).filter(Boolean).join(", ")
        : "";
      return {
        id: e.id,
        criancasNomes: criancasNomes || "-",
        encarregadoNome: e.encarregadoNome,
        inicioEm: e.inicioEm?.toISOString() ?? null,
        fimPrevisto: e.fimPrevisto?.toISOString() ?? null,
        duracaoMinutos: e.duracaoMinutos,
        numCriancas: Array.isArray(e.criancas) ? e.criancas.length : 0,
      };
    });

    // Lanches dentro da janela [horaLanche - 30min, horaLanche + 10min]
    const lanchesFormatados = festasLancheHoje
      .map((r) => {
        const [h, m] = (r.horaLanche ?? "").split(":").map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        const lancheEm = new Date(r.data);
        lancheEm.setHours(h, m, 0, 0);
        if (lancheEm < lancheMin || lancheEm > lancheMax) return null;
        return {
          id: r.id,
          nomeFesta:
            r.aniversariantes
              .map((a) => a.aniversariante?.nome)
              .filter(Boolean)
              .join(", ") || "-",
          cor: r.cor,
          horaLanche: r.horaLanche ?? "",
          numCriancas: r.numCriancas,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    return { festas: festasFormatadas, entradas: entradasFormatadas, lanches: lanchesFormatados };
  },

  async getFestas() {
    const festas = await prisma.reserva.findMany({
      where: { estado: "EM_CURSO" },
      include: {
        aniversariantes: { include: { aniversariante: true } },
        cacifos: true,
        extras: { include: { extra: true } },
        pagamentos: { select: { valor: true } },
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
        nomeFesta: nomesAniv || "-",
        cor: r.cor,
        idadeAniversariante,
        numCriancas: r.numCriancas,
        inicioEm: r.inicioEm?.toISOString() ?? null,
        fimPrevisto: r.fimPrevisto?.toISOString() ?? null,
        pago: r.pago,
        // Total acordado (fallback: soma do ledger)
        valorPago:
          r.valorTotal != null
            ? Number(r.valorTotal)
            : r.pagamentos.length > 0
              ? round2(r.pagamentos.reduce((s, p) => s + Number(p.valor), 0))
              : null,
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
   * Entradas livres ATIVAS - para o balcão (FESTAS_ACABAR) acompanhar
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
        criancasNomes: criancas.map((c) => c.nome).filter(Boolean).join(", ") || "-",
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
