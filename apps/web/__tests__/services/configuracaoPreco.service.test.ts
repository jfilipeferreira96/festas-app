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
      expect(Number(config.precoFestaSemana)).toBe(150);
      expect(Number(config.precoFestaFimSemana)).toBe(200);
      expect(Number(config.precoEntradaHoraSemana)).toBe(10);
      expect(Number(config.precoEntradaHoraFimSemana)).toBe(12);
      expect(Number(config.precoExcessoFixo)).toBe(5);
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
        precoFestaSemana: 180,
        precoFestaFimSemana: 250,
      });
      expect(Number(updated.precoFestaSemana)).toBe(180);
      expect(Number(updated.precoFestaFimSemana)).toBe(250);
      // Campos não atualizados mantêm-se
      expect(Number(updated.precoEntradaHoraSemana)).toBe(10);
    });

    it("should create config if none exists", async () => {
      await testPrisma.configuracaoPreco.deleteMany({});
      const created = await configuracaoPrecoService.updateConfig({
        precoFestaSemana: 160,
        precoFestaFimSemana: 220,
        precoEntradaHoraSemana: 11,
        precoEntradaHoraFimSemana: 14,
      });
      expect(created).toBeDefined();
      expect(Number(created.precoFestaSemana)).toBe(160);
      expect(Number(created.precoFestaFimSemana)).toBe(220);
      expect(Number(created.precoEntradaHoraSemana)).toBe(11);
      expect(Number(created.precoEntradaHoraFimSemana)).toBe(14);
    });

    it("should update partial fields without affecting others", async () => {
      await configuracaoPrecoService.updateConfig({
        precoEntradaHoraSemana: 9,
      });
      const config = await configuracaoPrecoService.getConfig();
      expect(Number(config.precoEntradaHoraSemana)).toBe(9);
      expect(Number(config.precoFestaSemana)).toBe(160);
    });

    it("should update precoExcessoFixo", async () => {
      const updated = await configuracaoPrecoService.updateConfig({
        precoExcessoFixo: 7.5,
      });
      expect(Number(updated.precoExcessoFixo)).toBe(7.5);
    });
  });

  // ── calcularPrecoFesta ────────────────────────────────────────
  describe("calcularPrecoFesta()", () => {
    beforeAll(async () => {
      await configuracaoPrecoService.updateConfig({
        precoFestaSemana: 150,
        precoFestaFimSemana: 200,
      });
    });

    it("should return weekday price for a Wednesday", async () => {
      // 2025-01-15 é uma quarta-feira
      const quarta = new Date("2025-01-15T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoFesta(quarta);
      expect(preco).toBe(150);
    });

    it("should return weekend price for a Saturday", async () => {
      // 2025-01-18 é um sábado
      const sabado = new Date("2025-01-18T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoFesta(sabado);
      expect(preco).toBe(200);
    });

    it("should return weekend price for a Sunday", async () => {
      // 2025-01-19 é um domingo
      const domingo = new Date("2025-01-19T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoFesta(domingo);
      expect(preco).toBe(200);
    });

    it("should return weekday price for a Monday", async () => {
      // 2025-01-13 é uma segunda-feira
      const segunda = new Date("2025-01-13T00:00:00");
      const preco = await configuracaoPrecoService.calcularPrecoFesta(segunda);
      expect(preco).toBe(150);
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
