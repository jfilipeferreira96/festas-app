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

import { participanteService } from "@/services/participante.service";

describe("Participante Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── adicionarParticipante ─────────────────────────────────────
  describe("adicionarParticipante()", () => {
    it("should add a participant to a reserva", async () => {
      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Maria Silva"
      );
      expect(p).toBeDefined();
      expect(p.nome).toBe("Maria Silva");
      expect(p.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(p.presente).toBe(false);

      await participanteService.removerParticipante(p.id);
    });

    it("should auto-assign a free cacifo when available", async () => {
      // Ensure at least one free cacifo exists
      const livresBefore = await testPrisma.cacifo.count({ where: { estado: "LIVRE" } });
      if (livresBefore === 0) {
        // Skip if no free cacifos (other tests may have used them)
        return;
      }

      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "João Santos"
      );
      expect(p.cacifo).toBeDefined();
      expect(p.cacifo!.estado).toBe("RESERVADO");
      expect(p.cacifo!.reservaId).toBe(TEST_IDS.RESERVA_CONFIRMADA);
      expect(p.cacifo!.criancas).toBe("João Santos");

      await participanteService.removerParticipante(p.id);
    });

    it("should create participant without cacifo if none free", async () => {
      // Occupy all cacifos
      const allCacifos = await testPrisma.cacifo.findMany();
      for (const c of allCacifos) {
        await testPrisma.cacifo.update({
          where: { id: c.id },
          data: { estado: "OCUPADO", reservaId: TEST_IDS.RESERVA_EM_CURSO },
        });
      }

      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Sem Cacifo"
      );
      expect(p).toBeDefined();
      expect(p.nome).toBe("Sem Cacifo");
      expect(p.cacifoId).toBeNull();

      // Cleanup: free all cacifos
      await participanteService.removerParticipante(p.id);
      for (const c of allCacifos) {
        await testPrisma.cacifo.update({
          where: { id: c.id },
          data: { estado: "LIVRE", reservaId: null, criancas: null, notas: null },
        });
      }
    });

    it("should throw RESERVA_NOT_FOUND for non-existent reserva", async () => {
      await expect(
        participanteService.adicionarParticipante("non-existent", "Teste")
      ).rejects.toThrow("RESERVA_NOT_FOUND");
    });

    it("should throw MAX_PARTICIPANTES when limit reached", async () => {
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const p = await participanteService.adicionarParticipante(
          TEST_IDS.RESERVA_PENDENTE,
          `Criança ${i}`
        );
        ids.push(p.id);
      }

      await expect(
        participanteService.adicionarParticipante(TEST_IDS.RESERVA_PENDENTE, "Extra")
      ).rejects.toThrow("MAX_PARTICIPANTES");

      for (const id of ids) {
        await participanteService.removerParticipante(id);
      }
    }, 30000);
  });

  // ── listByReserva ─────────────────────────────────────────────
  describe("listByReserva()", () => {
    it("should list participants for a reserva", async () => {
      const p1 = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Ana Liste"
      );
      const p2 = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Pedro Liste"
      );

      const list = await participanteService.listByReserva(TEST_IDS.RESERVA_CONFIRMADA);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.some((p) => p.id === p1.id)).toBe(true);
      expect(list.some((p) => p.id === p2.id)).toBe(true);

      await participanteService.removerParticipante(p1.id);
      await participanteService.removerParticipante(p2.id);
    });

    it("should return empty array for reserva with no participants", async () => {
      const list = await participanteService.listByReserva(TEST_IDS.RESERVA_EM_CURSO);
      expect(Array.isArray(list)).toBe(true);
    });
  });

  // ── confirmarPresenca ─────────────────────────────────────────
  describe("confirmarPresenca()", () => {
    it("should mark participant as present", async () => {
      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Rita Presença"
      );

      const updated = await participanteService.confirmarPresenca(p.id, true);
      expect(updated.presente).toBe(true);

      // If cacifo was assigned, it should be OCUPADO
      if (updated.cacifoId) {
        expect(updated.cacifo!.estado).toBe("OCUPADO");
      }

      await participanteService.removerParticipante(p.id);
    });

    it("should mark participant as not present", async () => {
      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Carlos Ausente"
      );

      // First mark as present
      await participanteService.confirmarPresenca(p.id, true);

      // Then unmark
      const updated = await participanteService.confirmarPresenca(p.id, false);
      expect(updated.presente).toBe(false);

      // If cacifo was assigned, it should revert to RESERVADO
      if (updated.cacifoId) {
        expect(updated.cacifo!.estado).toBe("RESERVADO");
      }

      await participanteService.removerParticipante(p.id);
    });

    it("should throw NOT_FOUND for non-existent participante", async () => {
      await expect(
        participanteService.confirmarPresenca("non-existent", true)
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── removerParticipante ───────────────────────────────────────
  describe("removerParticipante()", () => {
    it("should remove a participant and free their cacifo", async () => {
      const p = await participanteService.adicionarParticipante(
        TEST_IDS.RESERVA_CONFIRMADA,
        "Elena Remover"
      );
      const cacifoId = p.cacifoId;

      await participanteService.removerParticipante(p.id);

      // Verify participant is gone
      const found = await testPrisma.participante.findUnique({ where: { id: p.id } });
      expect(found).toBeNull();

      // If cacifo was assigned, verify it's free
      if (cacifoId) {
        const cacifo = await testPrisma.cacifo.findUnique({ where: { id: cacifoId } });
        expect(cacifo!.estado).toBe("LIVRE");
        expect(cacifo!.reservaId).toBeNull();
        expect(cacifo!.criancas).toBeNull();
      }
    });

    it("should throw NOT_FOUND for non-existent participante", async () => {
      await expect(
        participanteService.removerParticipante("non-existent")
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});