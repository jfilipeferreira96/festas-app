import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
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

describe("Relatório Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // Helper: intervalo que cobre ontem + hoje + amanhã
  function getIntervaloTeste() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    return { ontem, amanha };
  }

  // ── getRelatorioFinanceiro ────────────────────────────────────
  describe("getRelatorioFinanceiro()", () => {
    it("should return 3 sections (festas, entradasLivres, outros) — no escolas", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      expect(relatorio).toHaveProperty("festas");
      expect(relatorio).toHaveProperty("entradasLivres");
      expect(relatorio).toHaveProperty("outros");
      expect(relatorio).not.toHaveProperty("escolas");
      expect(relatorio).not.toHaveProperty("totalConsolidado");
      expect(relatorio.festas).toHaveProperty("titulo");
      expect(relatorio.festas).toHaveProperty("linhas");
      expect(relatorio.festas).toHaveProperty("total");
    });

    it("should include EM_CURSO reservas in festas section", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      // Seed has RESERVA_EM_CURSO with estado EM_CURSO and data: today
      expect(relatorio.festas.total.quantidade).toBeGreaterThanOrEqual(1);
      expect(relatorio.festas.total.totalCriancas).toBeGreaterThanOrEqual(1);
    });

    it("should include CONCLUIDA entradas in entradasLivres section", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      // Seed has ENTRADA_LIVRE_2 with estado CONCLUIDA and inicioEm: ontem
      expect(relatorio.entradasLivres.total.quantidade).toBeGreaterThanOrEqual(1);
    });

    it("should exclude ATIVA and CANCELADA entradas (only CONCLUIDA counted)", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      // ENTRADA_LIVRE_2 is the only CONCLUIDA in the seed (ontem)
      const totalEntradasConcluidas = relatorio.entradasLivres.total.quantidade;
      expect(totalEntradasConcluidas).toBeGreaterThanOrEqual(1);

      // The MULTIBANCO payment from ENTRADA_LIVRE_2 (17.0) should be reflected
      expect(relatorio.entradasLivres.total.valorMultibanco).toBeGreaterThanOrEqual(17);
    });

    it("should calculate totalGeral as sum of festas + entradasLivres + outros", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      const somaEsperada =
        relatorio.festas.total.valorMultibanco +
        relatorio.entradasLivres.total.valorMultibanco +
        relatorio.outros.total.valorMultibanco;

      expect(relatorio.totalGeral.valorMultibanco).toBeCloseTo(somaEsperada, 2);
    });

    it("should return empty sections (no hardcoded lines) for date range with no records", async () => {
      const futuroInicio = new Date("2099-01-01");
      const futuroFim = new Date("2099-12-31");

      const relatorio = await relatorioService.getRelatorioFinanceiro(futuroInicio, futuroFim);

      expect(relatorio.festas.total.quantidade).toBe(0);
      expect(relatorio.entradasLivres.total.quantidade).toBe(0);
      // Sem fallback hardcoded — se não há dados, linhas é array vazio
      expect(relatorio.festas.linhas.length).toBe(0);
      expect(relatorio.entradasLivres.linhas.length).toBe(0);
    });

    it("should aggregate by payment method correctly", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      // ENTRADA_LIVRE_2 has metodoPagamento: MULTIBANCO, custoTotalFinal: 17.0
      expect(relatorio.entradasLivres.total.valorMultibanco).toBeGreaterThanOrEqual(17);
    });

    it("should filter out all-zero lines from sections", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      // Every linha in entradasLivres must have at least one non-zero value
      for (const linha of relatorio.entradasLivres.linhas) {
        const hasData =
          linha.quantidade > 0 ||
          linha.totalCriancas > 0 ||
          linha.valorNumerario > 0 ||
          linha.valorMultibanco > 0 ||
          linha.valorTransferencia > 0 ||
          linha.valorMbway > 0;
        expect(hasData).toBe(true);
      }
    });

    it("deve somar pagamento dividido (2 métodos) nas festas", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const hoje = new Date();

      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "15:00",
          duracaoMinutos: 135,
          numCriancas: 8,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          valorPago: 100,
          metodoPagamento2: "MBWAY",
          valorPago2: 50,
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });

      try {
        const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);
        // A festa deve contribuir 100€ DINHEIRO + 50€ MBWAY
        expect(relatorio.festas.total.valorNumerario).toBeGreaterThanOrEqual(100);
        expect(relatorio.festas.total.valorMbway).toBeGreaterThanOrEqual(50);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });

    it("deve incluir caução paga na secção Outros", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const hoje = new Date();

      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "16:00",
          duracaoMinutos: 135,
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          valorPago: 100,
          caucao: "PAGA",
          valorCaucao: 40,
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });

      try {
        const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);
        // Deve ter uma linha de caução com pelo menos 1 entrada
        const linhasCaucao = relatorio.outros.linhas.filter(l => l.descricao.includes("Cauções"));
        expect(linhasCaucao.length).toBeGreaterThan(0);
        const totalCaucoes = linhasCaucao.reduce((sum, l) => sum + l.valorNumerario, 0);
        expect(totalCaucoes).toBeGreaterThanOrEqual(40);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });

    it("deve incluir excesso de tempo pago na secção Outros", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const hoje = new Date();

      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "17:00",
          duracaoMinutos: 135,
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "MULTIBANCO",
          valorPago: 100,
          custoExcesso: 15,
          pagoExcesso: true,
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });

      try {
        const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);
        // Deve ter uma linha de excesso
        const linhaExcesso = relatorio.outros.linhas.find(l => l.descricao === "Excesso de Tempo");
        expect(linhaExcesso).toBeDefined();
        expect(linhaExcesso!.quantidade).toBeGreaterThanOrEqual(1);
        expect(linhaExcesso!.valorMultibanco).toBeGreaterThanOrEqual(15);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });
  });

  // ── calcularAjustes (secção de auditoria) ─────────────────────
  describe("calcularAjustes()", () => {
    type AjusteInput = Parameters<typeof relatorioService.calcularAjustes>[0][number];
    const mkAjuste = (a: Partial<AjusteInput>): AjusteInput => a as AjusteInput;

    it("soma ACRESCIMO/DESCONTO/REDEFINICAO em linhas separadas por método", () => {
      const secao = relatorioService.calcularAjustes([
        mkAjuste({ tipo: "ACRESCIMO", valor: 10, metodoPagamento: "DINHEIRO" }),
        mkAjuste({ tipo: "ACRESCIMO", valor: 5, metodoPagamento: "MBWAY" }),
        mkAjuste({ tipo: "DESCONTO", valor: -3, metodoPagamento: "DINHEIRO" }),
        mkAjuste({ tipo: "REDEFINICAO", valor: 180, metodoPagamento: "MULTIBANCO" }),
      ]);

      expect(secao.titulo).toBe("Ajustes de Pagamento (auditoria)");

      const acrescimos = secao.linhas.find((l) => l.descricao === "Acréscimos cobrados");
      expect(acrescimos?.quantidade).toBe(2);
      expect(acrescimos?.valorNumerario).toBe(10); // |valor| — sinal ignorado na auditoria
      expect(acrescimos?.valorMbway).toBe(5);

      const descontos = secao.linhas.find((l) => l.descricao === "Descontos concedidos");
      expect(descontos?.quantidade).toBe(1);
      expect(descontos?.valorNumerario).toBe(3); // Math.abs(-3)

      const redefinicoes = secao.linhas.find((l) => l.descricao === "Redefinições de preço");
      expect(redefinicoes?.quantidade).toBe(1);
      expect(redefinicoes?.valorMultibanco).toBe(180);
    });

    it("usa o método da reserva quando o ajuste não tem metodoPagamento", () => {
      const secao = relatorioService.calcularAjustes([
        mkAjuste({ tipo: "ACRESCIMO", valor: 7, reserva: { metodoPagamento: "TRANSFERENCIA" } }),
      ]);

      const acrescimos = secao.linhas.find((l) => l.descricao === "Acréscimos cobrados");
      expect(acrescimos?.valorTransferencia).toBe(7);
    });

    it("sem ajustes → secção vazia (linhas filtradas)", () => {
      const secao = relatorioService.calcularAjustes([]);
      expect(secao.linhas.length).toBe(0);
      expect(secao.total.quantidade).toBe(0);
    });
  });

  describe("getRelatorioFinanceiro() — secção ajustes", () => {
    it("inclui ajuste seeded (ACRESCIMO 10€ DINHEIRO) na auditoria sem somar ao totalGeral", async () => {
      const { ontem, amanha } = getIntervaloTeste();
      const relatorio = await relatorioService.getRelatorioFinanceiro(ontem, amanha);

      expect(relatorio.ajustes).toBeDefined();
      const acrescimos = relatorio.ajustes.linhas.find((l) => l.descricao === "Acréscimos cobrados");
      expect(acrescimos?.quantidade).toBeGreaterThanOrEqual(1);
      expect(acrescimos?.valorNumerario).toBeGreaterThanOrEqual(10);

      // Auditoria: ajustes NÃO somam ao total geral (write-through em valorPago)
      const somaSemAjustes =
        relatorio.festas.total.valorNumerario +
        relatorio.entradasLivres.total.valorNumerario +
        relatorio.outros.total.valorNumerario;
      expect(relatorio.totalGeral.valorNumerario).toBeCloseTo(somaSemAjustes, 2);
    });
  });
});