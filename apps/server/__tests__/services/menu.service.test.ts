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

import { menuService } from "@/services/menu.service";

describe("Menu Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── getByReservaId ────────────────────────────────────────────
  describe("getByReservaId()", () => {
    it("should throw NOT_FOUND if no menu for reserva", async () => {
      await expect(
        menuService.getByReservaId(TEST_IDS.RESERVA_PENDENTE)
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should return menu when it exists", async () => {
      // Create a menu first
      const created = await menuService.create({
        reservaId: TEST_IDS.RESERVA_PENDENTE,
        nome: "Menu de Teste",
        preco: 25.5,
        notas: "Sem alergias",
      });

      const menu = await menuService.getByReservaId(TEST_IDS.RESERVA_PENDENTE);

      expect(menu).toBeDefined();
      expect(menu.id).toBe(created.id);
      expect(menu.reservaId).toBe(TEST_IDS.RESERVA_PENDENTE);
      expect(menu.nome).toBe("Menu de Teste");
      expect(menu.preco).toBeDefined();
      expect(menu.notas).toBe("Sem alergias");

      // Cleanup
      await testPrisma.menu.delete({ where: { id: menu.id } });
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should throw RESERVA_NOT_FOUND for non-existent reserva", async () => {
      await expect(
        menuService.create({
          reservaId: "non-existent",
          nome: "Menu Teste",
          preco: 10,
        })
      ).rejects.toThrow("RESERVA_NOT_FOUND");
    });

    it("should throw RESERVA_IN_PROGRESS for EM_CURSO reserva", async () => {
      await expect(
        menuService.create({
          reservaId: TEST_IDS.RESERVA_EM_CURSO,
          nome: "Menu Teste",
          preco: 10,
        })
      ).rejects.toThrow("RESERVA_IN_PROGRESS");
    });

    it("should create a menu with nome, preco and notas", async () => {
      const menu = await menuService.create({
        reservaId: TEST_IDS.RESERVA_PENDENTE,
        nome: "Menu Bolo e Pipocas",
        preco: 35.0,
        notas: "Sem alergias conhecidas",
      });

      expect(menu).toBeDefined();
      expect(menu.reservaId).toBe(TEST_IDS.RESERVA_PENDENTE);
      expect(menu.nome).toBe("Menu Bolo e Pipocas");
      expect(menu.notas).toBe("Sem alergias conhecidas");

      // Cleanup
      await testPrisma.menu.delete({ where: { id: menu.id } });
    });

    it("should throw ALREADY_EXISTS if menu already exists for reserva", async () => {
      const menu = await menuService.create({
        reservaId: TEST_IDS.RESERVA_PENDENTE,
        nome: "Menu Existente",
        preco: 20.0,
      });

      await expect(
        menuService.create({
          reservaId: TEST_IDS.RESERVA_PENDENTE,
          nome: "Outro Menu",
          preco: 30.0,
        })
      ).rejects.toThrow("ALREADY_EXISTS");

      // Cleanup
      await testPrisma.menu.delete({ where: { id: menu.id } });
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should throw NOT_FOUND if no menu exists for reserva", async () => {
      await expect(
        menuService.update(TEST_IDS.RESERVA_CONFIRMADA, { nome: "Novo Nome" })
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should update existing menu fields", async () => {
      // Create initial menu
      const created = await menuService.create({
        reservaId: TEST_IDS.RESERVA_PENDENTE,
        nome: "Menu Inicial",
        preco: 20.0,
        notas: "Notas iniciais",
      });

      // Update
      const updated = await menuService.update(TEST_IDS.RESERVA_PENDENTE, {
        nome: "Menu Atualizado",
        preco: 45.0,
        notas: "Notas atualizadas",
      });

      expect(updated.nome).toBe("Menu Atualizado");
      expect(updated.notas).toBe("Notas atualizadas");
      expect(updated.id).toBe(created.id);

      // Cleanup
      await testPrisma.menu.delete({ where: { id: updated.id } });
    });

    it("should throw RESERVA_IN_PROGRESS when updating menu of EM_CURSO reserva", async () => {
      // Create menu for em_curso reserva directly in DB (bypass service check)
      await testPrisma.menu.create({
        data: {
          reservaId: TEST_IDS.RESERVA_EM_CURSO,
          nome: "Menu Em Curso",
          preco: 30.0,
        },
      });

      await expect(
        menuService.update(TEST_IDS.RESERVA_EM_CURSO, { nome: "Atualizado" })
      ).rejects.toThrow("RESERVA_IN_PROGRESS");

      // Cleanup
      await testPrisma.menu.delete({ where: { reservaId: TEST_IDS.RESERVA_EM_CURSO } });
    });
  });

  // ── createOrUpdateForReserva ──────────────────────────────────
  describe("createOrUpdateForReserva()", () => {
    it("should create a new menu when none exists", async () => {
      const result = await menuService.createOrUpdateForReserva(TEST_IDS.RESERVA_PENDENTE, {
        nome: "Menu Novo",
        preco: 25.0,
        notas: "Menu criado via upsert",
      });

      expect(result).toBeDefined();
      expect(result!.nome).toBe("Menu Novo");
      expect(result!.preco).toBeDefined();
      expect(result!.notas).toBe("Menu criado via upsert");

      // Cleanup
      await testPrisma.menu.delete({ where: { id: result!.id } });
    });

    it("should update existing menu when one exists", async () => {
      // Create initial
      const initial = await menuService.createOrUpdateForReserva(TEST_IDS.RESERVA_PENDENTE, {
        nome: "Menu Inicial",
        preco: 20.0,
      });

      expect(initial).toBeDefined();

      // Update with new values
      const updated = await menuService.createOrUpdateForReserva(TEST_IDS.RESERVA_PENDENTE, {
        nome: "Menu Atualizado",
        preco: 40.0,
        notas: "Atualizado",
      });

      expect(updated).toBeDefined();
      expect(updated!.nome).toBe("Menu Atualizado");
      expect(updated!.notas).toBe("Atualizado");
      // Should be same menu (updated, not new)
      expect(updated!.id).toBe(initial!.id);

      // Cleanup
      await testPrisma.menu.delete({ where: { id: updated!.id } });
    });

    it("should throw RESERVA_IN_PROGRESS for EM_CURSO reserva", async () => {
      await expect(
        menuService.createOrUpdateForReserva(TEST_IDS.RESERVA_EM_CURSO, {
          nome: "Menu Qualquer",
          preco: 15.0,
        })
      ).rejects.toThrow("RESERVA_IN_PROGRESS");
    });

    it("should throw RESERVA_NOT_FOUND for non-existent reserva", async () => {
      await expect(
        menuService.createOrUpdateForReserva("non-existent", {
          nome: "Menu Qualquer",
          preco: 15.0,
        })
      ).rejects.toThrow("RESERVA_NOT_FOUND");
    });
  });
});