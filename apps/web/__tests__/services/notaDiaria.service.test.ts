import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";

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

import { notaDiariaService } from "@/services/notaDiaria.service";

const HOJE = new Date();

describe("Nota Diária Service", () => {
  beforeAll(async () => {
    // Garantir tabela limpa para a data de hoje
    await testPrisma.notaDiaria.deleteMany({
      where: { data: { equals: HOJE } },
    }).catch(() => undefined);
  }, 60000);

  afterAll(async () => {
    await testPrisma.notaDiaria.deleteMany({
      where: { data: { equals: HOJE } },
    }).catch(() => undefined);
    await testPrisma.$disconnect();
  });

  describe("getByData()", () => {
    it("deve retornar null quando não existe nota para a data", async () => {
      const nota = await notaDiariaService.getByData(new Date("2099-01-01"));
      expect(nota).toBeNull();
    });
  });

  describe("upsert()", () => {
    it("deve criar uma nova nota diária (manhã + tarde)", async () => {
      const nota = await notaDiariaService.upsert({
        data: HOJE.toISOString(),
        notasManha: "Lembrar festa das 10h",
        notasTarde: "Verificar cacifos",
      });

      expect(nota.id).toBeDefined();
      expect(nota.notasManha).toBe("Lembrar festa das 10h");
      expect(nota.notasTarde).toBe("Verificar cacifos");
    });

    it("deve actualizar uma nota existente (mesma data)", async () => {
      const nota = await notaDiariaService.upsert({
        data: HOJE.toISOString(),
        notasManha: "Manhã actualizada",
      });

      expect(nota.notasManha).toBe("Manhã actualizada");
      // A nota da tarde deve permanecer (criada no teste anterior)
      expect(nota.notasTarde).toBe("Verificar cacifos");
    });

    it("deve persistir via getByData() após upsert", async () => {
      const nota = await notaDiariaService.getByData(HOJE);
      expect(nota).not.toBeNull();
      expect(nota?.notasManha).toBe("Manhã actualizada");
    });
  });
});
