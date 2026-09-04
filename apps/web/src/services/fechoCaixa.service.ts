import prisma from "@festas/db";
import { relatorioService } from "@/services/relatorio.service";

/** Métodos com coluna própria no relatório financeiro. */
const METODOS = ["DINHEIRO", "MULTIBANCO", "TRANSFERENCIA", "MBWAY", "CARTAO", "OUTRO"] as const;
type Metodo = (typeof METODOS)[number];

export interface FechoCaixaAjuste {
  id: string;
  tipo: string;
  modo: string | null;
  valor: number;
  precoPorCabeca: number | null;
  motivo: string;
  metodoPagamento: string | null;
  reservaId: string | null;
  entradaLivreId: string | null;
  criadoPor: { id: string; name: string } | null;
  createdAt: Date;
}

export interface FechoCaixa {
  data: string;
  /** Total recebido por método de pagamento (inclui ajustes via valorPago write-through) */
  porMetodo: Record<Metodo, number>;
  numerario: number;
  eletronico: number;
  total: number;
  detalhe: {
    festas: number;
    entradasLivres: number;
    outros: number;
  };
  /** Auditoria: ajustes registados no dia (ACRESCIMO/DESCONTO/REDEFINICAO) */
  ajustes: FechoCaixaAjuste[];
  /** Líquido informativo dos acréscimos/descontos do dia (redefinições excluídas) */
  ajustesLiquido: number;
}

interface SessionUser {
  id: string;
  funcao?: string | null;
}

function toNum(valor: unknown): number {
  return valor == null ? 0 : Number(valor);
}

export const fechoCaixaService = {
  /**
   * Fecho de caixa de um dia: quanto se recebeu por método (numerário vs eletrónico).
   * Reutiliza a agregação do relatório financeiro (mesma fonte de verdade) e
   * acrescenta a lista de ajustes do dia para auditoria.
   *
   * Nota: os acertos de pagamento são aplicados por write-through em
   * `valorPago`/`custoTotalFinal`, pelo que já estão refletidos nos totais -
   * a lista de ajustes é apenas auditoria (não soma, evita dupla contagem).
   */
  async getFechoCaixa(dataISO: string, user?: SessionUser): Promise<FechoCaixa> {
    if (user && user.funcao !== "ADMINISTRADOR") throw new Error("UNAUTHORIZED");

    const data = new Date(`${dataISO}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime())) throw new Error("DATA_INVALIDA");

    const dataFim = new Date(data);
    dataFim.setDate(dataFim.getDate() + 1);

    // Mesma agregação do relatório - consistência garantida com /relatorios
    const rel = await relatorioService.getRelatorioFinanceiro(data, data);

    const porMetodo = {
      DINHEIRO: rel.totalGeral.valorNumerario,
      MULTIBANCO: rel.totalGeral.valorMultibanco,
      TRANSFERENCIA: rel.totalGeral.valorTransferencia,
      MBWAY: rel.totalGeral.valorMbway,
      CARTAO: rel.totalGeral.valorCartao,
      OUTRO: rel.totalGeral.valorOutro,
    } as Record<Metodo, number>;

    const total = METODOS.reduce((sum, m) => sum + porMetodo[m], 0);
    const numerario = porMetodo.DINHEIRO;

    const somaLinha = (l: typeof rel.totalGeral): number =>
      toNum(l.valorNumerario) +
      toNum(l.valorMultibanco) +
      toNum(l.valorTransferencia) +
      toNum(l.valorMbway) +
      toNum(l.valorCartao) +
      toNum(l.valorOutro);

    const ajustesRaw = await prisma.ajustePagamento.findMany({
      where: { createdAt: { gte: data, lt: dataFim } },
      include: { criadoPor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const ajustes: FechoCaixaAjuste[] = ajustesRaw.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      modo: a.modo,
      valor: Number(a.valor),
      precoPorCabeca: a.precoPorCabeca != null ? Number(a.precoPorCabeca) : null,
      motivo: a.motivo,
      metodoPagamento: a.metodoPagamento,
      reservaId: a.reservaId,
      entradaLivreId: a.entradaLivreId,
      criadoPor: a.criadoPor,
      createdAt: a.createdAt,
    }));

    const ajustesLiquido = ajustes.reduce(
      (sum, a) => (a.tipo === "ACRESCIMO" ? sum + a.valor : a.tipo === "DESCONTO" ? sum - a.valor : sum),
      0
    );

    return {
      data: dataISO,
      porMetodo,
      numerario,
      eletronico: Math.round((total - numerario) * 100) / 100,
      total: Math.round(total * 100) / 100,
      detalhe: {
        festas: somaLinha(rel.festas.total),
        entradasLivres: somaLinha(rel.entradasLivres.total),
        outros: somaLinha(rel.outros.total),
      },
      ajustes,
      ajustesLiquido: Math.round(ajustesLiquido * 100) / 100,
    };
  },
};
