import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
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

import { reservaService } from "@/services/reserva.service";

const today = new Date();
const todayStr = today.toISOString().split("T")[0]!;
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 2);
const tomorrowStr = tomorrow.toISOString().split("T")[0]!;

const TEST_ANIVERSARIANTE = {
  nome: "Criança Teste Create",
  dataNascimento: "2018-05-15",
  encarregadoNome: "Enc Teste",
  encarregadoEmail: "enc-teste-create@test.com",
  encarregadoTelefone: "919999999",
};

describe("Reserva Service", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new reserva with aniversariante", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "16:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 15,
        notas: "Teste de criação",
      });

      expect(reserva).toBeDefined();
      expect(reserva.aniversariantes.length).toBeGreaterThan(0);
      expect(reserva.estado).toBe("RESERVA");
      expect(reserva.local.id).toBe(TEST_IDS.LOCAL_1);

      // Cleanup (create() já não pré-reserva cacifos - materialização é no dia)
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should create a reserva with clienteId directly", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "15:30",
        duracaoMinutos: 90,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
      });

      expect(reserva).toBeDefined();
      expect(reserva.clienteId).toBe(TEST_IDS.CLIENTE_1);

      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("deve persistir o pagamento unificado (valorTotal + ledger de pagamentos)", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "21:30",
        duracaoMinutos: 90,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
        valorTotal: 150,
        pagamentos: [
          { valor: 100, metodo: "DINHEIRO" },
          { valor: 50, metodo: "MBWAY" },
        ],
      });

      expect(Number(reserva.valorTotal)).toBe(150);
      // Ledger: 2 entradas, soma = 150; pago derivado (soma >= total)
      expect(reserva.pagamentos).toHaveLength(2);
      const soma = reserva.pagamentos.reduce((s, p) => s + Number(p.valor), 0);
      expect(soma).toBe(150);
      expect(reserva.pago).toBe(true);

      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should throw DATA_REQUIRED if missing", async () => {
      await expect(
        reservaService.create({
          clienteId: TEST_IDS.CLIENTE_1,
          data: "",
          horario: "16:00",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("DATA_REQUIRED");
    });

    it("should throw HORARIO_REQUIRED if missing", async () => {
      await expect(
        reservaService.create({
          clienteId: TEST_IDS.CLIENTE_1,
          data: tomorrowStr,
          horario: "",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("HORARIO_REQUIRED");
    });

    it("should throw LOCAL_REQUIRED if missing", async () => {
      await expect(
        reservaService.create({
          clienteId: TEST_IDS.CLIENTE_1,
          data: tomorrowStr,
          horario: "16:00",
          duracaoMinutos: 120,
          localId: "",
        })
      ).rejects.toThrow("LOCAL_REQUIRED");
    });

    it("should throw LOCAL_NOT_FOUND for non-existent local", async () => {
      await expect(
        reservaService.create({
          clienteId: TEST_IDS.CLIENTE_1,
          data: tomorrowStr,
          horario: "16:00",
          duracaoMinutos: 120,
          localId: "non-existent-local",
        })
      ).rejects.toThrow("LOCAL_NOT_FOUND");
    });

    it("should throw LOCAL_NOT_AVAILABLE for time conflict", async () => {
      await expect(
        reservaService.create({
          clienteId: TEST_IDS.CLIENTE_1,
          data: todayStr,
          horario: "10:00",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("LOCAL_NOT_AVAILABLE");
    });

    it("should create reserva with extras", async () => {
      const reserva = await reservaService.create({
        clienteId: TEST_IDS.CLIENTE_1,
        data: tomorrowStr,
        horario: "17:00",
        duracaoMinutos: 90,
        localId: TEST_IDS.LOCAL_1,
        extrasIds: [TEST_IDS.EXTRA_1],
      });

      expect(reserva.extras.length).toBeGreaterThan(0);
      expect(reserva.extras[0]?.extraId).toBe(TEST_IDS.EXTRA_1);

      await testPrisma.reservaExtra.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all reservas (paginated)", async () => {
      const result = await reservaService.list();
      expect(result.items.length).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it("should filter by estado", async () => {
      const result = await reservaService.list({ estado: "CONFIRMADO" });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((r: { estado: string }) => r.estado === "CONFIRMADO")).toBe(true);
    });

    it("should filter by localId", async () => {
      const result = await reservaService.list({ localId: TEST_IDS.LOCAL_1 });
      expect(result.items.every((r: { localId: string }) => r.localId === TEST_IDS.LOCAL_1)).toBe(true);
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return a reserva with relations", async () => {
      const reserva = await reservaService.getById(TEST_IDS.RESERVA_CONFIRMADA);
      expect(reserva).toBeDefined();
      expect(reserva.id).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(reserva.local).toBeDefined();
      expect(reserva.cliente).toBeDefined();
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(reservaService.getById("non-existent")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── updateStatus ──────────────────────────────────────────────
  describe("updateStatus()", () => {
    it("should transition RESERVA → CONFIRMADO", async () => {
      const updated = await reservaService.updateStatus(TEST_IDS.RESERVA_PENDENTE, "CONFIRMADO");
      expect(updated.estado).toBe("CONFIRMADO");
    });

    it("should throw INVALID_STATUS for invalid transition", async () => {
      await expect(
        reservaService.updateStatus(TEST_IDS.RESERVA_CONFIRMADA, "RESERVA")
      ).rejects.toThrow("INVALID_STATUS");
    });

    it("should throw INVALID_STATUS for CONCLUIDA → anything", async () => {
      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(todayStr),
          horario: "08:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "CONCLUIDA",
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      await expect(
        reservaService.updateStatus(reserva.id, "RESERVA")
      ).rejects.toThrow("INVALID_STATUS");

      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });
  });

  // ── delete ────────────────────────────────────────────────────
  describe("delete()", () => {
    it("should delete a reserva in RESERVA state", async () => {
      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(tomorrowStr),
          horario: "09:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "RESERVA",
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      await reservaService.delete(reserva.id);

      const found = await testPrisma.reserva.findUnique({ where: { id: reserva.id } });
      expect(found).toBeNull();
    });

    it("should allow deleting a reserva even if EM_CURSO (com ledger em cascata)", async () => {
      // Reserva própria para não afetar a do seed partilhado
      const agora = new Date();
      const reserva = await testPrisma.reserva.create({
        data: {
          id: "test-delete-em-curso",
          data: agora,
          horario: "12:00",
          duracaoMinutos: 90,
          numCriancas: 5,
          estado: "EM_CURSO",
          inicioEm: agora,
          fimPrevisto: new Date(agora.getTime() + 90 * 60_000),
          valorTotal: 100,
          pago: true,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
          pagamentos: { create: [{ valor: 100, metodo: "DINHEIRO" }] },
        },
      });

      await expect(reservaService.delete(reserva.id)).resolves.toBeDefined();

      // Ledger removido em cascata
      const ledger = await testPrisma.pagamento.findMany({ where: { reservaId: reserva.id } });
      expect(ledger).toHaveLength(0);
    });
  });

  // ── iniciar ───────────────────────────────────────────────────
  describe("iniciar()", () => {
    it("should start a reserva from CONFIRMADO state", async () => {
      const reserva = await reservaService.iniciar(TEST_IDS.RESERVA_CONFIRMADA);
      expect(reserva).toBeDefined();
      expect(reserva.estado).toBe("EM_CURSO");
      expect(reserva.inicioEm).toBeDefined();
      expect(reserva.fimPrevisto).toBeDefined();

      // Cleanup
      await testPrisma.reservaEtapa.deleteMany({ where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA } }).catch(() => {});
      await testPrisma.reserva.update({
        where: { id: TEST_IDS.RESERVA_CONFIRMADA },
        data: { estado: "CONFIRMADO", inicioEm: null, fimPrevisto: null },
      });
    });

    it("should throw NOT_FOUND for non-existent reserva", async () => {
      await expect(reservaService.iniciar("non-existent")).rejects.toThrow("NOT_FOUND");
    });

    it("should throw RESERVA_NOT_CONFIRMED if reserva is not confirmed", async () => {
      // RESERVA_PENDENTE is in RESERVA state, not CONFIRMADO
      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(tomorrowStr),
          horario: "13:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "RESERVA",
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      await expect(reservaService.iniciar(reserva.id)).rejects.toThrow("RESERVA_NOT_CONFIRMED");

      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should throw ALREADY_IN_PROGRESS if already started", async () => {
      // Create a CONFIRMADO reserva with inicioEm already set
      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(),
          horario: "12:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "CONFIRMADO",
          inicioEm: new Date(),
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      await expect(reservaService.iniciar(reserva.id)).rejects.toThrow("ALREADY_IN_PROGRESS");

      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });
  });

  // ── finalizar ─────────────────────────────────────────────────
  describe("finalizar()", () => {
    it("should finalize an EM_CURSO reserva and release cacifos", async () => {
      const inicio = new Date();
      inicio.setHours(8, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setMinutes(fim.getMinutes() + 60);

      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(),
          horario: "08:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "EM_CURSO",
          inicioEm: inicio,
          fimPrevisto: fim,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      // Occupy a cacifo
      await testPrisma.cacifo.update({
        where: { numero: 1 },
        data: { estado: "OCUPADO", reservaId: reserva.id },
      });

      const finalized = await reservaService.finalizar(reserva.id);
      expect(finalized.estado).toBe("CONCLUIDA");
      expect(finalized.fimReal).toBeDefined();

      // Verify cacifo was released
      const cacifo = await testPrisma.cacifo.findUnique({ where: { numero: 1 } });
      expect(cacifo?.estado).toBe("LIVRE");
      expect(cacifo?.reservaId).toBeNull();

      await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
    });

    it("should throw NOT_FOUND for non-existent reserva", async () => {
      await expect(reservaService.finalizar("non-existent")).rejects.toThrow("NOT_FOUND");
    });

    it("should throw NOT_IN_PROGRESS if reserva is not EM_CURSO", async () => {
      await expect(reservaService.finalizar(TEST_IDS.RESERVA_CONFIRMADA)).rejects.toThrow(
        "NOT_IN_PROGRESS"
      );
    });

    it("should calculate excesso cost when finalizing past fimPrevisto", async () => {
      // Reserva started 120 min ago with 60 min duration → ~60 min excess
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);
      const fimPrevisto = new Date(inicio.getTime() + 60 * 60 * 1000);

      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(),
          horario: "08:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "EM_CURSO",
          inicioEm: inicio,
          fimPrevisto,
          valorTotal: 100,
          pago: true,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      const finalized = await reservaService.finalizar(reserva.id);

      expect(finalized.estado).toBe("CONCLUIDA");
      expect(finalized.excessoMinutos).toBeGreaterThanOrEqual(60);
      // custoExcesso uses the fixed excesso price from tarifário (default 5)
      const custoExcesso = Number(finalized.custoExcesso);
      expect(custoExcesso).toBeGreaterThan(0);
      expect(Number(finalized.custoTotalFinal)).toBe(100 + custoExcesso);

      await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
    });

    it("should use manual custoExcesso when finalizing (overrides suggestion)", async () => {
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);
      const fimPrevisto = new Date(inicio.getTime() + 60 * 60 * 1000);

      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(),
          horario: "08:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "EM_CURSO",
          inicioEm: inicio,
          fimPrevisto,
          valorTotal: 100,
          pago: true,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      const finalized = await reservaService.finalizar(reserva.id, { custoExcessoManual: 10 });

      expect(finalized.estado).toBe("CONCLUIDA");
      expect(finalized.excessoMinutos).toBeGreaterThanOrEqual(60);
      expect(Number(finalized.custoExcesso)).toBe(10);
      expect(Number(finalized.custoTotalFinal)).toBe(110); // 100 + 10

      await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
    });

    it("should allow manual custoExcesso of 0 when finalizing", async () => {
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);
      const fimPrevisto = new Date(inicio.getTime() + 60 * 60 * 1000);

      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(),
          horario: "08:00",
          duracaoMinutos: 60,
          numCriancas: 5,
          estado: "EM_CURSO",
          inicioEm: inicio,
          fimPrevisto,
          valorTotal: 100,
          pago: true,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
        },
      });

      const finalized = await reservaService.finalizar(reserva.id, { custoExcessoManual: 0 });

      expect(Number(finalized.custoExcesso)).toBe(0);
      expect(Number(finalized.custoTotalFinal)).toBe(100); // 100 + 0

      await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
    });
  });

  // ── alocarMonitor / removerMonitor ────────────────────────────
  describe("alocarMonitor() / removerMonitor()", () => {
    it("should allocate a monitor to a reserva", async () => {
      const rm = await reservaService.alocarMonitor(TEST_IDS.RESERVA_EM_CURSO, TEST_IDS.MONITOR_1);
      expect(rm).toBeDefined();
      expect(rm.reservaId).toBe(TEST_IDS.RESERVA_EM_CURSO);
      expect(rm.monitorId).toBe(TEST_IDS.MONITOR_1);

      await reservaService.removerMonitor(TEST_IDS.RESERVA_EM_CURSO, TEST_IDS.MONITOR_1);
    });

    it("should throw MONITOR_NOT_FOUND for non-existent monitor", async () => {
      await expect(
        reservaService.alocarMonitor(TEST_IDS.RESERVA_EM_CURSO, "non-existent")
      ).rejects.toThrow("MONITOR_NOT_FOUND");
    });
  });

  // ── toggleEtapa ───────────────────────────────────────────────
  describe("toggleEtapa()", () => {
    it("should toggle an etapa for a reserva", async () => {
      const etapa = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Teste", ordem: 1, activo: true },
      });

      const reservaEtapa = await testPrisma.reservaEtapa.create({
        data: {
          reservaId: TEST_IDS.RESERVA_EM_CURSO,
          etapaId: etapa.id,
          concluida: false,
        },
      });

      const toggled = await reservaService.toggleEtapa(TEST_IDS.RESERVA_EM_CURSO, etapa.id);
      expect(toggled.concluida).toBe(true);
      expect(toggled.concluidaEm).toBeDefined();

      const toggledBack = await reservaService.toggleEtapa(TEST_IDS.RESERVA_EM_CURSO, etapa.id);
      expect(toggledBack.concluida).toBe(false);

      await testPrisma.reservaEtapa.delete({ where: { id: reservaEtapa.id } });
      await testPrisma.etapaFesta.delete({ where: { id: etapa.id } });
    });

    it("should throw ETAPA_NOT_FOUND for non-existent etapa", async () => {
      await expect(
        reservaService.toggleEtapa(TEST_IDS.RESERVA_EM_CURSO, "non-existent")
      ).rejects.toThrow("ETAPA_NOT_FOUND");
    });
  });

  // ── create with monitoresIds and etapasIds ─────────────────────
  describe("create() with monitoresIds and etapasIds", () => {
    it("should create a reserva with monitores and etapas", async () => {
      const etapa1 = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Create 1", ordem: 1, activo: true },
      });
      const etapa2 = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Create 2", ordem: 2, activo: true },
      });

      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "18:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_2,
        clienteId: TEST_IDS.CLIENTE_2,
        numCriancas: 10,
        monitoresIds: [TEST_IDS.MONITOR_1, TEST_IDS.MONITOR_2],
        etapasIds: [etapa1.id, etapa2.id],
      });

      expect(reserva).toBeDefined();
      expect(reserva.monitores.length).toBe(2);
      expect(reserva.etapas.length).toBe(2);

      await testPrisma.reservaEtapa.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reservaMonitor.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
      await testPrisma.etapaFesta.delete({ where: { id: etapa1.id } });
      await testPrisma.etapaFesta.delete({ where: { id: etapa2.id } });
    });
  });

  // ── removerEtapa ──────────────────────────────────────────────
  describe("removerEtapa()", () => {
    it("should remove an etapa from a reserva", async () => {
      const etapa = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Remover", ordem: 1, activo: true },
      });

      await testPrisma.reservaEtapa.create({
        data: {
          reservaId: TEST_IDS.RESERVA_EM_CURSO,
          etapaId: etapa.id,
          concluida: false,
        },
      });

      await reservaService.removerEtapa(TEST_IDS.RESERVA_EM_CURSO, etapa.id);

      const remaining = await testPrisma.reservaEtapa.findMany({
        where: { reservaId: TEST_IDS.RESERVA_EM_CURSO, etapaId: etapa.id },
      });
      expect(remaining.length).toBe(0);

      await testPrisma.etapaFesta.delete({ where: { id: etapa.id } });
    });

    it("should throw ETAPA_NOT_FOUND for non-existent etapa association", async () => {
      await expect(
        reservaService.removerEtapa(TEST_IDS.RESERVA_EM_CURSO, "non-existent"),
      ).rejects.toThrow("ETAPA_NOT_FOUND");
    });
  });

  // ── marcarEtapasConcluidas ────────────────────────────────────
  describe("marcarEtapasConcluidas()", () => {
    it("should mark all etapas as concluida for a reserva", async () => {
      const etapa1 = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Concluir 1", ordem: 1, activo: true },
      });
      const etapa2 = await testPrisma.etapaFesta.create({
        data: { nome: "Etapa Concluir 2", ordem: 2, activo: true },
      });

      await testPrisma.reservaEtapa.create({
        data: { reservaId: TEST_IDS.RESERVA_EM_CURSO, etapaId: etapa1.id, concluida: false },
      });
      await testPrisma.reservaEtapa.create({
        data: { reservaId: TEST_IDS.RESERVA_EM_CURSO, etapaId: etapa2.id, concluida: false },
      });

      const etapasResult = await reservaService.marcarEtapasConcluidas(TEST_IDS.RESERVA_EM_CURSO);
      expect(etapasResult.length).toBeGreaterThanOrEqual(2);

      // Verify all are concluida
      const etapas = await testPrisma.reservaEtapa.findMany({
        where: { reservaId: TEST_IDS.RESERVA_EM_CURSO, etapaId: { in: [etapa1.id, etapa2.id] } },
      });
      expect(etapas.every((e) => e.concluida === true)).toBe(true);
      expect(etapas.every((e) => e.concluidaEm !== null)).toBe(true);

      await testPrisma.reservaEtapa.deleteMany({
        where: { reservaId: TEST_IDS.RESERVA_EM_CURSO, etapaId: { in: [etapa1.id, etapa2.id] } },
      });
      await testPrisma.etapaFesta.delete({ where: { id: etapa1.id } });
      await testPrisma.etapaFesta.delete({ where: { id: etapa2.id } });
    });

    it("should throw NOT_FOUND for non-existent reserva", async () => {
      await expect(
        reservaService.marcarEtapasConcluidas("non-existent"),
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── getActive ─────────────────────────────────────────────────
  describe("getActive()", () => {
    it("should return only active reservas (EM_CURSO)", async () => {
      const active = await reservaService.getActive();
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.every((r: { estado: string }) => r.estado === "EM_CURSO")).toBe(true);
    });
  });

  // ── checkDisponibilidade (overlap detection) ──────────────────
  describe("checkDisponibilidade()", () => {
    // Use a far-future date with no seed data to avoid interference
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureStr = futureDate.toISOString().split("T")[0]!;

    it("should return disponivel=true when slot is free", async () => {
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(result.disponivel).toBe(true);
      expect(result.conflitos.length).toBe(0);
    });

    it("should detect overlapping time slot as conflict", async () => {
      // Create a reserva at 10:00–12:00
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
      });

      // Check 11:00–13:00 → overlaps with 10:00–12:00
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "11:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(result.disponivel).toBe(false);
      expect(result.conflitos.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should NOT conflict when slots are adjacent (end = start)", async () => {
      // Create a reserva at 10:00–12:00
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
      });

      // Check 12:00–14:00 → starts exactly when the other ends
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "12:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(result.disponivel).toBe(true);
      expect(result.conflitos.length).toBe(0);

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should NOT conflict when same time but different room", async () => {
      // Create a reserva on LOCAL_1 at 10:00–12:00
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
      });

      // Check LOCAL_2 at 10:00–12:00 → different room, no conflict
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_2,
      });
      expect(result.disponivel).toBe(true);
      expect(result.conflitos.length).toBe(0);

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should exclude self when excludeId is provided", async () => {
      // Create a reserva at 10:00–12:00
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 10,
      });

      // Check same slot with excludeId → should not conflict with itself
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        excludeId: reserva.id,
      });
      expect(result.disponivel).toBe(true);
      expect(result.conflitos.length).toBe(0);

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should ignore CONCLUIDA and CANCELADA reservas", async () => {
      // Create a CONCLUIDA reserva at 10:00–12:00 directly
      const reserva = await testPrisma.reserva.create({
        data: {
          data: new Date(futureStr),
          horario: "10:00",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_1,
          clienteId: TEST_IDS.CLIENTE_1,
          numCriancas: 10,
          estado: "CONCLUIDA",
        },
      });

      // Check same slot → should be available (CONCLUIDA is ignored)
      const result = await reservaService.checkDisponibilidade({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(result.disponivel).toBe(true);
      expect(result.conflitos.length).toBe(0);

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("should throw DATA_REQUIRED if data is empty", async () => {
      await expect(
        reservaService.checkDisponibilidade({
          data: "",
          horario: "10:00",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_1,
        }),
      ).rejects.toThrow("DATA_REQUIRED");
    });

    it("should throw LOCAL_REQUIRED if localId is empty", async () => {
      await expect(
        reservaService.checkDisponibilidade({
          data: futureStr,
          horario: "10:00",
          duracaoMinutos: 120,
          localId: "",
        }),
      ).rejects.toThrow("LOCAL_REQUIRED");
    });
  });

  // ── v2: Dia bloqueado, meias, split payment ────────────────────
  describe("create() - dia bloqueado rejeita criação", () => {
    it("deve rejeitar criação numa data bloqueada (DAY_BLOCKED)", async () => {
      // Criar exceção de bloqueio dedicada (evita dependência de seed/timezone)
      const bloqueado = new Date();
      bloqueado.setDate(bloqueado.getDate() + 90);
      const bloqueadoStr = bloqueado.toISOString().split("T")[0]!;
      const dataNormalizada = new Date(bloqueadoStr + "T00:00:00.000Z");

      await testPrisma.excecaoCalendario.create({
        data: {
          data: dataNormalizada,
          tipo: "BLOQUEADO",
          nome: "Bloqueio Teste v2",
          afectaPreco: false,
          bloqueiaReserva: true,
          recorrenciaAnual: false,
        },
      });

      await expect(
        reservaService.create({
          data: bloqueadoStr,
          horario: "14:00",
          duracaoMinutos: 120,
          localId: TEST_IDS.LOCAL_2,
          aniversariantes: [TEST_ANIVERSARIANTE],
          numCriancas: 10,
        }),
      ).rejects.toThrow("DAY_BLOCKED");

      // Cleanup
      await testPrisma.excecaoCalendario.deleteMany({ where: { data: dataNormalizada } }).catch(() => {});
    });
  });

  describe("create() - meias e ledger de pagamentos", () => {
    it("deve aplicar meiasQuantidade e pagamentos (ledger) na criação", async () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 60);
      const futuroStr = futuro.toISOString().split("T")[0]!;

      const reserva = await reservaService.create({
        data: futuroStr,
        horario: "15:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 12,
        meiasQuantidade: 12,
        pagamentos: [
          { valor: 180, metodo: "DINHEIRO" },
          { valor: 20, metodo: "MBWAY" },
        ],
      });

      expect(reserva.meiasQuantidade).toBe(12);
      expect(reserva.pagamentos).toHaveLength(2);
      expect(Number(reserva.pagamentos[1].valor)).toBe(20);
      expect(reserva.pagamentos[1].metodo).toBe("MBWAY");
      // precoCriancaAplicado deve ter sido calculado automaticamente
      expect(reserva.precoCriancaAplicado).toBeDefined();
      expect(reserva.minimoCriancas).toBeDefined();

      // Cleanup
      await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
    });
  });

  // ── salaLanche (sala de lanche na reserva) ─────────────────────
  describe("create() / update() - salaLancheId", () => {
    const salaIdRef = { current: "" };
    const reservaIdRef = { current: "" };
    const futuroStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      return d.toISOString().split("T")[0]!;
    })();

    beforeAll(async () => {
      const sala = await testPrisma.salaLanche.create({
        data: { nome: "Sala Lanche Reserva Test" },
      });
      salaIdRef.current = sala.id;
    }, 60000);

    afterAll(async () => {
      if (reservaIdRef.current) {
        await testPrisma.reserva.delete({ where: { id: reservaIdRef.current } }).catch(() => {});
      }
      if (salaIdRef.current) {
        await testPrisma.salaLanche.delete({ where: { id: salaIdRef.current } }).catch(() => {});
      }
    });

    it("deve criar reserva com salaLancheId", async () => {
      const reserva = await reservaService.create({
        data: futuroStr,
        horario: "13:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 10,
        salaLancheId: salaIdRef.current,
      });
      reservaIdRef.current = reserva.id;

      expect(reserva.salaLancheId).toBe(salaIdRef.current);
    });

    it("deve actualizar salaLancheId via update()", async () => {
      // Criar segunda sala
      const sala2 = await testPrisma.salaLanche.create({
        data: { nome: "Sala Lanche Reserva Test 2" },
      });

      const atualizada = await reservaService.update(reservaIdRef.current, {
        salaLancheId: sala2.id,
      });

      expect(atualizada.salaLancheId).toBe(sala2.id);

      // Limpar segunda sala
      await testPrisma.salaLanche.delete({ where: { id: sala2.id } }).catch(() => {});
    });
  });

  // ── Cacifos - pré-reserva materializada no dia da festa ──────
  describe("cacifos - materialização no dia (pool diário)", () => {
    // Garante uma pool de cacifos limpa (LIVRE) - testes anteriores podem ter deixado
    // cacifos pré-reservados que não foram limpos.
    beforeEach(async () => {
      await testPrisma.cacifo.updateMany({ where: {}, data: { estado: "LIVRE", reservaId: null, criancas: null, notas: null } });
    });

    it("DEVE pré-reservar N cacifos ao criar reserva (etiquetados com o aniversariante)", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "17:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 5,
      });

      // Criar a festa pré-reserva imediatamente 5 cacifos RESERVADO com o nome
      const cacifos = await testPrisma.cacifo.findMany({
        where: { reservaId: reserva.id },
      });
      expect(cacifos.length).toBe(5);
      expect(cacifos.every((c) => c.estado === "RESERVADO")).toBe(true);
      expect(cacifos.every((c) => c.criancas === TEST_ANIVERSARIANTE.nome)).toBe(true);

      // Cleanup
      await testPrisma.cacifo.updateMany({
        where: { reservaId: reserva.id },
        data: { estado: "LIVRE", reservaId: null, criancas: null },
      });
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("iniciar() mantém a pré-reserva de N cacifos (não duplica)", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "18:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 4,
      });
      await testPrisma.reserva.update({ where: { id: reserva.id }, data: { estado: "CONFIRMADO" } });

      const antes = await testPrisma.cacifo.findMany({ where: { reservaId: reserva.id } });
      expect(antes.length).toBe(4);

      const iniciada = await reservaService.iniciar(reserva.id);
      expect(iniciada.estado).toBe("EM_CURSO");

      // Ao iniciar, mantém os 4 cacifos pré-reservados (não duplica)
      const cacifos = await testPrisma.cacifo.findMany({ where: { reservaId: reserva.id } });
      expect(cacifos.length).toBe(4);
      expect(cacifos.every((c) => c.estado === "RESERVADO")).toBe(true);

      // Cleanup
      await testPrisma.cacifo.updateMany({
        where: { reservaId: reserva.id },
        data: { estado: "LIVRE", reservaId: null, criancas: null },
      });
      await testPrisma.reservaEtapa.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("iniciar() deve fazer top-up quando há cacifos atribuídos manualmente", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "19:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 3,
      });
      await testPrisma.reserva.update({ where: { id: reserva.id }, data: { estado: "CONFIRMADO" } });

      // Já tem 3 pré-reservados na criação; atribuir mais 1 manual fica a 4 (> 3)
      const cacifosAntes = await testPrisma.cacifo.findMany({ where: { reservaId: reserva.id } });
      expect(cacifosAntes.length).toBe(3);

      const iniciada = await reservaService.iniciar(reserva.id);
      expect(iniciada.estado).toBe("EM_CURSO");

      // Mantém os 3 (top-up não desconta os manuais acima do alvo)
      const cacifos = await testPrisma.cacifo.findMany({ where: { reservaId: reserva.id } });
      expect(cacifos.length).toBe(3);

      // Cleanup
      await testPrisma.cacifo.updateMany({
        where: { reservaId: reserva.id },
        data: { estado: "LIVRE", reservaId: null, criancas: null },
      });
      await testPrisma.reservaEtapa.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("cancelar (CANCELADA) liberta os cacifos pré-reservados", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "20:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 3,
      });
      const reservados = await testPrisma.cacifo.findMany({
        where: { reservaId: reserva.id },
      });
      expect(reservados.length).toBe(3);
      expect(reservados.every((c) => c.estado === "RESERVADO")).toBe(true);

      await reservaService.updateStatus(reserva.id, "CANCELADA");

      // Nenhum cacifo continua associado; os que estavam reservados ficam LIVRE
      const apos = await testPrisma.cacifo.findMany({ where: { reservaId: reserva.id } });
      expect(apos.length).toBe(0);
      const libertados = await testPrisma.cacifo.findMany({
        where: { id: { in: reservados.map((c) => c.id) } },
      });
      expect(libertados.every((c) => c.estado === "LIVRE" && c.reservaId === null)).toBe(true);

      // Cleanup
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: reserva.id } });
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });

    it("delete() liberta os cacifos pré-reservados (não deixa órfãos RESERVADO)", async () => {
      const reserva = await reservaService.create({
        data: tomorrowStr,
        horario: "21:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [TEST_ANIVERSARIANTE],
        numCriancas: 2,
      });
      const reservados = await testPrisma.cacifo.findMany({
        where: { reservaId: reserva.id },
      });
      expect(reservados.length).toBe(2);

      await reservaService.delete(reserva.id);

      // A FK é SetNull - sem a libertação explícita ficariam RESERVADO para sempre
      const apos = await testPrisma.cacifo.findMany({
        where: { id: { in: reservados.map((c) => c.id) } },
      });
      expect(apos.every((c) => c.estado === "LIVRE" && c.reservaId === null)).toBe(true);
      // (a reserva já não existe)
      const apagada = await testPrisma.reserva.findUnique({ where: { id: reserva.id } });
      expect(apagada).toBeNull();
    });
  });

  // ── actualizarEstadoCacifos ──────────────────────────────────
  describe("actualizarEstadoCacifos()", () => {
    it("deve marcar cacifosChamado = true", async () => {
      const result = await reservaService.actualizarEstadoCacifos(TEST_IDS.RESERVA_EM_CURSO, {
        chamado: true,
      });

      expect(result.cacifosChamado).toBe(true);
    });

    it("deve marcar cacifosConcluido = true e libertar cacifos", async () => {
      // Pré-reservar alguns cacifos para a reserva
      const livres = await testPrisma.cacifo.findMany({
        where: { estado: "LIVRE" },
        take: 2,
      });
      for (const c of livres) {
        await testPrisma.cacifo.update({
          where: { id: c.id },
          data: { estado: "RESERVADO", reservaId: TEST_IDS.RESERVA_EM_CURSO, criancas: "Por preencher" },
        });
      }

      // Verificar que os cacifos estão associados
      const antes = await testPrisma.cacifo.findMany({
        where: { reservaId: TEST_IDS.RESERVA_EM_CURSO },
      });
      expect(antes.length).toBeGreaterThan(0);

      // Marcar como concluído
      const result = await reservaService.actualizarEstadoCacifos(TEST_IDS.RESERVA_EM_CURSO, {
        concluido: true,
      });

      expect(result.cacifosConcluido).toBe(true);

      // Verificar que os cacifos foram libertados
      const depois = await testPrisma.cacifo.findMany({
        where: { reservaId: TEST_IDS.RESERVA_EM_CURSO },
      });
      expect(depois.length).toBe(0);

      // Verificar que os cacifos estão LIVRE
      const libertados = await testPrisma.cacifo.findMany({
        where: { id: { in: antes.map((c) => c.id) } },
      });
      expect(libertados.every((c) => c.estado === "LIVRE")).toBe(true);

      // Reset para outros testes
      await reservaService.actualizarEstadoCacifos(TEST_IDS.RESERVA_EM_CURSO, {
        chamado: false,
        concluido: false,
      });
    });
  });

  describe("toggleReservaExtra()", () => {
    it("deve alternar concluido de false para true e devolver o extra incluído", async () => {
      // RESERVA_EXTRA_1 nasce com concluido: false no seed
      const toggled = await reservaService.toggleReservaExtra(TEST_IDS.RESERVA_EXTRA_1);

      expect(toggled.concluido).toBe(true);
      expect(toggled.extra).toBeDefined();
      expect(toggled.extra.id).toBe(TEST_IDS.EXTRA_1);

      const naDb = await testPrisma.reservaExtra.findUnique({
        where: { id: TEST_IDS.RESERVA_EXTRA_1 },
      });
      expect(naDb?.concluido).toBe(true);
    });

    it("deve alternar concluido de true para false (segundo clique)", async () => {
      // Estado anterior do teste: concluido: true
      const toggled = await reservaService.toggleReservaExtra(TEST_IDS.RESERVA_EXTRA_1);

      expect(toggled.concluido).toBe(false);

      // Restaurar estado do seed para outros testes
      const restaurado = await testPrisma.reservaExtra.update({
        where: { id: TEST_IDS.RESERVA_EXTRA_1 },
        data: { concluido: false },
      });
      expect(restaurado.concluido).toBe(false);
    });

    it("deve lançar EXTRA_NOT_FOUND para id inexistente", async () => {
      await expect(reservaService.toggleReservaExtra("inexistente-xxx")).rejects.toThrow(
        "EXTRA_NOT_FOUND"
      );
    });
  });
});