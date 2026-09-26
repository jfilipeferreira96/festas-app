import prisma from "@festas/db";

/** Métodos com coluna própria no relatório financeiro. */
const METODOS = ["DINHEIRO", "MULTIBANCO", "TRANSFERENCIA", "MBWAY", "CARTAO", "OUTRO"] as const;
type Metodo = (typeof METODOS)[number];

/** Notas das linhas sintéticas do ledger - quebradas como "outros" no detalhe. */
const NOTAS_SINTETICAS = new Set(["Caução", "Excesso de tempo"]);

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
  /** Total recebido por método de pagamento (data de recebimento = dia) */
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

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export const fechoCaixaService = {
  /**
   * Fecho de caixa de um dia: o que ENTROU na gaveta, por data de recebimento
   * (Pagamento.createdAt) - não pela data da festa. CANCELADAs ficam de fora;
   * ajustes são write-through (lista apenas para auditoria).
   */
  async getFechoCaixa(dataISO: string, user?: SessionUser): Promise<FechoCaixa> {
    if (user && user.funcao !== "ADMINISTRADOR") throw new Error("UNAUTHORIZED");

    const data = new Date(`${dataISO}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime())) throw new Error("DATA_INVALIDA");

    const dataFim = new Date(data);
    dataFim.setDate(dataFim.getDate() + 1);

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        createdAt: { gte: data, lt: dataFim },
        OR: [
          { reserva: { estado: { not: "CANCELADA" } } },
          { entradaLivre: { estado: { not: "CANCELADA" } } },
        ],
      },
      select: {
        valor: true,
        metodo: true,
        nota: true,
        reservaId: true,
        entradaLivreId: true,
      },
    });

    const porMetodo = {
      DINHEIRO: 0,
      MULTIBANCO: 0,
      TRANSFERENCIA: 0,
      MBWAY: 0,
      CARTAO: 0,
      OUTRO: 0,
    } as Record<Metodo, number>;

    const detalhe = { festas: 0, entradasLivres: 0, outros: 0 };

    for (const p of pagamentos) {
      const valor = toNum(p.valor);
      if (valor <= 0) continue;
      if ((METODOS as readonly string[]).includes(p.metodo)) {
        porMetodo[p.metodo as Metodo] += valor;
      }
      if (p.reservaId) {
        if (NOTAS_SINTETICAS.has(p.nota ?? "")) detalhe.outros += valor;
        else detalhe.festas += valor;
      } else if (p.entradaLivreId) {
        detalhe.entradasLivres += valor;
      }
    }

    for (const m of METODOS) porMetodo[m] = arredondar2(porMetodo[m]);
    detalhe.festas = arredondar2(detalhe.festas);
    detalhe.entradasLivres = arredondar2(detalhe.entradasLivres);
    detalhe.outros = arredondar2(detalhe.outros);

    const total = arredondar2(METODOS.reduce((sum, m) => sum + porMetodo[m], 0));
    const numerario = porMetodo.DINHEIRO;

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
      eletronico: arredondar2(total - numerario),
      total,
      detalhe,
      ajustes,
      ajustesLiquido: arredondar2(ajustesLiquido),
    };
  },
};
