import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

// Mock @prisma/db-client to use test Prisma client
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

import { localService } from "@/services/local.service";

describe("Local Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all locais", async () => {
      const locais = await localService.list();
      expect(locais.length).toBeGreaterThanOrEqual(2);
      expect(locais.some((l) => l.id === TEST_IDS.LOCAL_1)).toBe(true);
      expect(locais.some((l) => l.id === TEST_IDS.LOCAL_2)).toBe(true);
    });

    it("should return locais ordered by nome", async () => {
      const locais = await localService.list();
      for (let i = 1; i < locais.length; i++) {
        expect(locais[i]!.nome.localeCompare(locais[i - 1]!.nome)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return a local by ID", async () => {
      const local = await localService.getById(TEST_IDS.LOCAL_1);
      expect(local).toBeDefined();
      expect(local.id).toBe(TEST_IDS.LOCAL_1);
      expect(local.nome).toBe("Sala Teste Azul");
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(localService.getById("non-existent-id")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new local", async () => {
      const local = await localService.create({
        nome: "Sala Teste Nova",
      });
      expect(local).toBeDefined();
      expect(local.nome).toBe("Sala Teste Nova");
      expect(local.activo).toBe(true);

      // Cleanup
      await testPrisma.local.delete({ where: { id: local.id } });
    });

    it("should create a local with INACTIVO status", async () => {
      const local = await localService.create({
        nome: "Sala Inactiva Teste",
        activo: false,
      });
      expect(local.activo).toBe(false);

      // Cleanup
      await testPrisma.local.delete({ where: { id: local.id } });
    });

    it("should throw NAME_REQUIRED if nome is empty", async () => {
      await expect(
        localService.create({ nome: "" })
      ).rejects.toThrow("NAME_REQUIRED");
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should update a local's nome", async () => {
      const updated = await localService.update(TEST_IDS.LOCAL_1, {
        nome: "Sala Azul Actualizada",
      });
      expect(updated.nome).toBe("Sala Azul Actualizada");

      // Restore
      await localService.update(TEST_IDS.LOCAL_1, { nome: "Sala Teste Azul" });
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(
        localService.update("non-existent-id", { nome: "X" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── delete (soft delete) ──────────────────────────────────────
  describe("delete()", () => {
    it("should soft delete a local without active reservas", async () => {
      // Create a local with no reservas
      const local = await testPrisma.local.create({
        data: { id: "test-local-delete", nome: "Para Apagar" },
      });

      const deleted = await localService.delete(local.id);
      expect(deleted.activo).toBe(false);
    });

    it("should throw HAS_ACTIVE_RESERVAS if local has active reservas", async () => {
      // LOCAL_2 has RESERVA_EM_CURSO which is active
      await expect(localService.delete(TEST_IDS.LOCAL_2)).rejects.toThrow(
        "HAS_ACTIVE_RESERVAS"
      );
    });
  });

  // ── listActive ────────────────────────────────────────────────
  describe("listActive()", () => {
    it("should return only active locais", async () => {
      const active = await localService.listActive();
      expect(active.every((l) => l.activo === true)).toBe(true);
    });
  });
});
