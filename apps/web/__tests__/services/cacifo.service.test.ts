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

import { cacifoService } from "@/services/cacifo.service";

describe("Cacifo Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all cacifos ordered by numero", async () => {
      const cacifos = await cacifoService.list();
      expect(cacifos.length).toBeGreaterThanOrEqual(10);
      for (let i = 1; i < cacifos.length; i++) {
        expect(cacifos[i]!.numero).toBeGreaterThanOrEqual(cacifos[i - 1]!.numero);
      }
    });

    it("should filter by estado LIVRE", async () => {
      const cacifos = await cacifoService.list({ estado: "LIVRE" });
      expect(cacifos.length).toBeGreaterThanOrEqual(1);
      expect(cacifos.every((c: { estado: string }) => c.estado === "LIVRE")).toBe(true);
    });

    it("should filter by reservaId", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;
      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_EM_CURSO);

      const cacifos = await cacifoService.list({ reservaId: TEST_IDS.RESERVA_EM_CURSO });
      expect(cacifos.length).toBeGreaterThanOrEqual(1);
      expect(cacifos.every((c: { reservaId: string | null }) => c.reservaId === TEST_IDS.RESERVA_EM_CURSO)).toBe(true);

      await cacifoService.libertar(cacifo.id);
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return a cacifo by ID", async () => {
      const [cacifo] = await cacifoService.list();
      const found = await cacifoService.getById(cacifo!.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(cacifo!.id);
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(cacifoService.getById("non-existent")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── getDisponiveis ────────────────────────────────────────────
  describe("getDisponiveis()", () => {
    it("should return only free cacifos", async () => {
      const disponiveis = await cacifoService.getDisponiveis();
      expect(disponiveis.length).toBeGreaterThanOrEqual(1);
      expect(disponiveis.every((c: { estado: string }) => c.estado === "LIVRE")).toBe(true);
    });
  });

  // ── marcarOcupado ─────────────────────────────────────────────
  describe("marcarOcupado()", () => {
    it("should mark a free cacifo as occupied", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      const updated = await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA);
      expect(updated.estado).toBe("OCUPADO");
      expect(updated.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);

      await cacifoService.libertar(cacifo.id);
    });

    it("should mark a cacifo as occupied with notas and criancas", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      const updated = await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA, {
        notas: "Cacifo da Maria",
        criancas: "Maria, João",
      });
      expect(updated.estado).toBe("OCUPADO");
      expect(updated.notas).toBe("Cacifo da Maria");
      expect(updated.criancas).toBe("Maria, João");

      await cacifoService.libertar(cacifo.id);
    });

    it("should throw ALREADY_OCCUPIED if already occupied", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA);

      await expect(
        cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA)
      ).rejects.toThrow("ALREADY_OCCUPIED");

      await cacifoService.libertar(cacifo.id);
    });
  });

  // ── libertar ──────────────────────────────────────────────────
  describe("libertar()", () => {
    it("should release an occupied cacifo", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA, {
        notas: "Teste",
        criancas: "Criança 1",
      });
      const released = await cacifoService.libertar(cacifo.id);
      expect(released.estado).toBe("LIVRE");
      expect(released.reservaId).toBeNull();
      expect(released.notas).toBeNull();
      expect(released.criancas).toBeNull();
    });

    it("should throw CANNOT_RELEASE_FREE if already free", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;
      await expect(cacifoService.libertar(cacifo.id)).rejects.toThrow("CANNOT_RELEASE_FREE");
    });
  });

  // ── marcarReservado ───────────────────────────────────────────
  describe("marcarReservado()", () => {
    it("should mark a free cacifo as reserved", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      const updated = await cacifoService.marcarReservado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA, {
        notas: "Reservado para festa",
      });
      expect(updated.estado).toBe("RESERVADO");
      expect(updated.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(updated.notas).toBe("Reservado para festa");

      await cacifoService.libertar(cacifo.id);
    });
  });

  // ── actualizarCacifo ──────────────────────────────────────────
  describe("actualizarCacifo()", () => {
    it("should update notas and criancas on a cacifo", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_CONFIRMADA);

      const updated = await cacifoService.actualizarCacifo(cacifo.id, {
        notas: "Notas actualizadas",
        criancas: "Ana, Pedro",
      });
      expect(updated.notas).toBe("Notas actualizadas");
      expect(updated.criancas).toBe("Ana, Pedro");

      await cacifoService.libertar(cacifo.id);
    });
  });

  // ── atribuirCacifos ───────────────────────────────────────────
  describe("atribuirCacifos()", () => {
    it("should assign multiple cacifos to a reserva", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo1 = livres[0]!;
      const cacifo2 = livres[1]!;

      const result = await cacifoService.atribuirCacifos(TEST_IDS.RESERVA_EM_CURSO, [
        { id: cacifo1.id, notas: "Cacifo 1", criancas: "Criança A" },
        { id: cacifo2.id },
      ]);

      expect(result.length).toBe(2);
      expect(result[0]!.estado).toBe("RESERVADO");
      expect(result[0]!.reservaId).toBe(TEST_IDS.RESERVA_EM_CURSO);
      expect(result[0]!.notas).toBe("Cacifo 1");
      expect(result[1]!.reservaId).toBe(TEST_IDS.RESERVA_EM_CURSO);

      await cacifoService.libertar(cacifo1.id);
      await cacifoService.libertar(cacifo2.id);
    });
  });

  // ── libertarCacifosDaReserva ──────────────────────────────────
  describe("libertarCacifosDaReserva()", () => {
    it("should release all cacifos for a given reserva", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo1 = livres[0]!;
      const cacifo2 = livres[1]!;

      await cacifoService.atribuirCacifos(TEST_IDS.RESERVA_CONFIRMADA, [
        { id: cacifo1.id },
        { id: cacifo2.id },
      ]);

      await cacifoService.libertarCacifosDaReserva(TEST_IDS.RESERVA_CONFIRMADA);

      const c1 = await testPrisma.cacifo.findUnique({ where: { id: cacifo1.id } });
      const c2 = await testPrisma.cacifo.findUnique({ where: { id: cacifo2.id } });
      expect(c1?.estado).toBe("LIVRE");
      expect(c1?.reservaId).toBeNull();
      expect(c2?.estado).toBe("LIVRE");
      expect(c2?.reservaId).toBeNull();
    });
  });

  // ── getDisponiveisParaFesta (v2) ───────────────────────────────
  describe("getDisponiveisParaFesta()", () => {
    it("deve incluir cacifos LIVRE + cacifos da reserva indicada", async () => {
      const livres = await cacifoService.getDisponiveisParaFesta();
      expect(livres.length).toBeGreaterThan(0);
      expect(livres.every((c: { estado: string }) => c.estado === "LIVRE")).toBe(true);

      // Marcar um cacifo para a reserva e verificar que aparece na lista filtrada
      const cacifo = await cacifoService.getDisponiveis();
      const c = cacifo[0]!;
      await cacifoService.marcarReservado(c.id, TEST_IDS.RESERVA_CONFIRMADA);

      const paraFesta = await cacifoService.getDisponiveisParaFesta(TEST_IDS.RESERVA_CONFIRMADA);
      const ids = paraFesta.map((cc: { id: string }) => cc.id);
      expect(ids).toContain(c.id);

      // Cleanup
      await cacifoService.libertar(c.id);
    });
  });

  // ── libertar mantém histórico (v2) ────────────────────────────
  describe("libertar() mantém histórico", () => {
    it("deve preservar histórico ao libertar cacifo ocupado", async () => {
      const livres = await cacifoService.getDisponiveis();
      const cacifo = livres[0]!;

      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_EM_CURSO, {
        notas: "Teste histórico",
        criancas: "Criança X",
      });

      await cacifoService.libertar(cacifo.id);

      // O cacifo deve estar LIVRE mas o histórico deve conter a entrada
      const historico = await cacifoService.getHistorico(cacifo.id);
      expect(Array.isArray(historico)).toBe(true);
      expect(historico.length).toBeGreaterThanOrEqual(1);
      const ultima = historico[historico.length - 1];
      expect(ultima.reservaId).toBe(TEST_IDS.RESERVA_EM_CURSO);
    });
  });

  // ── getContadores ─────────────────────────────────────────────
  describe("getContadores()", () => {
    it("should return counts by estado", async () => {
      const contadores = await cacifoService.getContadores();
      expect(contadores).toHaveProperty("livres");
      expect(contadores).toHaveProperty("ocupados");
      expect(contadores).toHaveProperty("reservados");
      expect(contadores).toHaveProperty("total");
      expect(contadores.total).toBeGreaterThanOrEqual(10);
      expect(
        contadores.livres + contadores.ocupados + contadores.reservados
      ).toBe(contadores.total);
    });
  });

  // ── preReservarCacifos ────────────────────────────────────────
  describe("preReservarCacifos()", () => {
    it("deve reservar N cacifos LIVRE → RESERVADO com 'Por preencher'", async () => {
      const result = await cacifoService.preReservarCacifos(TEST_IDS.RESERVA_CONFIRMADA, 3);

      expect(result.reservados.length).toBe(3);
      expect(result.indisponiveis).toBe(0);

      for (const cacifo of result.reservados) {
        expect(cacifo.estado).toBe("RESERVADO");
        expect(cacifo.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
        expect(cacifo.criancas).toBe("Por preencher");
      }

      // Cleanup
      await cacifoService.libertarCacifosDaReserva(TEST_IDS.RESERVA_CONFIRMADA);
    });

    it("não deve fazer throw se faltarem cacifos livres", async () => {
      const contadores = await cacifoService.getContadores();
      const quantidade = contadores.livres + 100; // Mais do que disponível

      const result = await cacifoService.preReservarCacifos(TEST_IDS.RESERVA_CONFIRMADA, quantidade);

      expect(result.indisponiveis).toBeGreaterThan(0);
      expect(result.reservados.length).toBe(contadores.livres);

      // Cleanup
      await cacifoService.libertarCacifosDaReserva(TEST_IDS.RESERVA_CONFIRMADA);
    });
  });

  // ── adicionarCacifoAReserva ───────────────────────────────────
  describe("adicionarCacifoAReserva()", () => {
    it("deve encontrar o próximo cacifo livre quando cacifoId não é fornecido", async () => {
      const cacifo = await cacifoService.adicionarCacifoAReserva(TEST_IDS.RESERVA_CONFIRMADA);

      expect(cacifo.estado).toBe("RESERVADO");
      expect(cacifo.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(cacifo.criancas).toBe("Por preencher");

      // Cleanup
      await cacifoService.libertar(cacifo.id);
    });

    it("deve marcar um cacifo específico quando cacifoId é fornecido", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifoAlvo = livres[0]!;

      const cacifo = await cacifoService.adicionarCacifoAReserva(TEST_IDS.RESERVA_CONFIRMADA, cacifoAlvo.id);

      expect(cacifo.id).toBe(cacifoAlvo.id);
      expect(cacifo.estado).toBe("RESERVADO");
      expect(cacifo.criancas).toBe("Por preencher");

      // Cleanup
      await cacifoService.libertar(cacifo.id);
    });

    it("deve throw CACIFO_NOT_AVAILABLE se o cacifo não estiver LIVRE", async () => {
      const livres = await cacifoService.list({ estado: "LIVRE" });
      const cacifo = livres[0]!;

      // Ocupar primeiro
      await cacifoService.marcarOcupado(cacifo.id, TEST_IDS.RESERVA_EM_CURSO);

      await expect(
        cacifoService.adicionarCacifoAReserva(TEST_IDS.RESERVA_CONFIRMADA, cacifo.id)
      ).rejects.toThrow("CACIFO_NOT_AVAILABLE");

      // Cleanup
      await cacifoService.libertar(cacifo.id);
    });
  });
});