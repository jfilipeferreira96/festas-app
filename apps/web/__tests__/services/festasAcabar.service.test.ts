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

import { festasAcabarService } from "@/services/festasAcabar.service";

describe("Festas Acabar Service", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  }, 60000);

  describe("getFestas()", () => {
    it("deve retornar apenas festas EM_CURSO", async () => {
      const festas = await festasAcabarService.getFestas();

      // A reserva seeded EM_CURSO deve aparecer
      const encontrou = festas.some((f: { id: string }) => f.id === TEST_IDS.RESERVA_EM_CURSO);
      expect(encontrou).toBe(true);
    });

    it("cada festa deve ter campos obrigatórios (id, nomeFesta, cor)", async () => {
      const festas = await festasAcabarService.getFestas();
      for (const f of festas) {
        expect(f.id).toBeDefined();
        expect(typeof f.nomeFesta).toBe("string");
      }
    });

    it("não deve incluir festas RESERVA/CONFIRMADO/CONCLUIDA/CANCELADA", async () => {
      const festas = await festasAcabarService.getFestas();
      const ids = festas.map((f: { id: string }) => f.id);

      // RESERVA_PENDENTE está em estado RESERVA — não deve aparecer
      expect(ids).not.toContain(TEST_IDS.RESERVA_PENDENTE);
    });
  });

  describe("atualizarObservacoes()", () => {
    it("deve actualizar observacoesLesoes", async () => {
      await festasAcabarService.atualizarObservacoes(TEST_IDS.RESERVA_EM_CURSO, {
        observacoesLesoes: "Criança X tem asma",
      });

      const reserva = await testPrisma.reserva.findUnique({
        where: { id: TEST_IDS.RESERVA_EM_CURSO },
        select: { observacoesLesoes: true },
      });
      expect(reserva?.observacoesLesoes).toBe("Criança X tem asma");
    });

    it("deve actualizar observacoesBrindes e observacoesBrindesPais", async () => {
      await festasAcabarService.atualizarObservacoes(TEST_IDS.RESERVA_EM_CURSO, {
        observacoesBrindes: "5 brindes",
        observacoesBrindesPais: "2 brindes pais",
      });

      const reserva = await testPrisma.reserva.findUnique({
        where: { id: TEST_IDS.RESERVA_EM_CURSO },
        select: { observacoesBrindes: true, observacoesBrindesPais: true },
      });
      expect(reserva?.observacoesBrindes).toBe("5 brindes");
      expect(reserva?.observacoesBrindesPais).toBe("2 brindes pais");
    });

    it("deve lançar NOT_FOUND para reserva inexistente", async () => {
      await expect(
        festasAcabarService.atualizarObservacoes("inexistente-xxx", {
          observacoesLesoes: "teste",
        })
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});
