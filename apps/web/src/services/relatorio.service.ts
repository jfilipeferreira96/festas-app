import prisma from "@festas/db";
import type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro } from "@saas/shared-types";

// Re-export types for controllers/routes
export type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro };

// ── Helpers ────────────────────────────────────────────────────

/** Converte um valor (Decimal, string, number, null) em number seguro. */
function toNum(valor: unknown): number {
  return valor == null ? 0 : Number(valor);
}

function criarLinhaVazia(descricao: string): LinhaRelatorio {
  return {
    descricao,
    quantidade: 0,
    totalCriancas: 0,
    valorNumerario: 0,
    valorMultibanco: 0,
    valorTransferencia: 0,
    valorMbway: 0,
    valorCartao: 0,
    valorOutro: 0,
  };
}

type AccMetodo = Pick<
  LinhaRelatorio,
  "valorNumerario" | "valorMultibanco" | "valorTransferencia" | "valorMbway" | "valorCartao" | "valorOutro"
>;

/**
 * Soma um valor ao acumulador certo, consoante o método de pagamento.
 * Todos os 6 métodos têm coluna própria - nenhum valor se perde.
 */
function somarPorMetodo(acc: AccMetodo, metodo: string | null | undefined, valor: number): void {
  if (valor <= 0) return;
  switch (metodo) {
    case "DINHEIRO":
      acc.valorNumerario += valor;
      break;
    case "MULTIBANCO":
      acc.valorMultibanco += valor;
      break;
    case "TRANSFERENCIA":
      acc.valorTransferencia += valor;
      break;
    case "MBWAY":
      acc.valorMbway += valor;
      break;
    case "CARTAO":
      acc.valorCartao += valor;
      break;
    case "OUTRO":
      acc.valorOutro += valor;
      break;
    // método nulo/desconhecido → não soma (não há como classificar)
  }
}

function somarLinhas(linhas: LinhaRelatorio[], descricaoTotal: string): LinhaRelatorio {
  return linhas.reduce(
    (acc, l) => ({
      descricao: descricaoTotal,
      quantidade: acc.quantidade + l.quantidade,
      totalCriancas: acc.totalCriancas + l.totalCriancas,
      valorNumerario: acc.valorNumerario + l.valorNumerario,
      valorMultibanco: acc.valorMultibanco + l.valorMultibanco,
      valorTransferencia: acc.valorTransferencia + l.valorTransferencia,
      valorMbway: acc.valorMbway + l.valorMbway,
      valorCartao: acc.valorCartao + l.valorCartao,
      valorOutro: acc.valorOutro + l.valorOutro,
    }),
    criarLinhaVazia(descricaoTotal),
  );
}

/** Verifica se uma linha tem algum valor (não é toda zeros). */
function linhaTemDados(l: LinhaRelatorio): boolean {
  return (
    l.quantidade > 0 ||
    l.totalCriancas > 0 ||
    l.valorNumerario > 0 ||
    l.valorMultibanco > 0 ||
    l.valorTransferencia > 0 ||
    l.valorMbway > 0 ||
    l.valorCartao > 0 ||
    l.valorOutro > 0
  );
}

/** Remove linhas que são todas zeros. */
function filtrarLinhasVazias(linhas: LinhaRelatorio[]): LinhaRelatorio[] {
  const filtradas = linhas.filter(linhaTemDados);
  return filtradas.length > 0 ? filtradas : [];
}

// ── Tipos das entidades lidas da BD (apenas os campos usados) ──

interface ReservaRelatorio {
  numCriancas: number;
  estado: string;
  pago: boolean;
  valorTotal?: unknown;
  // Ledger de pagamentos (fonte única do recebido)
  pagamentos: Array<{ valor: unknown; metodo: string }>;
  // Caução
  caucao: string;
  valorCaucao: unknown;
  // Excesso
  custoExcesso: unknown;
  pagoExcesso: boolean;
  // Meias
  meiasQuantidade: number | null;
  meiasPrecoUnit: unknown;
  menu: { nome: string } | null;
  extras: Array<{ quantidade: number; extra: { precoUnitario: unknown; subcategoria: string | null } }>;
}

interface EntradaRelatorio {
  duracaoMinutos: number;
  custoTotal: unknown;
  custoTotalFinal: unknown;
  // Ledger de pagamentos (fonte única do recebido)
  pagamentos: Array<{ valor: unknown; metodo: string }>;
  pago: boolean;
  criancas: unknown;
  meiasQuantidade: number | null;
  meiasPrecoUnit: unknown;
  extras: Array<{ quantidade: number; extra: { precoUnitario: unknown } }>;
}

interface AjusteRelatorio {
  tipo: string;
  valor: unknown;
  metodoPagamento: string | null;
  reserva: { pagamentos: Array<{ metodo: string }> } | null;
  entradaLivre: { pagamentos: Array<{ metodo: string }> } | null;
}

// ── Service ────────────────────────────────────────────────────

export const relatorioService = {
  /**
   * Gera relatório financeiro completo para um intervalo de datas.
   * Agrega dados de Reservas (festas) e Entradas Livres.
   * Só mostra linhas com dados reais - sem linhas hardcoded.
   *
   * Inclui festas: CONCLUIDA, EM_CURSO e CONFIRMADAS que estejam pagas.
   */
  async getRelatorioFinanceiro(dataInicio: Date, dataFim: Date): Promise<RelatorioFinanceiro> {
    // O campo Reserva.data é armazenado como meia-noite UTC.
    // Para incluir todo o dia final, somamos 1 dia ao limite superior.
    const dataFimEnd = new Date(dataFim);
    dataFimEnd.setDate(dataFimEnd.getDate() + 1);

    const [reservas, entradas, ajustes] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          data: { gte: dataInicio, lt: dataFimEnd },
          // CONCLUIDA + EM_CURSO sempre; CONFIRMADO só se já foi paga
          OR: [
            { estado: { in: ["CONCLUIDA", "EM_CURSO"] } },
            { estado: "CONFIRMADO", pago: true },
          ],
        },
        include: {
          menu: true,
          extras: { include: { extra: true } },
          pagamentos: { select: { valor: true, metodo: true } },
        },
      }),
      prisma.entradaLivre.findMany({
        where: {
          inicioEm: { gte: dataInicio, lt: dataFimEnd },
          estado: "CONCLUIDA",
        },
        include: {
          extras: { include: { extra: true } },
          pagamentos: { select: { valor: true, metodo: true } },
        },
      }),
      prisma.ajustePagamento.findMany({
        where: {
          createdAt: { gte: dataInicio, lt: dataFimEnd },
        },
        include: {
          reserva: {
            select: { pagamentos: { select: { metodo: true }, orderBy: { createdAt: "asc" }, take: 1 } },
          },
          entradaLivre: {
            select: { pagamentos: { select: { metodo: true }, orderBy: { createdAt: "asc" }, take: 1 } },
          },
        },
      }),
    ]);

    const festas = this.calcularFestas(reservas as unknown as ReservaRelatorio[]);
    const entradasLivresSecao = this.calcularEntradasLivres(
      entradas as unknown as EntradaRelatorio[],
    );
    const outros = this.calcularOutros(
      reservas as unknown as ReservaRelatorio[],
      entradas as unknown as EntradaRelatorio[],
    );
    const ajustesSecao = this.calcularAjustes(ajustes as unknown as AjusteRelatorio[]);

    // Nota: ajustes NÃO somam ao total geral - são write-through (já incluídos
    // em valorPago/custoTotalFinal das festas/entradas). Secção de auditoria.
    const totalGeral = somarLinhas(
      [festas.total, entradasLivresSecao.total, outros.total],
      "TOTAL",
    );

    return {
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      festas,
      entradasLivres: entradasLivresSecao,
      outros,
      ajustes: ajustesSecao,
      totalGeral,
    };
  },

  /**
   * Secção 1: Festas de Aniversário
   * Agrupa reservas por tipo de menu.
   * Soma o valor pago (método 1 + método 2 do pagamento dividido).
   * Sem fallback hardcoded - se não há festas, não há linhas.
   */
  calcularFestas(reservas: ReservaRelatorio[]): SecaoRelatorio {
    const grupos = new Map<string, LinhaRelatorio>();

    for (const r of reservas) {
      const menuNome = r.menu?.nome ?? "Sem Menu Definido";
      if (!grupos.has(menuNome)) {
        grupos.set(menuNome, criarLinhaVazia(menuNome));
      }
      const linha = grupos.get(menuNome)!;
      linha.quantidade += 1;
      linha.totalCriancas += r.numCriancas;

      // Fonte única: ledger de pagamentos (N métodos)
      for (const p of r.pagamentos) somarPorMetodo(linha, p.metodo, toNum(p.valor));
    }

    const linhas = Array.from(grupos.values()).sort((a, b) => b.quantidade - a.quantidade);

    return {
      titulo: "Festas de Aniversário",
      linhas,
      total: somarLinhas(linhas, "Total Festas"),
    };
  },

  /**
   * Secção 2: Entradas Livres
   * Agrupa por duração (1H, 2H, 3H).
   * Fonte única: custoTotalFinal (inclui excesso, extras e meias);
   * os métodos vêm do ledger de pagamentos (N métodos por entrada).
   * Extras e lanches são listados como linhas informativas (já incluídos no custo).
   */
  calcularEntradasLivres(entradas: EntradaRelatorio[]): SecaoRelatorio {
    const l1H = criarLinhaVazia("Entrada 1H");
    const l2H = criarLinhaVazia("Entrada 2H");
    const l3H = criarLinhaVazia("Entrada 3H");
    const lLanches = criarLinhaVazia("Lanches e Extras");

    for (const e of entradas) {
      const duracao = e.duracaoMinutos;
      const numCriancas = Array.isArray(e.criancas) ? e.criancas.length : 0;

      // Classificar por duração
      const linha: LinhaRelatorio = duracao <= 60 ? l1H : duracao <= 120 ? l2H : l3H;

      linha.quantidade += 1;
      linha.totalCriancas += numCriancas;

      // Fonte única: ledger de pagamentos (N métodos)
      for (const p of e.pagamentos) somarPorMetodo(linha, p.metodo, toNum(p.valor));

      // Lanches/extras (informativo - já incluídos no custoTotalFinal)
      const metodoLanches = e.pagamentos[0]?.metodo ?? null;
      for (const ex of e.extras) {
        const extraValor = toNum(ex.extra.precoUnitario) * ex.quantidade;
        lLanches.quantidade += ex.quantidade;
        somarPorMetodo(lLanches, metodoLanches, extraValor);
      }
    }

    const linhas = filtrarLinhasVazias([l1H, l2H, l3H]);

    return {
      titulo: "Entradas Livres",
      linhas,
      total: somarLinhas(linhas, "Total Entradas Livres"),
      linhasInformativas: filtrarLinhasVazias([lLanches]),
    };
  },

  /**
   * Secção 3: Outros
   * Cauções e Excesso de Tempo (festas) somam ao total.
   * Meias e Brindes são informativas - já incluídas no custo total.
   * Método de atribuição: 1º pagamento do ledger da entidade.
   */
  calcularOutros(reservas: ReservaRelatorio[], entradas: EntradaRelatorio[]): SecaoRelatorio {
    // Método do 1º pagamento do ledger (null se não houver pagamentos)
    const metodoPrincipal = (entidade: { pagamentos: Array<{ metodo: string }> }): string | null =>
      entidade.pagamentos[0]?.metodo ?? null;
    const lCaucoes40 = criarLinhaVazia("Cauções 40€");
    const lCaucoesOutros = criarLinhaVazia("Cauções outros valores");
    const lExcesso = criarLinhaVazia("Excesso de Tempo");
    const lMeias = criarLinhaVazia("Meias");
    const lBrindes = criarLinhaVazia("Brindes");

    for (const r of reservas) {
      const metodo = metodoPrincipal(r);

      // ── Cauções ──
      if (r.caucao !== "NAO_PAGA" && r.valorCaucao) {
        const valorCaucao = toNum(r.valorCaucao);
        if (valorCaucao === 40) {
          lCaucoes40.quantidade += 1;
          somarPorMetodo(lCaucoes40, metodo, valorCaucao);
        } else if (valorCaucao > 0) {
          lCaucoesOutros.quantidade += 1;
          somarPorMetodo(lCaucoesOutros, metodo, valorCaucao);
        }
      }

      // ── Excesso de tempo (só se foi pago) ──
      const custoExcesso = toNum(r.custoExcesso);
      if (r.pagoExcesso && custoExcesso > 0) {
        lExcesso.quantidade += 1;
        somarPorMetodo(lExcesso, metodo, custoExcesso);
      }

      // ── Meias (festa) - informativa ──
      const qtdMeias = r.meiasQuantidade ?? 0;
      if (qtdMeias > 0) {
        const valorMeias = qtdMeias * toNum(r.meiasPrecoUnit);
        lMeias.quantidade += qtdMeias;
        somarPorMetodo(lMeias, metodo, valorMeias);
      }

      // ── Brindes (extras com subcategoria "Brindes") - informativa ──
      for (const ex of r.extras) {
        if (ex.extra.subcategoria === "Brindes") {
          const valor = toNum(ex.extra.precoUnitario) * ex.quantidade;
          lBrindes.quantidade += ex.quantidade;
          lBrindes.totalCriancas += r.numCriancas;
          somarPorMetodo(lBrindes, metodo, valor);
        }
      }
    }

    // ── Meias (entradas livres) - informativa ──
    for (const e of entradas) {
      const metodoEntrada = metodoPrincipal(e);
      const qtdMeias = e.meiasQuantidade ?? 0;
      if (qtdMeias > 0) {
        const valorMeias = qtdMeias * toNum(e.meiasPrecoUnit);
        lMeias.quantidade += qtdMeias;
        somarPorMetodo(lMeias, metodoEntrada, valorMeias);
      }
    }

    const linhas = filtrarLinhasVazias([
      lCaucoes40,
      lCaucoesOutros,
      lExcesso,
    ]);

    return {
      titulo: "Outros",
      linhas,
      total: somarLinhas(linhas, "Total"),
      linhasInformativas: filtrarLinhasVazias([lMeias, lBrindes]),
    };
  },

  /**
   * Secção 4: Ajustes de Pagamento (informativa)
   * Acréscimos cobrados, descontos concedidos e redefinições de preço.
   *
   * IMPORTANTE: os ajustes são write-through - o valor final da festa/entrada
   * já reflecte o acerto. Por isso esta secção é apenas auditoria e NÃO soma
   * ao totalGeral (evitar dupla contagem).
   */
  calcularAjustes(ajustes: AjusteRelatorio[]): SecaoRelatorio {
    const lAcrescimos = criarLinhaVazia("Acréscimos cobrados");
    const lDescontos = criarLinhaVazia("Descontos concedidos");
    const lRedefinicoes = criarLinhaVazia("Redefinições de preço");

    for (const a of ajustes) {
      // Método do acerto; se vazio, usa o método principal (1º pagamento) da entidade alvo
      const metodo =
        a.metodoPagamento ??
        a.reserva?.pagamentos?.[0]?.metodo ??
        a.entradaLivre?.pagamentos?.[0]?.metodo;
      const valor = Math.abs(toNum(a.valor));

      switch (a.tipo) {
        case "ACRESCIMO":
          lAcrescimos.quantidade += 1;
          somarPorMetodo(lAcrescimos, metodo, valor);
          break;
        case "DESCONTO":
          lDescontos.quantidade += 1;
          somarPorMetodo(lDescontos, metodo, valor);
          break;
        case "REDEFINICAO":
          lRedefinicoes.quantidade += 1;
          somarPorMetodo(lRedefinicoes, metodo, valor);
          break;
      }
    }

    const linhas = filtrarLinhasVazias([lAcrescimos, lDescontos, lRedefinicoes]);

    return {
      titulo: "Ajustes de Pagamento (auditoria)",
      linhas,
      total: somarLinhas(linhas, "Total Ajustes"),
    };
  },
};
