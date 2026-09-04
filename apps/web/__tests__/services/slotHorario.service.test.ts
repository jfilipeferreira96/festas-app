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

  // ── Defaults (cor, hora lanche, sala lanche) ───────────────────
  describe("Defaults do slot (cor, hora lanche, sala lanche)", () => {
    const salaIdRef = { current: "" };
    const slotIdRef = { current: "" };
    const DIA_DEFAULT = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 200);
      return d.toISOString().split("T")[0]!;
    })();

    beforeAll(async () => {
      // Criar sala de lanche de teste
      const sala = await testPrisma.salaLanche.create({
        data: { nome: "Sala Teste Defaults" },
      });
      salaIdRef.current = sala.id;

      // Criar slot com defaults
      const slot = await slotHorarioService.create({
        horaInicio: "15:30",
        duracaoMin: 135,
        corDefault: "#0095C8",
        horaLancheDefault: "16:30",
        salaLancheId: sala.id,
      });
      slotIdRef.current = slot.id;
    }, 60000);

    afterAll(async () => {
      await testPrisma.reserva.deleteMany({
        where: { horario: "15:30", data: new Date(DIA_DEFAULT) },
      });
      if (slotIdRef.current) {
        await testPrisma.slotHorario.delete({ where: { id: slotIdRef.current } }).catch(() => {});
      }
      if (salaIdRef.current) {
        await testPrisma.salaLanche.delete({ where: { id: salaIdRef.current } }).catch(() => {});
      }
    });

    it("deve persistir defaults ao criar slot", async () => {
      const slot = await slotHorarioService.getById(slotIdRef.current);
      expect(slot.corDefault).toBe("#0095C8");
      expect(slot.horaLancheDefault).toBe("16:30");
      expect(slot.salaLancheId).toBe(salaIdRef.current);
    });

    it("deve actualizar defaults via update()", async () => {
      const atualizado = await slotHorarioService.update(slotIdRef.current, {
        corDefault: "#5CBE4A",
        horaLancheDefault: "17:00",
      });
      expect(atualizado.corDefault).toBe("#5CBE4A");
      expect(atualizado.horaLancheDefault).toBe("17:00");
      expect(atualizado.salaLancheId).toBe(salaIdRef.current);
    });

    it("list() deve incluir a relação salaLanche (denormalizada em salaLancheNome)", async () => {
      const lista = await slotHorarioService.list();
      const slot = lista.find((s: { id: string }) => s.id === slotIdRef.current);
      expect(slot).toBeDefined();
      expect((slot as { salaLancheNome?: string }).salaLancheNome).toBe(
        "Sala Teste Defaults"
      );
    });

    it("getSlotsDia() deve retornar defaults no SlotDiaItem", async () => {
      const dia = await slotHorarioService.getSlotsDia(DIA_DEFAULT);
      const slot = dia.slots.find((s) => s.slotId === slotIdRef.current);
      expect(slot).toBeDefined();
      expect(slot!.corDefault).toBe("#5CBE4A");
      expect(slot!.horaLancheDefault).toBe("17:00");
      expect(slot!.salaLancheId).toBe(salaIdRef.current);
      expect(slot!.salaLancheNome).toBe("Sala Teste Defaults");
    });
  });

  // ── Ligação slots ↔ festas (getSlotsDia) ────────────────────────
  describe("getSlotsDia() - ligação slots ↔ festas", () => {
    const DIA_TESTE = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 100);
      return d.toISOString().split("T")[0]!;
    })();

    const slotIdRef = { current: "" };
    const reservaIds = ["reserva-slot-test-1", "reserva-slot-test-2", "reserva-slot-test-3"];

    beforeAll(async () => {
      // Slot 11:00–13:15 (135 min)
      const slot = await testPrisma.slotHorario.create({
        data: { horaInicio: "11:00", duracaoMin: 135, ordem: 99 },
      });
      slotIdRef.current = slot.id;

      const dataObj = new Date(DIA_TESTE);

      // Festa que corresponde EXACTAMENTE ao slot (11:00, 135 min)
      await testPrisma.reserva.create({
        data: {
          id: reservaIds[0],
          data: dataObj,
          horario: "11:00",
          duracaoMinutos: 135,
          numCriancas: 12,
          estado: "CONFIRMADO",
          cor: "#FF0000",
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });

      // Festa com horário CUSTOM (22:00, 30 min) - não sobrepõe nenhum slot
      await testPrisma.reserva.create({
        data: {
          id: reservaIds[1],
          data: dataObj,
          horario: "22:00",
          duracaoMinutos: 30,
          numCriancas: 8,
          estado: "RESERVA",
          cor: "#00FF00",
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });

      // Festa CANCELADA que sobrepõe o slot - deve ser ignorada
      await testPrisma.reserva.create({
        data: {
          id: reservaIds[2],
          data: dataObj,
          horario: "11:30",
          duracaoMinutos: 90,
          numCriancas: 5,
          estado: "CANCELADA",
          cor: "#0000FF",
          clienteId: "test-cliente-001",
          localId: "test-local-001",
        },
      });
    }, 60000);

    afterAll(async () => {
      await testPrisma.reserva.deleteMany({ where: { id: { in: reservaIds } } });
      if (slotIdRef.current) {
        await testPrisma.slotHorario.delete({ where: { id: slotIdRef.current } }).catch(() => {});
      }
    });

    it("deve marcar o slot como ocupado pela festa correspondente", async () => {
      const dia = await slotHorarioService.getSlotsDia(DIA_TESTE);
      const slot = dia.slots.find((s) => s.slotId === slotIdRef.current);

      expect(slot).toBeDefined();
      expect(slot!.ocupado).toBe(true);
      expect(slot!.festa).not.toBeNull();
      expect(slot!.festa!.numCriancas).toBe(12);
    });

    it("deve enviar festas sem slot (horário custom) para festasSemSlot", async () => {
      const dia = await slotHorarioService.getSlotsDia(DIA_TESTE);
      const custom = dia.festasSemSlot.find((f) => f.id === reservaIds[1]);

      expect(custom).toBeDefined();
      expect(custom!.horario).toBe("22:00");
      expect(custom!.duracaoMinutos).toBe(30);
    });

    it("deve ignorar festas CANCELADAS (não ocupa slot nem aparece como custom)", async () => {
      const dia = await slotHorarioService.getSlotsDia(DIA_TESTE);

      const idsPresentes = [
        ...dia.slots.filter((s) => s.festa).map((s) => s.festa!.id),
        ...dia.festasSemSlot.map((f) => f.id),
      ];
      expect(idsPresentes).not.toContain(reservaIds[2]);
    });

    it("deve recolher as cores usadas pelas festas activas", async () => {
      const dia = await slotHorarioService.getSlotsDia(DIA_TESTE);
      expect(dia.coresUsadas).toContain("#FF0000");
      expect(dia.coresUsadas).toContain("#00FF00");
      expect(dia.coresUsadas).not.toContain("#0000FF"); // cancelada
    });

    it("não deve atribuir a mesma festa a dois slots sobrepostos", async () => {
      // A festa 11:00 (135 min → 11:00-13:15) sobrepõe-se ao slot 10:00 (10:00-12:15)
      // e ao slot 11:00 (11:00-13:15). Deve ir apenas para o slot 11:00 (match exacto).
      const dia = await slotHorarioService.getSlotsDia(DIA_TESTE);
      const slotsComEstaFesta = dia.slots.filter(
        (s) => s.festa?.id === reservaIds[0],
      );
      expect(slotsComEstaFesta.length).toBe(1);
      expect(slotsComEstaFesta[0]!.horaInicio).toBe("11:00");
    });
  });
});
