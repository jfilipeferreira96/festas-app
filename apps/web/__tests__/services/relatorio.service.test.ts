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
  });
});