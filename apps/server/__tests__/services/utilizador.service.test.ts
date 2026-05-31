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

import { utilizadorService } from "@/services/utilizador.service";

describe("Utilizador Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  describe("list()", () => {
    it("should return all utilizadores", async () => {
      const utilizadores = await utilizadorService.list();
      expect(utilizadores).toBeInstanceOf(Array);
      expect(utilizadores.length).toBeGreaterThan(0);
      expect(utilizadores[0]).toHaveProperty("id");
      expect(utilizadores[0]).toHaveProperty("email");
      expect(utilizadores[0]).toHaveProperty("name");
      expect(utilizadores[0]).toHaveProperty("funcao");
    });

    it("should return utilizadores ordered by name", async () => {
      const utilizadores = await utilizadorService.list();
      for (let i = 1; i < utilizadores.length; i++) {
        expect(utilizadores[i]!.name.localeCompare(utilizadores[i - 1]!.name)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("create()", () => {
    it("should create a new utilizador", async () => {
      const email = `test-${Date.now()}@test.com`;
      const utilizador = await utilizadorService.create({
        name: "Test User",
        email,
        password: "testPassword123",
        funcao: "RECECAO",
      });

      expect(utilizador).toBeDefined();
      expect(utilizador.name).toBe("Test User");
      expect(utilizador.email).toBe(email);
      expect(utilizador.funcao).toBe("RECECAO");
      expect(utilizador.activo).toBe(true);
      expect(utilizador).not.toHaveProperty("password");

      await testPrisma.user.delete({ where: { id: utilizador.id } });
    });

    it("should throw NAME_REQUIRED if name is empty", async () => {
      await expect(
        utilizadorService.create({
          name: "",
          email: `test-${Date.now()}@test.com`,
          password: "testPassword123",
          funcao: "RECECAO",
        })
      ).rejects.toThrow("NAME_REQUIRED");
    });

    it("should throw EMAIL_REQUIRED if email is empty", async () => {
      await expect(
        utilizadorService.create({
          name: "Test User",
          email: "",
          password: "testPassword123",
          funcao: "RECECAO",
        })
      ).rejects.toThrow("EMAIL_REQUIRED");
    });

    it("should throw if role is invalid", async () => {
      await expect(
        utilizadorService.create({
          name: "Test User",
          email: `test-${Date.now()}@test.com`,
          password: "testPassword123",
          funcao: "INVALID_ROLE" as unknown as never,
        })
      ).rejects.toThrow();
    });
  });

  describe("updateFuncao()", () => {
    it("should update user role", async () => {
      const updated = await utilizadorService.updateFuncao(
        TEST_IDS.USER_RECECAO,
        { funcao: "GESTOR" },
        TEST_IDS.USER_ADMIN,
      );

      expect(updated.funcao).toBe("GESTOR");

      // Restore
      await utilizadorService.updateFuncao(TEST_IDS.USER_RECECAO, { funcao: "RECECAO" }, TEST_IDS.USER_ADMIN);
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      await expect(
        utilizadorService.updateFuncao("non-existent-id", { funcao: "GESTOR" }, "admin-id")
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw CANNOT_CHANGE_OWN_FUNCAO if user tries to update own role", async () => {
      await expect(
        utilizadorService.updateFuncao(TEST_IDS.USER_ADMIN, { funcao: "GESTOR" }, TEST_IDS.USER_ADMIN)
      ).rejects.toThrow("CANNOT_CHANGE_OWN_FUNCAO");
    });
  });

  describe("updateActivo()", () => {
    it("should deactivate a user", async () => {
      const updated = await utilizadorService.updateActivo(
        TEST_IDS.USER_RECECAO,
        { activo: false },
        TEST_IDS.USER_ADMIN,
      );

      expect(updated.activo).toBe(false);

      // Restore
      await utilizadorService.updateActivo(TEST_IDS.USER_RECECAO, { activo: true }, TEST_IDS.USER_ADMIN);
    });

    it("should activate a deactivated user", async () => {
      // First deactivate
      await utilizadorService.updateActivo(TEST_IDS.USER_RECECAO, { activo: false }, TEST_IDS.USER_ADMIN);

      const updated = await utilizadorService.updateActivo(
        TEST_IDS.USER_RECECAO,
        { activo: true },
        TEST_IDS.USER_ADMIN,
      );

      expect(updated.activo).toBe(true);
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      await expect(
        utilizadorService.updateActivo("non-existent-id", { activo: true }, "admin-id")
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw CANNOT_CHANGE_OWN_ACTIVO if user tries to update own status", async () => {
      await expect(
        utilizadorService.updateActivo(TEST_IDS.USER_ADMIN, { activo: false }, TEST_IDS.USER_ADMIN)
      ).rejects.toThrow("CANNOT_CHANGE_OWN_ACTIVO");
    });
  });

  describe("delete()", () => {
    it("should delete a user", async () => {
      const testUser = await testPrisma.user.create({
        data: {
          id: `delete-test-${Date.now()}`,
          email: `delete-test-${Date.now()}@test.com`,
          name: "Delete Test User",
          funcao: "RECECAO",
          activo: true,
          emailVerified: true,
        },
      });

      const deleted = await utilizadorService.delete(testUser.id, TEST_IDS.USER_ADMIN);
      expect(deleted.id).toBe(testUser.id);

      const found = await testPrisma.user.findUnique({ where: { id: testUser.id } });
      expect(found).toBeNull();
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      await expect(
        utilizadorService.delete("non-existent-id", "admin-id")
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should throw CANNOT_DELETE_SELF if user tries to delete self", async () => {
      await expect(
        utilizadorService.delete(TEST_IDS.USER_ADMIN, TEST_IDS.USER_ADMIN)
      ).rejects.toThrow("CANNOT_DELETE_SELF");
    });
  });
});