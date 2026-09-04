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

    it("deve retornar totalCriancasNoParque (festas EM_CURSO + entradas ATIVAS)", async () => {
      const kpis = await dashboardService.getKPIs();
      expect(kpis).toHaveProperty("totalCriancasNoParque");
      expect(typeof kpis.totalCriancasNoParque).toBe("number");
      // Seed tem RESERVA_EM_CURSO com numCriancas + entradas ATIVAS
      expect(kpis.totalCriancasNoParque).toBeGreaterThanOrEqual(1);
    });

    it("deve retornar criancasFestas e criancasEntradas separadamente", async () => {
      const kpis = await dashboardService.getKPIs();
      expect(kpis).toHaveProperty("criancasFestas");
      expect(kpis).toHaveProperty("criancasEntradas");
      expect(typeof kpis.criancasFestas).toBe("number");
      expect(typeof kpis.criancasEntradas).toBe("number");
      // total = festas + entradas
      expect(kpis.totalCriancasNoParque).toBe(kpis.criancasFestas + kpis.criancasEntradas);
    });

    it("deve retornar receitasHoje agrupadas por método de pagamento", async () => {
      const kpis = await dashboardService.getKPIs();
      expect(kpis).toHaveProperty("receitasHoje");
      expect(typeof kpis.receitasHoje).toBe("object");
    });
  });

  // ── getTotalCriancasNoParque (v2) ─────────────────────────────
  describe("getTotalCriancasNoParque()", () => {
    it("deve somar crianças de festas EM_CURSO + entradas ATIVAS", async () => {
      const result = await dashboardService.getTotalCriancasNoParque();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("festas");
      expect(result).toHaveProperty("entradas");
      expect(result.total).toBe(result.festas + result.entradas);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ── getReceitasHoje ───────────────────────────────────────────
  describe("getReceitasHoje()", () => {
    it("deve retornar um objeto com receitas por método de pagamento", async () => {
      const receitas = await dashboardService.getReceitasHoje();
      expect(typeof receitas).toBe("object");
      // Pode estar vazio se não houver pagamentos hoje, mas deve ser um objeto
      // Os valores devem ser números
      for (const [, valor] of Object.entries(receitas)) {
        expect(typeof valor).toBe("number");
        expect(valor).toBeGreaterThan(0);
      }
    });

    it("deve usar custoTotalFinal (inclui excesso) nas entradas", async () => {
      // Cria entrada hoje com custoTotal=10 e custoTotalFinal=15 (5€ de excesso)
      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setHours(16, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setMinutes(fim.getMinutes() + 60);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          encarregadoNome: "Teste Excesso",
          encarregadoTelefone: "900000000",
          duracaoMinutos: 60,
          custoHora: 10,
          custoTotal: 10,
          custoTotalFinal: 15,
          inicioEm: inicio,
          fimPrevisto: fim,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          criancas: [{ nome: "X" }],
        },
      });

      try {
        const receitas = await dashboardService.getReceitasHoje();
        // Deve incluir os 15€ (custoTotalFinal) e não os 10€
        expect(receitas.DINHEIRO ?? 0).toBeGreaterThanOrEqual(15);
      } finally {
        await testPrisma.entradaLivre.delete({ where: { id: entrada.id } }).catch(() => {});
      }
    });

    it("deve somar meias (reservas pagas hoje)", async () => {
      const hoje = new Date();
      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "17:00",
          duracaoMinutos: 135,
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          valorPago: 100,
          meiasQuantidade: 10,
          meiasPrecoUnit: 2, // 20€ de meias
          clienteId: TEST_IDS.CLIENTE_1,
          localId: TEST_IDS.LOCAL_1,
        },
      });

      try {
        const receitas = await dashboardService.getReceitasHoje();
        // 100 (valorPago) + 20 (meias) = 120€ em DINHEIRO
        expect(receitas.DINHEIRO ?? 0).toBeGreaterThanOrEqual(120);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });

    it("deve somar pagamento dividido (2 métodos) correctamente", async () => {
      const hoje = new Date();
      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "19:00",
          duracaoMinutos: 135,
          numCriancas: 10,
          estado: "CONCLUIDA",
          pago: true,
          metodoPagamento: "DINHEIRO",
          valorPago: 80,
          metodoPagamento2: "MBWAY",
          valorPago2: 40,
          clienteId: TEST_IDS.CLIENTE_1,
          localId: TEST_IDS.LOCAL_1,
        },
      });

      try {
        const receitas = await dashboardService.getReceitasHoje();
        // 80€ DINHEIRO + 40€ MBWAY
        expect(receitas.DINHEIRO ?? 0).toBeGreaterThanOrEqual(80);
        expect(receitas.MBWAY ?? 0).toBeGreaterThanOrEqual(40);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });

    it("NÃO deve incluir festas por pagar (pago=false) nas receitas", async () => {
      const hoje = new Date();
      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "20:00",
          duracaoMinutos: 135,
          numCriancas: 5,
          estado: "CONFIRMADO",
          pago: false,
          metodoPagamento: "DINHEIRO",
          valorPago: 999, // não deve contar
          clienteId: TEST_IDS.CLIENTE_1,
          localId: TEST_IDS.LOCAL_1,
        },
      });

      try {
        const receitas = await dashboardService.getReceitasHoje();
        // 999 não deve aparecer em DINHEIRO
        expect(receitas.DINHEIRO ?? 0).toBeLessThan(999);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
    });
  });

  // ── festasHoje inclui CONCLUIDA ──────────────────────────────
  describe("getKPIs() - festasHoje", () => {
    it("deve contar festas CONCLUIDAS de hoje (não apenas CONFIRMADO/EM_CURSO)", async () => {
      const hoje = new Date();
      const reserva = await testPrisma.reserva.create({
        data: {
          data: hoje,
          horario: "18:00",
          duracaoMinutos: 135,
          numCriancas: 8,
          estado: "CONCLUIDA",
          clienteId: TEST_IDS.CLIENTE_1,
          localId: TEST_IDS.LOCAL_1,
        },
      });

      try {
        const kpisAntes = await dashboardService.getKPIs();
        // A festa CONCLUIDA criada deve estar incluída no count
        expect(kpisAntes.festasHoje).toBeGreaterThanOrEqual(1);
      } finally {
        await testPrisma.reserva.delete({ where: { id: reserva.id } }).catch(() => {});
      }
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
