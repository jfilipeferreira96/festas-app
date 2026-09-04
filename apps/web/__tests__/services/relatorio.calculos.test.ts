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
    it("contabiliza meias (reservas + entradas) numa linha própria", () => {
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

      const linhaMeias = outros.linhas.find((l) => l.descricao === "Meias");
      expect(linhaMeias).toBeDefined();
      expect(linhaMeias!.quantidade).toBe(15); // 10 + 5
      expect(linhaMeias!.valorNumerario).toBe(30); // 20 + 10
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

    it("total da secção = soma de todas as colunas de todas as linhas", () => {
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

      // CARTÃO: 40 (caução) + 5 (excesso) + 8 (meias) + 10 (brindes) = 63
      expect(outros.total.valorCartao).toBe(63);
      expect(somaValores(outros.total)).toBe(63);
    });
  });
});
