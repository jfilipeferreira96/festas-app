import prisma from "@festas/db";
import type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro } from "@saas/shared-types";

// Re-export types for controllers/routes
export type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro };

// ── Helpers ────────────────────────────────────────────────────

function criarLinhaVazia(descricao: string): LinhaRelatorio {
  return {
    descricao,
    quantidade: 0,
    totalCriancas: 0,
    valorNumerario: 0,
    valorMultibanco: 0,
    valorTransferencia: 0,
    valorMbway: 0,
  };
}

type AccMetodo = Pick<
  LinhaRelatorio,
  "valorNumerario" | "valorMultibanco" | "valorTransferencia" | "valorMbway"
>;

function somarPorMetodo(acc: AccMetodo, metodo: string | null | undefined, valor: number): void {
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
    // CARTAO e OUTRO não têm coluna própria no relatório
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
    }),
    criarLinhaVazia(descricaoTotal),
  );
}

/**
 * Verifica se uma linha tem algum valor (não é all-zeros).
 */
function linhaTemDados(l: LinhaRelatorio): boolean {
  return (
    l.quantidade > 0 ||
    l.totalCriancas > 0 ||
    l.valorNumerario > 0 ||
    l.valorMultibanco > 0 ||
    l.valorTransferencia > 0 ||
    l.valorMbway > 0
  );
}

/**
 * Remove linhas que são todas zeros de uma secção.
 * Se todas as linhas são zeros, retorna linhas vazias.
 */
function filtrarLinhasVazias(linhas: LinhaRelatorio[]): LinhaRelatorio[] {
  const filtradas = linhas.filter(linhaTemDados);
  return filtradas.length > 0 ? filtradas : [];
}

// ── Service ────────────────────────────────────────────────────

export const relatorioService = {
  /**
   * Gera relatório financeiro completo para um intervalo de datas.
   * Agrega dados de Reservas (festas) e Entradas Livres.
   * Só mostra linhas com dados reais — sem linhas hardcoded.
   */
  async getRelatorioFinanceiro(dataInicio: Date, dataFim: Date): Promise<RelatorioFinanceiro> {
    // O campo Reserva.data é armazenado como meia-noite UTC.
    // Para incluir todo o dia final, somamos 1 dia ao limite superior.
    const dataFimEnd = new Date(dataFim);
    dataFimEnd.setDate(dataFimEnd.getDate() + 1);

    const [reservas, entradas] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          data: { gte: dataInicio, lt: dataFimEnd },
          estado: { in: ["CONCLUIDA", "EM_CURSO"] },
        },
        include: {
          menu: true,
          extras: { include: { extra: true } },
        },
      }),
      prisma.entradaLivre.findMany({
        where: {
          inicioEm: { gte: dataInicio, lt: dataFimEnd },
          estado: "CONCLUIDA",
        },
        include: {
          extras: { include: { extra: true } },
        },
      }),
    ]);

    const festas = this.calcularFestas(reservas);
    const entradasLivresSecao = this.calcularEntradasLivres(entradas);
    const outros = this.calcularOutros(reservas, entradas);

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
      totalGeral,
    };
  },

  /**
   * Secção 1: Festas de Aniversário (MENU + EXTRAS)
   * Agrupa reservas por tipo de menu (nome real da BD).
   * Sem fallback hardcoded — se não há festas, não há linhas.
   */
  calcularFestas(
    reservas: Array<{
      numCriancas: number;
      metodoPagamento: string | null;
      valorPago: unknown;
      menu: { nome: string } | null;
      extras: Array<{ quantidade: number; extra: { nome: string; precoUnitario: unknown; subcategoria: string | null } }>;
    }>,
  ): SecaoRelatorio {
    const grupos = new Map<string, LinhaRelatorio>();

    for (const r of reservas) {
      const menuNome = r.menu?.nome ?? "Sem Menu Definido";
      if (!grupos.has(menuNome)) {
        grupos.set(menuNome, criarLinhaVazia(menuNome));
      }
      const linha = grupos.get(menuNome)!;
      linha.quantidade += 1;
      linha.totalCriancas += r.numCriancas;
      somarPorMetodo(linha, r.metodoPagamento, Number(r.valorPago ?? 0));
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
   * Agrupa por duração (1H, 2H, 3H) + lanches (extras).
   * Filtra linhas sem dados — só mostra o que existe de facto.
   */
  calcularEntradasLivres(
    entradas: Array<{
      duracaoMinutos: number;
      custoTotal: unknown;
      custoTotalFinal: unknown;
      metodoPagamento: string | null;
      criancas: unknown;
      extras: Array<{ quantidade: number; extra: { precoUnitario: unknown } }>;
    }>,
  ): SecaoRelatorio {
    const l1H = criarLinhaVazia("Entrada 1H");
    const l2H = criarLinhaVazia("Entrada 2H");
    const l3H = criarLinhaVazia("Entrada 3H");
    const lLanches = criarLinhaVazia("Lanches");

    for (const e of entradas) {
      const duracao = e.duracaoMinutos;
      const numCriancas = Array.isArray(e.criancas) ? e.criancas.length : 0;
      const valor = Number(e.custoTotalFinal ?? e.custoTotal ?? 0);

      // Classificar por duração
      const linha: LinhaRelatorio = duracao <= 60 ? l1H : duracao <= 120 ? l2H : l3H;

      linha.quantidade += 1;
      linha.totalCriancas += numCriancas;
      somarPorMetodo(linha, e.metodoPagamento, valor);

      // Lanches (extras das entradas livres)
      for (const ex of e.extras) {
        const extraValor = Number(ex.extra.precoUnitario) * ex.quantidade;
        lLanches.quantidade += ex.quantidade;
        somarPorMetodo(lLanches, e.metodoPagamento, extraValor);
      }
    }

    // Filtrar linhas all-zeros — só mostrar as que têm dados reais
    const linhas = filtrarLinhasVazias([l1H, l2H, l3H, lLanches]);

    return {
      titulo: "Entradas Livres",
      linhas,
      total: somarLinhas(linhas, "Total Entradas Livres"),
    };
  },

  /**
   * Secção 3: Outros
   * Cauções e Brindes — apenas dados reais do schema.
   * Sem linhas hardcoded sem modelo de dados.
   */
  calcularOutros(
    reservas: Array<{
      numCriancas: number;
      metodoPagamento: string | null;
      valorCaucao: unknown;
      caucao: string;
      extras: Array<{
        quantidade: number;
        extra: { precoUnitario: unknown; subcategoria: string | null };
      }>;
    }>,
    _entradas: unknown[],
  ): SecaoRelatorio {
    const lCaucoes40 = criarLinhaVazia("Cauções 40€");
    const lCaucoesOutros = criarLinhaVazia("Cauções outros valores");
    const lBrindes = criarLinhaVazia("Brindes");

    for (const r of reservas) {
      // Cauções
      if (r.caucao !== "NAO_PAGA" && r.valorCaucao) {
        const valorCaucao = Number(r.valorCaucao);
        if (valorCaucao === 40) {
          lCaucoes40.quantidade += 1;
          somarPorMetodo(lCaucoes40, r.metodoPagamento, valorCaucao);
        } else if (valorCaucao > 0) {
          lCaucoesOutros.quantidade += 1;
          somarPorMetodo(lCaucoesOutros, r.metodoPagamento, valorCaucao);
        }
      }

      // Brindes (extras com subcategoria "Brindes")
      for (const ex of r.extras) {
        if (ex.extra.subcategoria === "Brindes") {
          const valor = Number(ex.extra.precoUnitario) * ex.quantidade;
          lBrindes.quantidade += ex.quantidade;
          lBrindes.totalCriancas += r.numCriancas;
          somarPorMetodo(lBrindes, r.metodoPagamento, valor);
        }
      }
    }

    // Filtrar linhas all-zeros — só mostrar as que têm dados reais
    const linhas = filtrarLinhasVazias([lCaucoes40, lCaucoesOutros, lBrindes]);

    return {
      titulo: "Outros",
      linhas,
      total: somarLinhas(linhas, "Total"),
    };
  },
};