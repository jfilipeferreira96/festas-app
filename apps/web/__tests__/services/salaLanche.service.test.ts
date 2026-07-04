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

import { salaLancheService } from "@/services/salaLanche.service";

describe("SalaLanche Service", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── CRUD ────────────────────────────────────────────────────────
  describe("create() & getById()", () => {
    it("deve criar uma sala de lanche", async () => {
      const sala = await salaLancheService.create({
        nome: "Sala Teste CRUD",
      });

      expect(sala).toBeDefined();
      expect(sala.nome).toBe("Sala Teste CRUD");
      expect(sala.activo).toBe(true);
    });

    it("deve rejeitar criação sem nome", async () => {
      await expect(
        salaLancheService.create({ nome: "" })
      ).rejects.toThrow("NAME_REQUIRED");
    });

    it("deve retornar por id via getById()", async () => {
      const lista = await salaLancheService.list();
      const sala = lista[0];
      expect(sala).toBeDefined();

      const porId = await salaLancheService.getById(sala!.id);
      expect(porId.id).toBe(sala!.id);
    });

    it("deve lançar NOT_FOUND se id inexistente", async () => {
      await expect(
        salaLancheService.getById("id-inexistente")
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("list() & listAll()", () => {
    it("list() deve retornar apenas salas activas", async () => {
      const lista = await salaLancheService.list();
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every((s: { activo: boolean }) => s.activo === true)).toBe(true);
    });

    it("listAll() deve incluir salas inactivas", async () => {
      const sala = await salaLancheService.create({
        nome: "Sala Inactiva Test",
        activo: false,
      });
      const all = await salaLancheService.listAll();
      const encontrou = all.some((s: { id: string }) => s.id === sala.id);
      expect(encontrou).toBe(true);

      // limpar
      await salaLancheService.delete(sala.id);
    });
  });

  describe("update()", () => {
    it("deve actualizar nome e activo", async () => {
      const sala = await salaLancheService.create({
        nome: "Sala Update Test",
      });

      const atualizada = await salaLancheService.update(sala.id, {
        nome: "Sala Update Test (editada)",
        activo: false,
      });

      expect(atualizada.nome).toBe("Sala Update Test (editada)");
      expect(atualizada.activo).toBe(false);

      await salaLancheService.delete(sala.id);
    });
  });

  describe("delete()", () => {
    it("deve eliminar uma sala de lanche", async () => {
      const sala = await salaLancheService.create({
        nome: "Sala Delete Test",
      });
      await salaLancheService.delete(sala.id);

      await expect(salaLancheService.getById(sala.id)).rejects.toThrow("NOT_FOUND");
    });
  });
});
