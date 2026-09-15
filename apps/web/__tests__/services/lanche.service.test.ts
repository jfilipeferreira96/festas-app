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
    it("NÃO deve incluir festas sem menu/lanche associado", async () => {
      const lanches = await lancheService.getLanchesDoDia();
      const festas = lanches.filter((l) => l.tipo === "FESTA");
      // Reservas seeded (hoje, CONFIRMADO/EM_CURSO) não têm menu → fora da página lanche
      expect(festas.some((f) => f.reservaId === TEST_IDS.RESERVA_CONFIRMADA)).toBe(false);
      expect(festas.some((f) => f.reservaId === TEST_IDS.RESERVA_EM_CURSO)).toBe(false);
    });

    it("NÃO deve incluir entradas livres com temLanche = false", async () => {
      const lanches = await lancheService.getLanchesDoDia();
      const entradas = lanches.filter((l) => l.tipo === "ENTRADA_LIVRE");
      expect(entradas.some((e) => e.entradaLivreId === TEST_IDS.ENTRADA_LIVRE_1)).toBe(false);
    });

    it("deve incluir festas de hoje com menu e entradas ATIVA com temLanche", async () => {
      await testPrisma.menu.create({
        data: { reservaId: TEST_IDS.RESERVA_CONFIRMADA, nome: "Menu Teste", preco: 3.5 },
      });
      await testPrisma.entradaLivre.update({
        where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
        data: { temLanche: true },
      });

      try {
        const lanches = await lancheService.getLanchesDoDia();
        const festas = lanches.filter((l) => l.tipo === "FESTA");
        const entradas = lanches.filter((l) => l.tipo === "ENTRADA_LIVRE");

        expect(festas.some((f) => f.reservaId === TEST_IDS.RESERVA_CONFIRMADA)).toBe(true);
        // EM_CURSO continua sem menu → continua fora
        expect(festas.some((f) => f.reservaId === TEST_IDS.RESERVA_EM_CURSO)).toBe(false);
        expect(entradas.some((e) => e.entradaLivreId === TEST_IDS.ENTRADA_LIVRE_1)).toBe(true);

        for (const f of festas) {
          expect(f.reservaId).toBeDefined();
          expect(typeof f.nomeFesta).toBe("string");
        }
      } finally {
        await testPrisma.menu.deleteMany({ where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA } });
        await testPrisma.entradaLivre.update({
          where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
          data: { temLanche: false },
        });
      }
    });

    it("extrasLancheNomes só inclui extras com subcategoria de lanche (Lanche e Extras ao lanche)", async () => {
      // Extra com subcategoria "Extras ao lanche" (valor usado no seed dev/prod)
      const extraAoLanche = await testPrisma.extra.create({
        data: {
          id: "test-extra-ao-lanche-temp",
          nome: "Sumo Extra Teste",
          precoUnitario: 2.5,
          categoria: "EXTRA",
          subcategoria: "Extras ao lanche",
        },
      });
      // Ligar os dois extras de lanche à reserva confirmada
      await testPrisma.reservaExtra.create({
        data: {
          id: "test-reserva-extra-lanche-temp",
          reservaId: TEST_IDS.RESERVA_CONFIRMADA,
          extraId: TEST_IDS.EXTRA_LANCHE_1,
          quantidade: 1,
        },
      });
      await testPrisma.reservaExtra.create({
        data: {
          id: "test-reserva-extra-ao-lanche-temp",
          reservaId: TEST_IDS.RESERVA_CONFIRMADA,
          extraId: extraAoLanche.id,
          quantidade: 1,
        },
      });

      try {
        const lanche = await lancheService.getLancheByReservaId(TEST_IDS.RESERVA_CONFIRMADA);

        // EXTRA_1 (Turbo Slide, sem subcategoria) está na reserva mas NÃO é de lanche
        expect(lanche.extrasNomes).toContain("Turbo Slide Teste");
        expect(lanche.extrasLancheNomes).not.toContain("Turbo Slide Teste");

        // Extras de lanche aparecem nas duas variantes de subcategoria
        expect(lanche.extrasLancheNomes).toContain("Bolo de Aniversário"); // subcategoria "Lanche"
        expect(lanche.extrasLancheNomes).toContain("Sumo Extra Teste"); // subcategoria "Extras ao lanche"
      } finally {
        await testPrisma.reservaExtra.deleteMany({
          where: { id: { in: ["test-reserva-extra-lanche-temp", "test-reserva-extra-ao-lanche-temp"] } },
        });
        await testPrisma.extra.delete({ where: { id: extraAoLanche.id } });
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

  describe("atualizarEstadoLanche()", () => {
    it("deve actualizar o estadoLanche da reserva", async () => {
      await lancheService.atualizarEstadoLanche(TEST_IDS.RESERVA_CONFIRMADA, "A_DECORRER");

      const reserva = await testPrisma.reserva.findUnique({
        where: { id: TEST_IDS.RESERVA_CONFIRMADA },
        select: { estadoLanche: true },
      });
      expect(reserva?.estadoLanche).toBe("A_DECORRER");
    });

    it("deve lançar NOT_FOUND para reserva inexistente", async () => {
      await expect(
        lancheService.atualizarEstadoLanche("inexistente-xxx", "TERMINADO")
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("atualizarEstadoLancheEntrada()", () => {
    it("deve actualizar o estadoLanche da entrada livre para TERMINADO", async () => {
      await lancheService.atualizarEstadoLancheEntrada(TEST_IDS.ENTRADA_LIVRE_1, "TERMINADO");

      const entrada = await testPrisma.entradaLivre.findUnique({
        where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
        select: { estadoLanche: true },
      });
      expect(entrada?.estadoLanche).toBe("TERMINADO");

      // Reset para não contaminar outros testes
      await lancheService.atualizarEstadoLancheEntrada(TEST_IDS.ENTRADA_LIVRE_1, "NAO_INICIADO");
    });

    it("deve lançar NOT_FOUND para entrada inexistente", async () => {
      await expect(
        lancheService.atualizarEstadoLancheEntrada("inexistente-xxx", "TERMINADO")
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});
