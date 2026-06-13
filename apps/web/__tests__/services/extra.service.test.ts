import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

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

import { extraService } from "@/services/extra.service";

describe("Extra Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all extras with locais", async () => {
      const extras = await extraService.list();
      expect(extras.length).toBeGreaterThanOrEqual(2);
      expect(extras[0]!.locais).toBeDefined();
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return an extra with locais", async () => {
      const extra = await extraService.getById(TEST_IDS.EXTRA_1);
      expect(extra).toBeDefined();
      expect(extra.id).toBe(TEST_IDS.EXTRA_1);
      expect(extra.nome).toBe("Turbo Slide Teste");
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(extraService.getById("non-existent")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new extra", async () => {
      const extra = await extraService.create({
        nome: "Extra Teste Novo",
        precoUnitario: 15.0,
        descricao: "Descrição do extra teste",
      });
      expect(extra).toBeDefined();
      expect(extra.nome).toBe("Extra Teste Novo");
      expect(extra.precoUnitario).toBeCloseTo(15.0, 2);

      // Cleanup
      await testPrisma.extra.delete({ where: { id: extra.id } });
    });

    it("should create an extra with locais", async () => {
      const extra = await extraService.create({
        nome: "Extra Com Local",
        precoUnitario: 20.0,
        locaisIds: [TEST_IDS.LOCAL_1],
      });
      expect(extra.locais.length).toBe(1);

      // Cleanup
      await testPrisma.extraLocal.deleteMany({ where: { extraId: extra.id } });
      await testPrisma.extra.delete({ where: { id: extra.id } });
    });

    it("should throw NOME_REQUIRED if nome is empty", async () => {
      await expect(
        extraService.create({ nome: "", precoUnitario: 10 })
      ).rejects.toThrow("NOME_REQUIRED");
    });

    it("should throw PRICE_REQUIRED if price is negative", async () => {
      await expect(
        extraService.create({ nome: "Teste", precoUnitario: -1 })
      ).rejects.toThrow("PRICE_REQUIRED");
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should update an extra's name", async () => {
      const updated = await extraService.update(TEST_IDS.EXTRA_1, {
        nome: "Turbo Slide Actualizado",
      });
      expect(updated.nome).toBe("Turbo Slide Actualizado");

      // Restore
      await extraService.update(TEST_IDS.EXTRA_1, { nome: "Turbo Slide Teste" });
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(
        extraService.update("non-existent", { nome: "X" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── delete ────────────────────────────────────────────────────
  describe("delete()", () => {
    it("should delete an extra and its local associations", async () => {
      const extra = await extraService.create({
        nome: "Para Apagar",
        precoUnitario: 5.0,
        locaisIds: [TEST_IDS.LOCAL_1],
      });

      await extraService.delete(extra.id);

      const found = await testPrisma.extra.findUnique({ where: { id: extra.id } });
      expect(found).toBeNull();
    });
  });
});
