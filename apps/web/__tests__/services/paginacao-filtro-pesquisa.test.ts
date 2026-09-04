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

import { reservaService } from "@/services/reserva.service";
import { clienteService } from "@/services/cliente.service";
import { monitorService } from "@/services/monitor.service";
import { localService } from "@/services/local.service";

describe("Reserva Service - Filtragem", () => {
  beforeAll(async () => { await seedTestData(); });
  afterAll(async () => { await cleanTestData(); await testPrisma.$disconnect(); });

  describe("list() - sem filtros", () => {
    it("deve retornar todas as reservas", async () => {
      const result = await reservaService.list();
      expect(result.items.length).toBeGreaterThanOrEqual(3);
    });

    it("deve incluir relações (local, cliente, aniversariantes)", async () => {
      const result = await reservaService.list();
      const r = result.items[0];
      expect(r).toHaveProperty("local");
      expect(r).toHaveProperty("cliente");
      expect(r).toHaveProperty("aniversariantes");
    });
  });

  describe("list() - filtro por estado", () => {
    it("deve retornar apenas reservas CONFIRMADO", async () => {
      const result = await reservaService.list({ estado: "CONFIRMADO" });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((r) => r.estado === "CONFIRMADO")).toBe(true);
    });

    it("deve retornar apenas reservas EM_CURSO", async () => {
      const result = await reservaService.list({ estado: "EM_CURSO" });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((r) => r.estado === "EM_CURSO")).toBe(true);
    });

    it("deve retornar array vazio para estado sem resultados", async () => {
      const result = await reservaService.list({ estado: "CANCELADA" });
      expect(result.items).toEqual([]);
    });
  });

  describe("list() - filtro por data", () => {
    it("deve retornar reservas apenas do dia especificado", async () => {
      const today = new Date().toISOString().split("T")[0];
      const result = await reservaService.list({ data: today });
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      result.items.forEach((r) => {
        const rDate = new Date(r.data).toISOString().split("T")[0];
        expect(rDate).toBe(today);
      });
    });
  });

  describe("list() - filtro por localId", () => {
    it("deve retornar reservas apenas do local especificado", async () => {
      const result = await reservaService.list({ localId: "test-local-001" });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((r) => r.localId === "test-local-001")).toBe(true);
    });

    it("deve retornar items vazio para localId inexistente", async () => {
      const result = await reservaService.list({ localId: "local-inexistente" });
      expect(result.items).toEqual([]);
    });
  });

  describe("list() - filtros combinados", () => {
    it("deve filtrar por estado E localId simultaneamente", async () => {
      const today = new Date().toISOString().split("T")[0];
      const result = await reservaService.list({
        estado: "CONFIRMADO",
        localId: "test-local-001",
        data: today,
      });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((r) => r.estado === "CONFIRMADO")).toBe(true);
      expect(result.items.every((r) => r.localId === "test-local-001")).toBe(true);
    });
  });
});

describe("Cliente Service - Pesquisa", () => {
  beforeAll(async () => { await seedTestData(); });
  afterAll(async () => { await cleanTestData(); await testPrisma.$disconnect(); });

  describe("list()", () => {
    it("deve retornar todos os clientes (≥ 12)", async () => {
      const result = await clienteService.list();
      expect(result.items.length).toBeGreaterThanOrEqual(12);
    });

    it("deve retornar clientes ordenados por nome", async () => {
      const result = await clienteService.list();
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i]!.nome.localeCompare(result.items[i - 1]!.nome)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("search()", () => {
    it("deve encontrar clientes por nome (parcial, case-insensitive)", async () => {
      const resultados = await clienteService.search("Pesquisa");
      expect(resultados.length).toBeGreaterThanOrEqual(10);
      resultados.forEach((c) => { expect(c.nome.toLowerCase()).toContain("pesquisa"); });
    });

    it("deve encontrar cliente por email (parcial)", async () => {
      const resultados = await clienteService.search("teste1@");
      expect(resultados.length).toBeGreaterThanOrEqual(1);
      expect(resultados.some((c) => c.email?.includes("teste1@"))).toBe(true);
    });

    it("deve encontrar cliente por telefone (parcial)", async () => {
      const resultados = await clienteService.search("911111111");
      expect(resultados.length).toBeGreaterThanOrEqual(1);
      expect(resultados.some((c) => c.telefone?.includes("911111111"))).toBe(true);
    });

    it("deve retornar array vazio para pesquisa sem resultados", async () => {
      const resultados = await clienteService.search("xyzqwerty12345");
      expect(resultados).toEqual([]);
    });

    it("deve limitar resultados a 10 (take: 10)", async () => {
      const resultados = await clienteService.search("Cliente");
      expect(resultados.length).toBeLessThanOrEqual(10);
    });
  });
});

describe("Monitor Service - Filtragem", () => {
  beforeAll(async () => { await seedTestData(); });
  afterAll(async () => { await cleanTestData(); await testPrisma.$disconnect(); });

  describe("list()", () => {
    it("deve retornar todos os monitores (8)", async () => {
      const monitores = await monitorService.list();
      expect(monitores.length).toBeGreaterThanOrEqual(8);
    });

    it("deve retornar monitores ordenados por nome", async () => {
      const monitores = await monitorService.list();
      for (let i = 1; i < monitores.length; i++) {
        expect(monitores[i]!.nome.localeCompare(monitores[i - 1]!.nome)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("listActive()", () => {
    it("deve retornar apenas monitores activos", async () => {
      const monitores = await monitorService.listActive();
      expect(monitores.length).toBeGreaterThanOrEqual(6);
      expect(monitores.every((m) => m.activo === true)).toBe(true);
    });

    it("não deve incluir monitores inactivos", async () => {
      const monitores = await monitorService.listActive();
      const allMonitores = await monitorService.list();
      const inactiveCount = allMonitores.filter((m) => !m.activo).length;
      expect(inactiveCount).toBeGreaterThan(0);
      expect(monitores.length).toBeLessThan(allMonitores.length);
    });
  });
});

describe("Local Service - Listagem", () => {
  beforeAll(async () => { await seedTestData(); });
  afterAll(async () => { await cleanTestData(); await testPrisma.$disconnect(); });

  describe("list()", () => {
    it("deve retornar todos os locais", async () => {
      const locais = await localService.list();
      expect(locais.length).toBeGreaterThanOrEqual(2);
    });

    it("deve retornar locais ordenados por nome", async () => {
      const locais = await localService.list();
      for (let i = 1; i < locais.length; i++) {
        expect(locais[i]!.nome.localeCompare(locais[i - 1]!.nome)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("listActive()", () => {
    it("deve retornar apenas locais activos", async () => {
      const locais = await localService.listActive();
      expect(locais.length).toBeGreaterThanOrEqual(2);
      expect(locais.every((l) => l.activo === true)).toBe(true);
    });
  });
});