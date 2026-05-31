import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { cleanTestData } from "../helpers/seed";

// Mock @festas/db to use test Prisma client
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

import { permissoesService, MODULOS, NIVEIS_ACESSO } from "@/services/permissoes.service";

describe("Permissões Service", () => {
  beforeAll(async () => {
    // Clean permissions table to start fresh
    await testPrisma.funcaoPermissao.deleteMany();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  describe("seedDefaults()", () => {
    it("should seed all 24 permissions (4 roles × 6 modules)", async () => {
      const results = await permissoesService.seedDefaults();

      expect(results).toHaveLength(24);
    });

    it("should create ADMINISTRADOR with administracao on all modules", async () => {
      const adminPerms = await testPrisma.funcaoPermissao.findMany({
        where: { funcao: "ADMINISTRADOR" },
      });

      expect(adminPerms).toHaveLength(6);
      for (const p of adminPerms) {
        expect(p.nivelAcesso).toBe("administracao");
      }
    });

    it("should create RECECAO with sem_acesso on relatorios, divulgacoes, configuracoes", async () => {
      const rececaoPerms = await testPrisma.funcaoPermissao.findMany({
        where: { funcao: "RECECAO" },
      });

      expect(rececaoPerms).toHaveLength(6);

      const semAcesso = rececaoPerms.filter((p) => p.nivelAcesso === "sem_acesso");
      const semAcessoModulos = semAcesso.map((p) => p.modulo);
      expect(semAcessoModulos).toContain("relatorios");
      expect(semAcessoModulos).toContain("divulgacoes");
      expect(semAcessoModulos).toContain("configuracoes");
    });

    it("should be idempotent (upsert behavior)", async () => {
      await permissoesService.seedDefaults();
      await permissoesService.seedDefaults();

      const count = await testPrisma.funcaoPermissao.count();
      expect(count).toBe(24);
    });
  });

  describe("list()", () => {
    it("should return all permissions", async () => {
      const permissoes = await permissoesService.list();

      expect(permissoes).toHaveLength(24);
      expect(permissoes[0]).toHaveProperty("funcao");
      expect(permissoes[0]).toHaveProperty("modulo");
      expect(permissoes[0]).toHaveProperty("nivelAcesso");
    });

    it("should auto-seed if table is empty", async () => {
      await testPrisma.funcaoPermissao.deleteMany();

      const permissoes = await permissoesService.list();
      expect(permissoes).toHaveLength(24);
    });
  });

  describe("getByFuncao()", () => {
    it("should return permissions for a specific role", async () => {
      const perms = await permissoesService.getByFuncao("GESTOR");

      expect(perms).toHaveLength(6);
      for (const p of perms) {
        expect(p.funcao).toBe("GESTOR");
      }
    });

    it("should return empty array for a role with no custom permissions", async () => {
      await testPrisma.funcaoPermissao.deleteMany();

      const perms = await permissoesService.getByFuncao("MARKETING");
      expect(perms).toHaveLength(0);
    });
  });

  describe("update()", () => {
    it("should throw ADMIN_IMMUTABLE when trying to update ADMINISTRADOR", async () => {
      await expect(
        permissoesService.update({
          funcao: "ADMINISTRADOR",
          modulo: "reservas",
          nivelAcesso: "leitura",
        })
      ).rejects.toThrow("ADMIN_IMMUTABLE");
    });

    it("should create a new permission via upsert for non-admin role", async () => {
      await testPrisma.funcaoPermissao.deleteMany();

      const result = await permissoesService.update({
        funcao: "GESTOR",
        modulo: "reservas",
        nivelAcesso: "escrita",
      });

      expect(result.funcao).toBe("GESTOR");
      expect(result.modulo).toBe("reservas");
      expect(result.nivelAcesso).toBe("escrita");
    });

    it("should update an existing permission for non-admin role", async () => {
      await permissoesService.seedDefaults();

      const result = await permissoesService.update({
        funcao: "RECECAO",
        modulo: "relatorios",
        nivelAcesso: "leitura",
      });

      expect(result.nivelAcesso).toBe("leitura");
    });

    it("should throw INVALID_MODULO for invalid module", async () => {
      await expect(
        permissoesService.update({
          funcao: "GESTOR",
          modulo: "invalid_module" as typeof MODULOS[number],
          nivelAcesso: "leitura",
        })
      ).rejects.toThrow("INVALID_MODULO");
    });

    it("should throw INVALID_NIVEL for invalid level", async () => {
      await expect(
        permissoesService.update({
          funcao: "GESTOR",
          modulo: "reservas",
          nivelAcesso: "super_admin" as typeof NIVEIS_ACESSO[number],
        })
      ).rejects.toThrow("INVALID_NIVEL");
    });
  });

  describe("bulkUpdate()", () => {
    it("should update multiple permissions in a transaction", async () => {
      await testPrisma.funcaoPermissao.deleteMany();

      const updates = [
        { funcao: "ADMINISTRADOR" as const, modulo: "reservas" as const, nivelAcesso: "administracao" as const },
        { funcao: "ADMINISTRADOR" as const, modulo: "cacifos" as const, nivelAcesso: "administracao" as const },
        { funcao: "GESTOR" as const, modulo: "reservas" as const, nivelAcesso: "escrita" as const },
      ];

      const results = await permissoesService.bulkUpdate(updates);
      expect(results).toHaveLength(3);
    });
  });

  describe("hasAccess()", () => {
    beforeAll(async () => {
      await testPrisma.funcaoPermissao.deleteMany();
      await permissoesService.seedDefaults();
    });

    it("should return true when user has sufficient access", async () => {
      const hasAccess = await permissoesService.hasAccess("ADMINISTRADOR", "reservas", "leitura");
      expect(hasAccess).toBe(true);
    });

    it("should return true when user has exact access level", async () => {
      const hasAccess = await permissoesService.hasAccess("GESTOR", "reservas", "escrita");
      expect(hasAccess).toBe(true);
    });

    it("should return true when user has higher access level", async () => {
      const hasAccess = await permissoesService.hasAccess("ADMINISTRADOR", "reservas", "escrita");
      expect(hasAccess).toBe(true);
    });

    it("should return false when user has insufficient access", async () => {
      const hasAccess = await permissoesService.hasAccess("GESTOR", "reservas", "administracao");
      expect(hasAccess).toBe(false);
    });

    it("should return false when user has sem_acesso", async () => {
      const hasAccess = await permissoesService.hasAccess("RECECAO", "relatorios", "leitura");
      expect(hasAccess).toBe(false);
    });

    it("should return false when no permission exists", async () => {
      const hasAccess = await permissoesService.hasAccess("MARKETING", "nonexistent" as typeof MODULOS[number], "leitura");
      expect(hasAccess).toBe(false);
    });

    it("should default to checking leitura access", async () => {
      const hasAccess = await permissoesService.hasAccess("RECECAO", "reservas");
      expect(hasAccess).toBe(true);
    });
  });
});