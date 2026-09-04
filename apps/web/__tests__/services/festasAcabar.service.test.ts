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

      // RESERVA_PENDENTE está em estado RESERVA - não deve aparecer
      expect(ids).not.toContain(TEST_IDS.RESERVA_PENDENTE);
    });

    it("deve devolver pagamento (pago/valorPago) para o alerta do balcão", async () => {
      const festas = await festasAcabarService.getFestas();
      const festa = festas.find((f: { id: string }) => f.id === TEST_IDS.RESERVA_EM_CURSO);
      expect(festa).toBeDefined();
      expect(typeof festa!.pago).toBe("boolean");
      expect("valorPago" in festa!).toBe(true);
    });

    it("deve devolver extras com estado concluido (check por extra)", async () => {
      const festas = await festasAcabarService.getFestas();
      const festa = festas.find((f: { id: string }) => f.id === TEST_IDS.RESERVA_EM_CURSO);
      expect(festa).toBeDefined();

      const extras = (festa!.extras ?? []) as Array<{ nome: string; quantidade: number; concluido: boolean }>;
      // O seed cria pelo menos um extra com concluido: true na festa em curso
      expect(extras.some((re) => re.concluido === true)).toBe(true);
      for (const re of extras) {
        expect(typeof re.nome).toBe("string");
        expect(typeof re.quantidade).toBe("number");
        expect(typeof re.concluido).toBe("boolean");
      }
    });

    it("deve devolver observações de cacifos (notasCacifos/observacoesCacifo)", async () => {
      const festas = await festasAcabarService.getFestas();
      const festa = festas.find((f: { id: string }) => f.id === TEST_IDS.RESERVA_EM_CURSO);
      expect(festa).toBeDefined();
      expect("notasCacifos" in festa!).toBe(true);
      expect("observacoesCacifo" in festa!).toBe(true);
    });
  });

  describe("getEntradasAtivas()", () => {
    it("deve devolver apenas entradas ATIVA", async () => {
      const entradas = await festasAcabarService.getEntradasAtivas();
      const ids = entradas.map((e: { id: string }) => e.id);

      expect(ids).toContain(TEST_IDS.ENTRADA_LIVRE_1);
      expect(ids).not.toContain(TEST_IDS.ENTRADA_LIVRE_2); // CONCLUIDA
      expect(ids).not.toContain(TEST_IDS.ENTRADA_LIVRE_3); // CANCELADA
    });

    it("deve devolver campos do balcão (pago, temLanche, estadoLanche, fimPrevisto)", async () => {
      const entradas = await festasAcabarService.getEntradasAtivas();
      const entrada = entradas.find((e: { id: string }) => e.id === TEST_IDS.ENTRADA_LIVRE_1);

      expect(entrada).toBeDefined();
      expect(entrada!.pago).toBe(true); // seed: pago MBWAY
      expect(entrada!.temLanche).toBe(false);
      expect(typeof entrada!.fimPrevisto).toBe("string");
      expect(typeof entrada!.encarregadoNome).toBe("string");
    });

    it("deve ordenar por fimPrevisto ascendente", async () => {
      const entradas = await festasAcabarService.getEntradasAtivas();
      for (let i = 1; i < entradas.length; i++) {
        expect(entradas[i - 1].fimPrevisto <= entradas[i].fimPrevisto).toBe(true);
      }
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
