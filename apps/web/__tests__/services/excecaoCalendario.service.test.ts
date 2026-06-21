import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

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

import { excecaoCalendarioService } from "@/services/excecaoCalendario.service";

// Data fixa no futuro para evitar colisões com seed
const ANO = 2099;
const DATA_FERIADO = `${ANO}-12-25`; // Natal
const DATA_FERIADO_REC = `2098-12-25`; // mesmo mês/dia, ano diferente
const DATA_BLOQUEIO = `${ANO}-07-15`;
const DATA_NORMAL = `${ANO}-03-10`;

describe("ExcecaoCalendario Service", () => {
  beforeAll(async () => {
    await seedTestData();
    // Limpar exceções pré-existentes para datas de teste
    await testPrisma.excecaoCalendario.deleteMany({
      where: { data: { in: [new Date(DATA_FERIADO), new Date(DATA_BLOQUEIO)] } },
    });
  }, 60000);

  afterAll(async () => {
    await testPrisma.excecaoCalendario.deleteMany({
      where: { data: { in: [new Date(DATA_FERIADO), new Date(DATA_BLOQUEIO)] } },
    });
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── CRUD ────────────────────────────────────────────────────────
  describe("create() & getById()", () => {
    it("deve criar um feriado", async () => {
      const excecao = await excecaoCalendarioService.create({
        data: DATA_FERIADO,
        tipo: "FERIADO",
        nome: "Natal",
        afectaPreco: true,
        recorrenciaAnual: true,
      });

      expect(excecao).toBeDefined();
      expect(excecao.nome).toBe("Natal");
      expect(excecao.tipo).toBe("FERIADO");
      expect(excecao.afectaPreco).toBe(true);
      expect(excecao.recorrenciaAnual).toBe(true);
    });

    it("deve lançar ALREADY_EXISTS ao criar duplicado na mesma data", async () => {
      await expect(
        excecaoCalendarioService.create({
          data: DATA_FERIADO,
          tipo: "FERIADO",
          nome: "Outro",
        })
      ).rejects.toThrow("ALREADY_EXISTS");
    });

    it("deve retornar por id via getById()", async () => {
      const lista = await excecaoCalendarioService.list();
      const criada = lista.find((e: { nome: string }) => e.nome === "Natal");
      expect(criada).toBeDefined();

      const porId = await excecaoCalendarioService.getById(criada!.id);
      expect(porId.nome).toBe("Natal");
    });
  });

  describe("update()", () => {
    it("deve atualizar nome e flags", async () => {
      const lista = await excecaoCalendarioService.list();
      const criada = lista.find((e: { nome: string }) => e.nome === "Natal");

      const atualizada = await excecaoCalendarioService.update(criada!.id, {
        nome: "Natal (atualizado)",
        afectaPreco: false,
      });

      expect(atualizada.nome).toBe("Natal (atualizado)");
      expect(atualizada.afectaPreco).toBe(false);
    });
  });

  describe("delete()", () => {
    it("deve eliminar uma exceção", async () => {
      const exc = await excecaoCalendarioService.create({
        data: `${ANO}-11-01`,
        tipo: "FERIADO",
        nome: "Todos os Santos",
      });

      await excecaoCalendarioService.delete(exc.id);

      await expect(excecaoCalendarioService.getById(exc.id)).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── isFeriado / isBloqueado ─────────────────────────────────────
  // Usa datas dedicadas (não mutadas pelos testes CRUD acima)
  const FERIADO_IS_DIA = `${ANO}-10-05`;
  const FERIADO_IS_REC = `${ANO - 1}-10-05`;
  describe("isFeriado()", () => {
    beforeAll(async () => {
      await testPrisma.excecaoCalendario.deleteMany({
        where: { data: { in: [new Date(FERIADO_IS_DIA)] } },
      });
      await excecaoCalendarioService.create({
        data: FERIADO_IS_DIA,
        tipo: "FERIADO",
        nome: "Feriado Dedicado isFeriado",
        afectaPreco: true,
        recorrenciaAnual: true,
      });
    });

    it("deve reconhecer um feriado com afectaPreco", async () => {
      const eh = await excecaoCalendarioService.isFeriado(new Date(FERIADO_IS_DIA));
      expect(eh).toBe(true);
    });

    it("deve reconhecer recorrência anual (outro ano, mesmo mês/dia)", async () => {
      const eh = await excecaoCalendarioService.isFeriado(new Date(FERIADO_IS_REC));
      expect(eh).toBe(true);
    });

    it("deve retornar false para data sem feriado", async () => {
      const eh = await excecaoCalendarioService.isFeriado(new Date(DATA_NORMAL));
      expect(eh).toBe(false);
    });
  });

  describe("isBloqueado()", () => {
    beforeAll(async () => {
      await excecaoCalendarioService.create({
        data: DATA_BLOQUEIO,
        tipo: "BLOQUEADO",
        nome: "Encerramento",
        bloqueiaReserva: true,
      });
    });

    it("deve bloquear reserva na data marcada", async () => {
      const eh = await excecaoCalendarioService.isBloqueado(new Date(DATA_BLOQUEIO));
      expect(eh).toBe(true);
    });

    it("não deve bloquear data normal", async () => {
      const eh = await excecaoCalendarioService.isBloqueado(new Date(DATA_NORMAL));
      expect(eh).toBe(false);
    });
  });

  describe("list()", () => {
    it("deve retornar todas as exceções", async () => {
      const lista = await excecaoCalendarioService.list();
      expect(Array.isArray(lista)).toBe(true);
      expect(lista.length).toBeGreaterThan(0);
    });
  });
});
