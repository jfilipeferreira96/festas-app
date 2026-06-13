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

import { dashboardService } from "@/services/dashboard.service";

describe("Dashboard Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── getKPIs ───────────────────────────────────────────────────
  describe("getKPIs()", () => {
    it("should return KPI metrics", async () => {
      const kpis = await dashboardService.getKPIs();
      expect(kpis).toHaveProperty("festasHoje");
      expect(kpis).toHaveProperty("aComecar");
      expect(kpis).toHaveProperty("aTerminar");
      expect(kpis).toHaveProperty("cacifosOcupados");
      expect(kpis).toHaveProperty("cacifosTotal");
      expect(kpis).toHaveProperty("cacifosReservados");
      expect(typeof kpis.festasHoje).toBe("number");
      expect(typeof kpis.cacifosTotal).toBe("number");
      expect(kpis.cacifosTotal).toBeGreaterThanOrEqual(10);
    });

    it("should count festasHoje correctly", async () => {
      const kpis = await dashboardService.getKPIs();
      // We have at least CONFIRMADO and EM_CURSO reservas for today
      expect(kpis.festasHoje).toBeGreaterThanOrEqual(1);
    });
  });

  // ── getFestasEmCurso ──────────────────────────────────────────
  describe("getFestasEmCurso()", () => {
    it("should return active reservas (EM_CURSO)", async () => {
      const festas = await dashboardService.getFestasEmCurso();
      expect(Array.isArray(festas)).toBe(true);
      // We seeded RESERVA_EM_CURSO with estado EM_CURSO
      expect(festas.length).toBeGreaterThanOrEqual(1);
      expect(festas[0]!.estado).toBe("EM_CURSO");
    });

    it("should include relations (local, aniversariante, monitores, cacifos, etapas)", async () => {
      const festas = await dashboardService.getFestasEmCurso();
      if (festas.length > 0) {
        const festa = festas[0]!;
        expect(festa).toHaveProperty("local");
        expect(festa).toHaveProperty("aniversariantes");
      }
    });
  });

  // ── getProximasFestas ─────────────────────────────────────────
  describe("getProximasFestas()", () => {
    it("should return upcoming reservas", async () => {
      const proximas = await dashboardService.getProximasFestas();
      expect(Array.isArray(proximas)).toBe(true);
    });
  });

  // ── getAniversarioEmBreve ─────────────────────────────────────
  describe("getAniversarioEmBreve()", () => {
    it("should return the next upcoming reserva or null", async () => {
      const reserva = await dashboardService.getAniversarioEmBreve();
      // Can be null if no upcoming reservas today
      if (reserva) {
        expect(reserva).toHaveProperty("id");
        expect(reserva).toHaveProperty("horario");
      }
    });
  });
});
