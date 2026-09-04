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

// Helpers para construir registos de teste de forma concisa
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

describe("Relatório - Cálculos puros (sem BD)", () => {
  // ── calcularFestas ───────────────────────────────────────────
  describe("calcularFestas()", () => {
    it("soma CARTÃO e OUTRO (não se perdem)", () => {
      const festas = relatorioService.calcularFestas([
        {
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "CARTAO",
          valorPago: 100,
          metodoPagamento2: null,
          valorPago2: null,
          caucao: "NAO_PAGA",
          valorCaucao: null,
          custoExcesso: null,
          pagoExcesso: false,
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          menu: { nome: "Menu Base" },
          extras: [],
        },
        {
          numCriancas: 8,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "OUTRO",
          valorPago: 50,
          metodoPagamento2: null,
          valorPago2: null,
          caucao: "NAO_PAGA",
          valorCaucao: null,
          custoExcesso: null,
          pagoExcesso: false,
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          menu: { nome: "Menu Base" },
          extras: [],
        },
      ]);

      const total = festas.total;
      expect(total.valorCartao).toBe(100);
      expect(total.valorOutro).toBe(50);
      // O total de todas as colunas deve bater com a receita real
      expect(somaValores(total)).toBe(150);
    });

    it("soma pagamento dividido (método 1 + método 2)", () => {
      const festas = relatorioService.calcularFestas([
        {
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          valorPago: 60,
          metodoPagamento2: "MBWAY",
          valorPago2: 40,
          caucao: "NAO_PAGA",
          valorCaucao: null,
          custoExcesso: null,
          pagoExcesso: false,
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          menu: { nome: "Menu Único" },
          extras: [],
        },
      ]);

      expect(festas.total.valorNumerario).toBe(60);
      expect(festas.total.valorMbway).toBe(40);
      expect(somaValores(festas.total)).toBe(100);
    });

    it("agrupa por nome do menu", () => {
      const festas = relatorioService.calcularFestas([
        {
          numCriancas: 10, estado: "CONCLUIDA", pago: true,
          metodoPagamento: "DINHEIRO", valorPago: 10,
          metodoPagamento2: null, valorPago2: null,
          caucao: "NAO_PAGA", valorCaucao: null,
          custoExcesso: null, pagoExcesso: false,
          meiasQuantidade: null, meiasPrecoUnit: null,
          menu: { nome: "Menu A" }, extras: [],
        },
        {
          numCriancas: 5, estado: "CONCLUIDA", pago: true,
          metodoPagamento: "DINHEIRO", valorPago: 20,
          metodoPagamento2: null, valorPago2: null,
          caucao: "NAO_PAGA", valorCaucao: null,
          custoExcesso: null, pagoExcesso: false,
          meiasQuantidade: null, meiasPrecoUnit: null,
          menu: { nome: "Menu B" }, extras: [],
        },
      ]);

      expect(festas.linhas).toHaveLength(2);
    });
  });

  // ── calcularEntradasLivres ───────────────────────────────────
  describe("calcularEntradasLivres()", () => {
    it("usa custoTotalFinal (inclui excesso) em vez de custoTotal", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        {
          duracaoMinutos: 90,
          custoTotal: 10,
          custoTotalFinal: 15, // +5 de excesso
          metodoPagamento: "MULTIBANCO",
          metodoPagamento2: null,
          valorPago2: null,
          pago: true,
          criancas: [{ nome: "A" }],
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          extras: [],
        },
      ]);

      // Deve usar 15 (custoTotalFinal), não 10
      expect(entradas.total.valorMultibanco).toBe(15);
    });

    it("reparte o split sem dupla contagem (método 2 = valorPago2, método 1 = resto)", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        {
          duracaoMinutos: 60,
          custoTotal: 20,
          custoTotalFinal: 20,
          metodoPagamento: "DINHEIRO",
          metodoPagamento2: "MBWAY",
          valorPago2: 8,
          pago: true,
          criancas: [{ nome: "A" }],
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          extras: [],
        },
      ]);

      // Total 20: 8 no método 2 e apenas 12 no método 1 (não 20 + 8)
      expect(entradas.total.valorMbway).toBe(8);
      expect(entradas.total.valorNumerario).toBe(12);
      expect(somaValores(entradas.total)).toBe(20);
    });

    it("lista extras como linhas informativas (não somam ao total)", () => {
      const entradas = relatorioService.calcularEntradasLivres([
        {
          duracaoMinutos: 60,
          custoTotal: 20,
          custoTotalFinal: 20,
          metodoPagamento: "DINHEIRO",
          metodoPagamento2: null,
          valorPago2: null,
          pago: true,
          criancas: [{ nome: "A" }],
          meiasQuantidade: null,
          meiasPrecoUnit: null,
          extras: [{ quantidade: 2, extra: { precoUnitario: 5 } }], // 10€ já no custoTotal
        },
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
        {
          duracaoMinutos: 60, custoTotal: 6, custoTotalFinal: 6,
          metodoPagamento: "DINHEIRO", metodoPagamento2: null, valorPago2: null,
          pago: true, criancas: [{}], meiasQuantidade: null, meiasPrecoUnit: null, extras: [],
        },
        {
          duracaoMinutos: 120, custoTotal: 10, custoTotalFinal: 10,
          metodoPagamento: "DINHEIRO", metodoPagamento2: null, valorPago2: null,
          pago: true, criancas: [{}], meiasQuantidade: null, meiasPrecoUnit: null, extras: [],
        },
        {
          duracaoMinutos: 180, custoTotal: 15, custoTotalFinal: 15,
          metodoPagamento: "DINHEIRO", metodoPagamento2: null, valorPago2: null,
          pago: true, criancas: [{}], meiasQuantidade: null, meiasPrecoUnit: null, extras: [],
        },
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
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "DINHEIRO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "NAO_PAGA", valorCaucao: null,
            custoExcesso: null, pagoExcesso: false,
            meiasQuantidade: 10, meiasPrecoUnit: 2, // 20€
            menu: null,
            extras: [],
          },
        ],
        [
          {
            duracaoMinutos: 60, custoTotal: 6, custoTotalFinal: 6,
            metodoPagamento: "DINHEIRO", metodoPagamento2: null, valorPago2: null,
            pago: true, criancas: [{}],
            meiasQuantidade: 5, meiasPrecoUnit: 2, // 10€
            extras: [],
          },
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
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "DINHEIRO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "NAO_PAGA", valorCaucao: null,
            custoExcesso: 5, pagoExcesso: true, // 5€ pago
            meiasQuantidade: null, meiasPrecoUnit: null,
            menu: null,
            extras: [],
          },
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "DINHEIRO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "NAO_PAGA", valorCaucao: null,
            custoExcesso: 5, pagoExcesso: false, // NÃO pago → não conta
            meiasQuantidade: null, meiasPrecoUnit: null,
            menu: null,
            extras: [],
          },
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
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "DINHEIRO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "PAGA", valorCaucao: 40,
            custoExcesso: null, pagoExcesso: false,
            meiasQuantidade: null, meiasPrecoUnit: null,
            menu: null, extras: [],
          },
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "DINHEIRO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "PAGA_NO_DIA", valorCaucao: 50,
            custoExcesso: null, pagoExcesso: false,
            meiasQuantidade: null, meiasPrecoUnit: null,
            menu: null, extras: [],
          },
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
          {
            numCriancas: 10, estado: "CONCLUIDA", pago: true,
            metodoPagamento: "CARTAO", valorPago: 0, metodoPagamento2: null, valorPago2: null,
            caucao: "PAGA", valorCaucao: 40,
            custoExcesso: 5, pagoExcesso: true,
            meiasQuantidade: 4, meiasPrecoUnit: 2, // 8€
            menu: null,
            extras: [
              { quantidade: 2, extra: { precoUnitario: 5, subcategoria: "Brindes" } }, // 10€
            ],
          },
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
