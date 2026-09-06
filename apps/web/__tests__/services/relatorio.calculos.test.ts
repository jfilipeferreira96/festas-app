import { describe, it, expect, vi } from "vitest";

// Mock do Prisma - os testes abaixo usam as funções PURAS de cálculo (sem BD).
vi.mock("@festas/db", () => ({
  default: {},
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  },
}));

import { relatorioService } from "@/services/relatorio.service";
import type { LinhaRelatorio } from "@saas/shared-types";

// Helpers para construir registos de teste de forma concisa (ledger de pagamentos)
function somaValores(linha: LinhaRelatorio): number {
  return (
    linha.valorNumerario +
    linha.valorMultibanco +
    linha.valorTransferencia +
    linha.valorMbway +
    linha.valorCartao +
    linha.valorOutro
  );
}

type PagamentoFixture = { valor: number; metodo: string };

function reservaFixture(overrides: {
  numCriancas: number;
  pagamentos: PagamentoFixture[];
  caucao?: string;
  valorCaucao?: number | null;
  custoExcesso?: number | null;
  pagoExcesso?: boolean;
  meiasQuantidade?: number | null;
  meiasPrecoUnit?: number | null;
  menu?: { nome: string } | null;
  extras?: Array<{ quantidade: number; extra: { precoUnitario: number; subcategoria: string | null } }>;
}) {
  return {
    numCriancas: overrides.numCriancas,
    estado: "CONCLUIDA",
    pago: true,
    pagamentos: overrides.pagamentos,
    caucao: overrides.caucao ?? "NAO_PAGA",
    valorCaucao: overrides.valorCaucao ?? null,
    custoExcesso: overrides.custoExcesso ?? null,
    pagoExcesso: overrides.pagoExcesso ?? false,
    meiasQuantidade: overrides.meiasQuantidade ?? null,
    meiasPrecoUnit: overrides.meiasPrecoUnit ?? null,
    menu: overrides.menu ?? null,
    extras: overrides.extras ?? [],
  };
}

function entradaFixture(overrides: {
  duracaoMinutos: number;
  custoTotal: number;
  custoTotalFinal: number;
  pagamentos: PagamentoFixture[];
  criancas?: Array<{ nome?: string }>;
  meiasQuantidade?: number | null;
  meiasPrecoUnit?: number | null;
  extras?: Array<{ quantidade: number; extra: { precoUnitario: number; subcategoria?: string } }>;
}) {
  return {
    duracaoMinutos: overrides.duracaoMinutos,
    custoTotal: overrides.custoTotal,
    custoTotalFinal: overrides.custoTotalFinal,
    pagamentos: overrides.pagamentos,
    pago: true,
    criancas: overrides.criancas ?? [{}],
    meiasQuantidade: overrides.meiasQuantidade ?? null,
    meiasPrecoUnit: overrides.meiasPrecoUnit ?? null,
    extras: overrides.extras ?? [],
  };
}

describe("Relatório - Cálculos puros (sem BD)", () => {
  // ── calcularFestas ───────────────────────────────────────────
  describe("calcularFestas()", () => {
    it("soma CARTÃO e OUTRO (não se perdem)", () => {
      const festas = relatorioService.calcularFestas([
        reservaFixture({
          numCriancas: 10,
          pagamentos: [{ valor: 100, metodo: "CARTAO" }],
          menu: { nome: "Menu Base" },
        }),
        reservaFixture({
          numCriancas: 8,
          pagamentos: [{ valor: 50, metodo: "OUTRO" }],
          menu: { nome: "Menu Base" },
        }),
      ]);

      const total = festas.total;
      expect(total.valorCartao).toBe(100);
      expect(total.valorOutro).toBe(50);
      // O total de todas as colunas deve bater com a receita real
      expect(somaValores(total)).toBe(150);
    });

    it("soma pagamentos por método (ledger, N métodos)", () => {
      const festas = relatorioService.calcularFestas([
        reservaFixture({
          numCriancas: 10,
          pagamentos: [
            { valor: 60, metodo: "DINHEIRO" },
            { valor: 40, metodo: "MBWAY" },
          ],
          menu: { nome: "Menu Único" },
        }),
      ]);

      expect(festas.total.valorNumerario).toBe(60);
      expect(festas.total.valorMbway).toBe(40);
      expect(somaValores(festas.total)).toBe(100);
    });

    it("agrupa por nome do menu", () => {
      const festas = relatorioService.calcularFestas([
        reservaFixture({
          numCriancas: 10,
          pagamentos: [{ valor: 10, metodo: "DINHEIRO" }],
          menu: { nome: "Menu A" },
        }),
        reservaFixture({
          numCriancas: 5,
          pagamentos: [{ valor: 20, metodo: "DINHEIRO" }],
          menu: { nome: "Menu B" },
        }),
      ]);

      expect(festas.linhas).toHaveLength(2);
    });
  });

  // ── calcularEntradasLivres ───────────────────────────────────
  describe("calcularEntradasLivres()", () => {
    it("usa custoTotalFinal (inclui excesso) em vez de custoTotal", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        entradaFixture({
          duracaoMinutos: 90,
          custoTotal: 10,
          custoTotalFinal: 15, // +5 de excesso
          pagamentos: [{ valor: 15, metodo: "MULTIBANCO" }],
          criancas: [{ nome: "A" }],
        }),
      ]);

      // Deve usar 15 (custoTotalFinal), não 10
      expect(entradas.total.valorMultibanco).toBe(15);
    });

    it("reparte o split por método (ledger, sem dupla contagem)", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        entradaFixture({
          duracaoMinutos: 60,
          custoTotal: 20,
          custoTotalFinal: 20,
          pagamentos: [
            { valor: 12, metodo: "DINHEIRO" },
            { valor: 8, metodo: "MBWAY" },
          ],
        }),
      ]);

      // Total 20: 8 em MBWAY e apenas 12 em DINHEIRO (não 20 + 8)
      expect(entradas.total.valorMbway).toBe(8);
      expect(entradas.total.valorNumerario).toBe(12);
      expect(somaValores(entradas.total)).toBe(20);
    });

    it("lista extras como linhas informativas (não somam ao total)", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        entradaFixture({
          duracaoMinutos: 60,
          custoTotal: 20,
          custoTotalFinal: 20,
          pagamentos: [{ valor: 20, metodo: "DINHEIRO" }],
          extras: [{ quantidade: 2, extra: { precoUnitario: 5, subcategoria: "Lanches" } }], // 10€ já no custoTotal
        }),
      ]);

      // O custoTotal (20) não inclui os extras por duplicado
      expect(somaValores(entradas.total)).toBe(20);
      // Extras aparecem como informativos
      const info = entradas.linhasInformativas ?? [];
      expect(info).toHaveLength(1);
      expect(info[0]!.descricao).toBe("Lanches e Extras");
      expect(info[0]!.quantidade).toBe(2);
      expect(info[0]!.valorNumerario).toBe(10);
    });

    it("classifica por duração (1H / 2H / 3H)", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        entradaFixture({ duracaoMinutos: 60, custoTotal: 6, custoTotalFinal: 6, pagamentos: [{ valor: 6, metodo: "DINHEIRO" }] }),
        entradaFixture({ duracaoMinutos: 120, custoTotal: 10, custoTotalFinal: 10, pagamentos: [{ valor: 10, metodo: "DINHEIRO" }] }),
        entradaFixture({ duracaoMinutos: 180, custoTotal: 15, custoTotalFinal: 15, pagamentos: [{ valor: 15, metodo: "DINHEIRO" }] }),
      ]);

      expect(entradas.linhas.map((l) => l.descricao)).toEqual(
        expect.arrayContaining(["Entrada 1H", "Entrada 2H", "Entrada 3H"]),
      );
      expect(entradas.linhas).toHaveLength(3);
    });
  });

  // ── calcularOutros ───────────────────────────────────────────
  describe("calcularOutros()", () => {
    it("lista meias (reservas + entradas) como informativas - não somam ao total", () => {
      const outros = relatorioService.calcularOutros(
        [
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            meiasQuantidade: 10,
            meiasPrecoUnit: 2, // 20€
          }),
        ],
        [
          entradaFixture({
            duracaoMinutos: 60,
            custoTotal: 6,
            custoTotalFinal: 6,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            meiasQuantidade: 5,
            meiasPrecoUnit: 2, // 10€
          }),
        ],
      );

      // Meias saíram das linhas reais...
      expect(outros.linhas.find((l) => l.descricao === "Meias")).toBeUndefined();
      // ...e estão nas informativas
      const linhaMeias = outros.linhasInformativas?.find((l) => l.descricao === "Meias");
      expect(linhaMeias).toBeDefined();
      expect(linhaMeias!.quantidade).toBe(15); // 10 + 5
      expect(linhaMeias!.valorNumerario).toBe(30); // 20 + 10
      // Não somam ao total da secção
      expect(somaValores(outros.total)).toBe(0);
    });

    it("contabiliza excesso de tempo das festas (só se pago)", () => {
      const outros = relatorioService.calcularOutros(
        [
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            custoExcesso: 5,
            pagoExcesso: true, // 5€ pago
          }),
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            custoExcesso: 5,
            pagoExcesso: false, // NÃO pago → não conta
          }),
        ],
        [],
      );

      const linhaExcesso = outros.linhas.find((l) => l.descricao === "Excesso de Tempo");
      expect(linhaExcesso).toBeDefined();
      expect(linhaExcesso!.valorNumerario).toBe(5); // só 1 dos 2
      expect(linhaExcesso!.quantidade).toBe(1);
    });

    it("contabiliza cauções (40€ vs outros valores)", () => {
      const outros = relatorioService.calcularOutros(
        [
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            caucao: "PAGA",
            valorCaucao: 40,
          }),
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "DINHEIRO" }],
            caucao: "PAGA_NO_DIA",
            valorCaucao: 50,
          }),
        ],
        [],
      );

      const l40 = outros.linhas.find((l) => l.descricao === "Cauções 40€");
      const lOutros = outros.linhas.find((l) => l.descricao === "Cauções outros valores");
      expect(l40!.valorNumerario).toBe(40);
      expect(lOutros!.valorNumerario).toBe(50);
    });

    it("total da secção soma só cauções e excesso (brindes ficam informativos)", () => {
      const outros = relatorioService.calcularOutros(
        [
          reservaFixture({
            numCriancas: 10,
            pagamentos: [{ valor: 1, metodo: "CARTAO" }],
            caucao: "PAGA",
            valorCaucao: 40,
            custoExcesso: 5,
            pagoExcesso: true,
            meiasQuantidade: 4,
            meiasPrecoUnit: 2, // 8€
            extras: [
              { quantidade: 2, extra: { precoUnitario: 5, subcategoria: "Brindes" as string | null } }, // 10€
            ],
          }),
        ],
        [],
      );

      // CARTÃO: 40 (caução) + 5 (excesso) = 45. Meias (8) e brindes (10) são informativas.
      expect(outros.total.valorCartao).toBe(45);
      expect(somaValores(outros.total)).toBe(45);

      const brindes = outros.linhasInformativas?.find((l) => l.descricao === "Brindes");
      expect(brindes).toBeDefined();
      expect(brindes!.valorCartao).toBe(10);
      const meias = outros.linhasInformativas?.find((l) => l.descricao === "Meias");
      expect(meias).toBeDefined();
      expect(meias!.valorCartao).toBe(8);
    });
  });
});
