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

import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";

describe("ConfiguracaoPreco Service", () => {
  beforeAll(async () => {
    await seedTestData();
    // Limpa qualquer config existente para testar criação automática
    await testPrisma.configuracaoPreco.deleteMany({});
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── getConfig ─────────────────────────────────────────────────
  describe("getConfig()", () => {
    it("should auto-create config with defaults if none exists", async () => {
      const config = await configuracaoPrecoService.getConfig();
      expect(config).toBeDefined();
      expect(Number(config.precoCriancaSemana)).toBe(15);
      expect(Number(config.precoCriancaFimSemana)).toBe(20);
      expect(Number(config.precoEntradaHoraSemana)).toBe(10);
      expect(Number(config.precoEntradaHoraFimSemana)).toBe(12);
      expect(Number(config.precoExcessoFixo)).toBe(5);
      expect(Number(config.caucaoDefault)).toBe(40);
    });

    it("should return existing config on second call (singleton)", async () => {
      const config1 = await configuracaoPrecoService.getConfig();
      const config2 = await configuracaoPrecoService.getConfig();
      expect(config1.id).toBe(config2.id);
    });
  });

  // ── updateConfig ──────────────────────────────────────────────
  describe("updateConfig()", () => {
    it("should update existing config", async () => {
      const updated = await configuracaoPrecoService.updateConfig({
        precoCriancaSemana: 18,
        precoCriancaFimSemana: 25,
      });
      expect(Number(updated.precoCriancaSemana)).toBe(18);
      expect(Number(updated.precoCriancaFimSemana)).toBe(25);
      // Campos não atualizados mantêm-se
      expect(Number(updated.precoEntradaHoraSemana)).toBe(10);
    });

    it("should create config if none exists", async () => {
      await testPrisma.configuracaoPreco.deleteMany({});
      const created = await configuracaoPrecoService.updateConfig({
        precoCriancaSemana: 16,
        precoCriancaFimSemana: 22,
        precoEntradaHoraSemana: 11,
        precoEntradaHoraFimSemana: 14,
      });
      expect(created).toBeDefined();
      expect(Number(created.precoCriancaSemana)).toBe(16);
      expect(Number(created.precoCriancaFimSemana)).toBe(22);
      expect(Number(created.precoEntradaHoraSemana)).toBe(11);
      expect(Number(created.precoEntradaHoraFimSemana)).toBe(14);
    });

    it("should update partial fields without affecting others", async () => {
      await configuracaoPrecoService.updateConfig({
        precoEntradaHoraSemana: 9,
      });
      const config = await configuracaoPrecoService.getConfig();
      expect(Number(config.precoEntradaHoraSemana)).toBe(9);
      expect(Number(config.precoCriancaSemana)).toBe(16);
    });

    it("should update precoExcessoFixo", async () => {
      const updated = await configuracaoPrecoService.updateConfig({
        precoExcessoFixo: 7.5,
      });
      expect(Number(updated.precoExcessoFixo)).toBe(7.5);
    });

    it("should update caucaoDefault", async () => {
      const updated = await configuracaoPrecoService.updateConfig({
        caucaoDefault: 50,
      });
      expect(Number(updated.caucaoDefault)).toBe(50);
    });

    it("should allow caucaoDefault of 0 (sem caução obrigatória)", async () => {
      const updated = await configuracaoPrecoService.updateConfig({
        caucaoDefault: 0,
      });
      expect(Number(updated.caucaoDefault)).toBe(0);
    });
  });

  // ── calcularPrecoFesta ────────────────────────────────────────
  describe("calcularPrecoFesta()", () => {
    beforeAll(async () => {
      await configuracaoPrecoService.updateConfig({
        precoCriancaSemana: 15,
        precoCriancaFimSemana: 20,
        precoMeias: 2,
      });
    });

    it("should use weekday per-child price for a Wednesday", async () => {
      // 2025-01-15 é uma quarta-feira
      const quarta = new Date("2025-01-15T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(quarta, 12, 1);
      // precoCrianca = 15 (semana), minimo = 10, criancasFaturadas = 12
      expect(result.precoCrianca).toBe(15);
      expect(result.minimoCriancas).toBe(10);
      expect(result.criancasFaturadas).toBe(12);
      expect(result.total).toBe(180);
    });

    it("should use weekend per-child price for a Saturday", async () => {
      // 2025-01-18 é um sábado
      const sabado = new Date("2025-01-18T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(sabado, 12, 1);
      // precoCrianca = 20 (fim-semana), criancasFaturadas = 12
      expect(result.precoCrianca).toBe(20);
      expect(result.total).toBe(240);
    });

    it("should use weekend per-child price for a Sunday", async () => {
      // 2025-01-19 é um domingo
      const domingo = new Date("2025-01-19T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(domingo, 5, 1);
      expect(result.precoCrianca).toBe(20);
    });

    it("should use weekday per-child price for a Monday", async () => {
      // 2025-01-13 é uma segunda-feira
      const segunda = new Date("2025-01-13T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(segunda, 5, 1);
      expect(result.precoCrianca).toBe(15);
    });

    it("should bill the minimum children when below minimum (1 aniversariante → min 10)", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(quarta, 5, 1);
      // precoCrianca = 15, minimo = 10, criancasFaturadas = 10
      expect(result.criancasFaturadas).toBe(10);
      expect(result.total).toBe(150);
    });

    it("should use higher minimum for 2 aniversariantes (min 15)", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(quarta, 8, 2);
      expect(result.minimoCriancas).toBe(15);
      expect(result.criancasFaturadas).toBe(15);
      expect(result.total).toBe(225);
    });

    it("should use higher minimum for 3+ aniversariantes (min 20)", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const result = await configuracaoPrecoService.calcularPrecoFesta(quarta, 8, 3);
      expect(result.minimoCriancas).toBe(20);
      expect(result.criancasFaturadas).toBe(20);
      expect(result.total).toBe(300);
    });
  });

  // ── getPrecoCrianca / getMinimoCriancas ───────────────────────
  describe("getPrecoCrianca() & getMinimoCriancas()", () => {
    it("should return weekday per-child price for a Wednesday", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const preco = await configuracaoPrecoService.getPrecoCrianca(quarta);
      expect(preco).toBe(15);
    });

    it("should return weekend per-child price for a Saturday", async () => {
      const sabado = new Date("2025-01-18T00:00:00");
      const preco = await configuracaoPrecoService.getPrecoCrianca(sabado);
      expect(preco).toBe(20);
    });

    it("should return correct minimums for aniversariantes counts", async () => {
      expect(await configuracaoPrecoService.getMinimoCriancas(1)).toBe(10);
      expect(await configuracaoPrecoService.getMinimoCriancas(2)).toBe(15);
      expect(await configuracaoPrecoService.getMinimoCriancas(3)).toBe(20);
      expect(await configuracaoPrecoService.getMinimoCriancas(5)).toBe(20);
    });
  });

  // ── calcularCustoMeias ────────────────────────────────────────
  describe("calcularCustoMeias()", () => {
    it("should calculate cost for a given quantity", async () => {
      const custo = await configuracaoPrecoService.calcularCustoMeias(5);
      expect(custo).toBe(10);
    });

    it("should return 0 for 0 meias", async () => {
      const custo = await configuracaoPrecoService.calcularCustoMeias(0);
      expect(custo).toBe(0);
    });
  });

  // ── calcularPrecoEntrada ──────────────────────────────────────
  describe("calcularPrecoEntrada()", () => {
    beforeAll(async () => {
      await configuracaoPrecoService.updateConfig({
        precoEntradaHoraSemana: 10,
        precoEntradaHoraFimSemana: 12,
      });
    });

    it("should calculate weekday price for 60 minutes on a Wednesday", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoEntrada(60, quarta);
      // 10€/h * 1h = 10€
      expect(preco).toBe(10);
    });

    it("should calculate weekend price for 60 minutes on a Saturday", async () => {
      const sabado = new Date("2025-01-18T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoEntrada(60, sabado);
      // 12€/h * 1h = 12€
      expect(preco).toBe(12);
    });

    it("should calculate proportional price for 90 minutes", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoEntrada(90, quarta);
      // 10€/h * 1.5h = 15€
      expect(preco).toBe(15);
    });

    it("should calculate proportional price for 30 minutes on weekend", async () => {
      const sabado = new Date("2025-01-18T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoEntrada(30, sabado);
      // 12€/h * 0.5h = 6€
      expect(preco).toBe(6);
    });

    it("should return 0 for 0 minutes", async () => {
      const quarta = new Date("2025-01-15T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoEntrada(0, quarta);
      expect(preco).toBe(0);
    });
  });

  // ── getPrecoExcesso ───────────────────────────────────────────
  describe("getPrecoExcesso()", () => {
    it("should return the configured fixed excesso price", async () => {
      // precoExcessoFixo was set to 7.5 in the updateConfig test
      const preco = await configuracaoPrecoService.getPrecoExcesso();
      expect(preco).toBe(7.5);
    });

    it("should return the default (5) when config is freshly created", async () => {
      await testPrisma.configuracaoPreco.deleteMany({});
      const preco = await configuracaoPrecoService.getPrecoExcesso();
      expect(preco).toBe(5);
    });
  });
});
