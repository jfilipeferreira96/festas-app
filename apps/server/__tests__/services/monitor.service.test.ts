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

import { monitorService } from "@/services/monitor.service";

describe("Monitor Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all monitores with locais", async () => {
      const monitores = await monitorService.list();
      expect(monitores.length).toBeGreaterThanOrEqual(2);
      const firstMonitor = monitores[0];
      expect(firstMonitor?.locais).toBeDefined();
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return a monitor with locais", async () => {
      const monitor = await monitorService.getById(TEST_IDS.MONITOR_1);
      expect(monitor).toBeDefined();
      expect(monitor.id).toBe(TEST_IDS.MONITOR_1);
      expect(monitor.nome).toBe("Monitor Teste 1");
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(monitorService.getById("non-existent")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new monitor", async () => {
      const monitor = await monitorService.create({
        nome: "Monitor Novo Teste",
        contacto: "955555555",
      });
      expect(monitor).toBeDefined();
      expect(monitor.nome).toBe("Monitor Novo Teste");
      expect(monitor.activo).toBe(true);

      // Cleanup
      await testPrisma.monitor.delete({ where: { id: monitor.id } });
    });

    it("should create a monitor with locais", async () => {
      const monitor = await monitorService.create({
        nome: "Monitor Com Local",
        contacto: "954444444",
        locaisIds: [TEST_IDS.LOCAL_1],
      });
      expect(monitor.locais.length).toBe(1);

      // Cleanup
      await testPrisma.monitorLocal.deleteMany({ where: { monitorId: monitor.id } });
      await testPrisma.monitor.delete({ where: { id: monitor.id } });
    });

    it("should throw NOME_REQUIRED if nome is empty", async () => {
      await expect(
        monitorService.create({ nome: "", contacto: "912345678" })
      ).rejects.toThrow("NOME_REQUIRED");
    });

    it("should throw CONTACTO_REQUIRED if contacto is empty", async () => {
      await expect(
        monitorService.create({ nome: "Teste", contacto: "" })
      ).rejects.toThrow("CONTACTO_REQUIRED");
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should update a monitor's nome", async () => {
      const updated = await monitorService.update(TEST_IDS.MONITOR_1, {
        nome: "Monitor Actualizado",
      });
      expect(updated.nome).toBe("Monitor Actualizado");

      // Restore
      await monitorService.update(TEST_IDS.MONITOR_1, { nome: "Monitor Teste 1" });
    });

    it("should update monitor's locais", async () => {
      const updated = await monitorService.update(TEST_IDS.MONITOR_1, {
        locaisIds: [TEST_IDS.LOCAL_2],
      });
      expect(updated.locais.length).toBe(1);
      expect(updated.locais[0]?.localId).toBe(TEST_IDS.LOCAL_2);

      // Restore
      await monitorService.update(TEST_IDS.MONITOR_1, { locaisIds: [] });
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(
        monitorService.update("non-existent", { nome: "X" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── delete ────────────────────────────────────────────────────
  describe("delete()", () => {
    it("should delete a monitor and its associations", async () => {
      const monitor = await monitorService.create({
        nome: "Para Apagar",
        contacto: "933333333",
        locaisIds: [TEST_IDS.LOCAL_1],
      });

      await monitorService.delete(monitor.id);

      const found = await testPrisma.monitor.findUnique({ where: { id: monitor.id } });
      expect(found).toBeNull();
    });
  });

  // ── listActive ────────────────────────────────────────────────
  describe("listActive()", () => {
    it("should return only active monitores", async () => {
      const active = await monitorService.listActive();
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.every((m: { activo: boolean }) => m.activo)).toBe(true);
    });
  });
});
