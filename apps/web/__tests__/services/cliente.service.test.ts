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

import { clienteService } from "@/services/cliente.service";

describe("Cliente Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all clientes with aniversariantes", async () => {
      const result = await clienteService.list();
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items[0]!.aniversariantes).toBeDefined();
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return a cliente with aniversariantes and reservas", async () => {
      const cliente = await clienteService.getById(TEST_IDS.CLIENTE_1);
      expect(cliente).toBeDefined();
      expect(cliente.id).toBe(TEST_IDS.CLIENTE_1);
      expect(cliente.aniversariantes).toBeDefined();
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(clienteService.getById("non-existent")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new cliente", async () => {
      const cliente = await clienteService.create({
        nome: "Novo Cliente Teste",
        telefone: "966666666",
        email: "novo@email.pt",
      });
      expect(cliente).toBeDefined();
      expect(cliente.nome).toBe("Novo Cliente Teste");

      await testPrisma.cliente.delete({ where: { id: cliente.id } });
    });

    it("should throw NOME_REQUIRED if nome is empty", async () => {
      await expect(
        clienteService.create({ nome: "", telefone: "912345678", email: "a@b.pt" })
      ).rejects.toThrow("NOME_REQUIRED");
    });

    it("should throw TELEFONE_REQUIRED if telefone is empty", async () => {
      await expect(
        clienteService.create({ nome: "Teste", telefone: "", email: "a@b.pt" })
      ).rejects.toThrow("TELEFONE_REQUIRED");
    });

    it("should throw EMAIL_REQUIRED if email is empty", async () => {
      await expect(
        clienteService.create({ nome: "Teste", telefone: "912345678", email: "" })
      ).rejects.toThrow("EMAIL_REQUIRED");
    });

    it("should throw EMAIL_ALREADY_EXISTS for duplicate email", async () => {
      await expect(
        clienteService.create({
          nome: "Duplicado",
          telefone: "977777777",
          email: "teste1@email.pt",
        })
      ).rejects.toThrow("EMAIL_ALREADY_EXISTS");
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should update a cliente's nome", async () => {
      const updated = await clienteService.update(TEST_IDS.CLIENTE_1, {
        nome: "Cliente Actualizado",
      });
      expect(updated.nome).toBe("Cliente Actualizado");

      await clienteService.update(TEST_IDS.CLIENTE_1, { nome: "Cliente Teste 1" });
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(
        clienteService.update("non-existent", { nome: "X" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── search ────────────────────────────────────────────────────
  describe("search()", () => {
    it("should find clientes by name", async () => {
      const results = await clienteService.search("Cliente Teste");
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty for no matches", async () => {
      const results = await clienteService.search("zzznonexistentzzz");
      expect(results.length).toBe(0);
    });
  });

  // ── delete ────────────────────────────────────────────────────
  describe("delete()", () => {
    it("should delete a cliente", async () => {
      const cliente = await clienteService.create({
        nome: "Para Apagar",
        telefone: "988888888",
        email: "apagar@email.pt",
      });

      await clienteService.delete(cliente.id);

      const found = await testPrisma.cliente.findUnique({ where: { id: cliente.id } });
      expect(found).toBeNull();
    });
  });
});