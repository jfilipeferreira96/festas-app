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

import { slotHorarioService } from "@/services/slotHorario.service";

describe("SlotHorario Service", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── CRUD ────────────────────────────────────────────────────────
  describe("create() & getById()", () => {
    it("deve criar um slot de horário", async () => {
      const slot = await slotHorarioService.create({
        horaInicio: "14:30",
        duracaoMin: 135,
      });

      expect(slot).toBeDefined();
      expect(slot.horaInicio).toBe("14:30");
      expect(slot.duracaoMin).toBe(135);
      expect(slot.activo).toBe(true);
    });

    it("deve aplicar duracaoMin default se omitido", async () => {
      const slot = await slotHorarioService.create({
        horaInicio: "18:00",
      });
      expect(slot.duracaoMin).toBe(135);
    });

    it("deve retornar por id via getById()", async () => {
      const lista = await slotHorarioService.list();
      const slot = lista[0];
      expect(slot).toBeDefined();

      const porId = await slotHorarioService.getById(slot!.id);
      expect(porId.id).toBe(slot!.id);
    });
  });

  describe("list() & listAll()", () => {
    it("list() deve retornar apenas slots activos", async () => {
      const lista = await slotHorarioService.list();
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every((s: { activo: boolean }) => s.activo === true)).toBe(true);
    });

    it("listAll() deve incluir slots inactivos", async () => {
      const slot = await slotHorarioService.create({ horaInicio: "09:00", activo: false });
      const all = await slotHorarioService.listAll();
      const encontrou = all.some((s: { id: string }) => s.id === slot.id);
      expect(encontrou).toBe(true);

      // limpar
      await slotHorarioService.delete(slot.id);
    });
  });

  describe("update()", () => {
    it("deve actualizar horaInicio e activo", async () => {
      const slot = await slotHorarioService.create({ horaInicio: "11:00" });

      const atualizado = await slotHorarioService.update(slot.id, {
        horaInicio: "11:30",
        activo: false,
      });

      expect(atualizado.horaInicio).toBe("11:30");
      expect(atualizado.activo).toBe(false);

      await slotHorarioService.delete(slot.id);
    });
  });

  describe("delete()", () => {
    it("deve eliminar um slot", async () => {
      const slot = await slotHorarioService.create({ horaInicio: "20:00" });
      await slotHorarioService.delete(slot.id);

      await expect(slotHorarioService.getById(slot.id)).rejects.toThrow("NOT_FOUND");
    });
  });
});
