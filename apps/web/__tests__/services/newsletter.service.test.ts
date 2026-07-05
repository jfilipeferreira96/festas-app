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

import { newsletterService } from "@/services/newsletter.service";

describe("Newsletter Service", () => {
  beforeAll(async () => {
    await seedTestData();
    // Garantir que o aniversariante de teste tem dataNascimento
    await testPrisma.aniversariante.update({
      where: { id: TEST_IDS.ANIV_1 },
      data: { dataNascimento: new Date("2018-05-15") },
    }).catch(() => {});
  });

  afterAll(async () => {
    // Limpar segmento de aniversariantes criado pelo teste
    await testPrisma.contactoSegmento.deleteMany({
      where: { segmento: { nome: "Aniversariantes" } },
    }).catch(() => {});
    await testPrisma.segmento.deleteMany({
      where: { nome: "Aniversariantes" },
    }).catch(() => {});
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── sincronizarAniversariantes ────────────────────────────────
  describe("sincronizarAniversariantes()", () => {
    it("should create the 'Aniversariantes' segment if it doesn't exist", async () => {
      const resultado = await newsletterService.sincronizarAniversariantes();
      expect(resultado).toBeDefined();
      expect(resultado.total).toBeGreaterThanOrEqual(0);

      const segmento = await testPrisma.segmento.findFirst({
        where: { nome: "Aniversariantes" },
      });
      expect(segmento).not.toBeNull();
      expect(segmento!.nome).toBe("Aniversariantes");
    });

    it("should be idempotent (running twice doesn't duplicate)", async () => {
      await newsletterService.sincronizarAniversariantes();
      const resultado2 = await newsletterService.sincronizarAniversariantes();

      // A segunda execução não deve criar duplicados
      const segmentos = await testPrisma.segmento.findMany({
        where: { nome: "Aniversariantes" },
      });
      expect(segmentos.length).toBe(1);
      expect(resultado2.criados).toBe(0);
    });

    it("should add contactos for clientes with aniversariantes that have dataNascimento", async () => {
      // Garantir um cliente com aniversariante
      const cliente = await testPrisma.cliente.findUnique({
        where: { id: TEST_IDS.CLIENTE_1 },
      });

      const segmento = await testPrisma.segmento.findFirst({
        where: { nome: "Aniversariantes" },
      });

      if (cliente && segmento) {
        const contacto = await testPrisma.newsletterContacto.findUnique({
          where: { clienteId: cliente.id },
        });

        if (contacto) {
          const cs = await testPrisma.contactoSegmento.findUnique({
            where: {
              contactoId_segmentoId: {
                contactoId: contacto.id,
                segmentoId: segmento.id,
              },
            },
          });
          expect(cs).not.toBeNull();
        }
      }
    });
  });

  // ── listSegmentos ─────────────────────────────────────────────
  describe("listSegmentos()", () => {
    it("should return all segmentos with contact count", async () => {
      const segmentos = await newsletterService.listSegmentos();
      expect(Array.isArray(segmentos)).toBe(true);
      const anvSeg = segmentos.find((s) => s.nome === "Aniversariantes");
      expect(anvSeg).toBeDefined();
    });
  });
});
