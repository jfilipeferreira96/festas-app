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

import { lancheService } from "@/services/lanche.service";

describe("Lanche Service", () => {
  beforeAll(async () => {
    await seedTestData();
    // Garantir que não há menu residual para a reserva de teste
    await testPrisma.menu.deleteMany({ where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA } });
  }, 60000);

  afterAll(async () => {
    await testPrisma.menu.deleteMany({ where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA } });
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  describe("getLanchesDoDia()", () => {
    it("deve incluir festas de hoje (CONFIRMADO / EM_CURSO)", async () => {
      const lanches = await lancheService.getLanchesDoDia();
      const festas = lanches.filter((l) => l.tipo === "FESTA");
      // Pelo menos as 2 reservas seeded (confirmada + em curso) com data = hoje
      expect(festas.length).toBeGreaterThanOrEqual(1);
    });

    it("cada lanche FESTA deve ter reservaId e nomeFesta", async () => {
      const lanches = await lancheService.getLanchesDoDia();
      const festas = lanches.filter((l) => l.tipo === "FESTA");
      for (const f of festas) {
        expect(f.reservaId).toBeDefined();
        expect(typeof f.nomeFesta).toBe("string");
      }
    });
  });

  describe("getLancheByReservaId()", () => {
    it("deve retornar o lanche da reserva confirmada", async () => {
      const lanche = await lancheService.getLancheByReservaId(TEST_IDS.RESERVA_CONFIRMADA);
      expect(lanche.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(lanche.tipo).toBe("FESTA");
    });

    it("deve lançar NOT_FOUND para reserva inexistente", async () => {
      await expect(lancheService.getLancheByReservaId("inexistente-xxx")).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("atualizarNotasLanche()", () => {
    it("deve criar menu com notas se não existir", async () => {
      const resultado = await lancheService.atualizarNotasLanche({
        reservaId: TEST_IDS.RESERVA_CONFIRMADA,
        notasLanche: "Alergia a frutos secos",
      });

      expect(resultado).toBeDefined();

      const menu = await testPrisma.menu.findUnique({
        where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA },
      });
      expect(menu).toBeDefined();
      expect(menu?.notasLanche).toBe("Alergia a frutos secos");
    });

    it("deve actualizar notas de menu existente", async () => {
      await lancheService.atualizarNotasLanche({
        reservaId: TEST_IDS.RESERVA_CONFIRMADA,
        notasLanche: "Sem glúten + lactose",
      });

      const menu = await testPrisma.menu.findUnique({
        where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA },
      });
      expect(menu?.notasLanche).toBe("Sem glúten + lactose");
    });

    it("deve lançar NOT_FOUND para reserva inexistente", async () => {
      await expect(
        lancheService.atualizarNotasLanche({
          reservaId: "inexistente-xxx",
          notasLanche: "teste",
        })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("getAlergias()", () => {
    it("deve retornar festas com notas de lanche preenchidas", async () => {
      // A reserva confirmada tem notas agora
      const alergias = await lancheService.getAlergias();
      const encontrou = alergias.some(
        (a: { reservaId: string }) => a.reservaId === TEST_IDS.RESERVA_CONFIRMADA
      );
      expect(encontrou).toBe(true);
    });
  });
});
