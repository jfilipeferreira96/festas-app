import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";
import {
  normalizarPagamentos,
  sincronizarPagamentosReserva,
  sincronizarPagamentosEntradaLivre,
  somaPagamentos,
} from "@/services/pagamento.service";

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

// IDs próprios deste ficheiro (a BD de teste é recriada a cada run)
const R1 = "test-pg-reserva-001";
const E1 = "test-pg-entrada-001";

describe("pagamentoService (ledger de pagamentos)", () => {
  beforeAll(async () => {
    await seedTestData();
    await testPrisma.pagamento.deleteMany().catch(() => {});

    // Reserva de teste: total acordado 100€, sem pagamentos
    await testPrisma.reserva.deleteMany({ where: { id: R1 } }).catch(() => {});
    await testPrisma.reserva.create({
      data: {
        id: R1,
        data: new Date(),
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        valorTotal: 100,
      },
    });

    // Entrada livre de teste: custo 20€
    await testPrisma.entradaLivre.deleteMany({ where: { id: E1 } }).catch(() => {});
    const inicio = new Date();
    await testPrisma.entradaLivre.create({
      data: {
        id: E1,
        criancas: [{ nome: "Criança Ledger" }],
        encarregadoNome: "Enc Ledger",
        encarregadoTelefone: "900000001",
        duracaoMinutos: 60,
        custoHora: 6,
        custoTotal: 20,
        inicioEm: inicio,
        fimPrevisto: new Date(inicio.getTime() + 60 * 60_000),
      },
    });
  });

  afterAll(async () => {
    await testPrisma.pagamento.deleteMany().catch(() => {});
    await testPrisma.entradaLivre.deleteMany({ where: { id: E1 } }).catch(() => {});
    await testPrisma.reserva.deleteMany({ where: { id: R1 } }).catch(() => {});
    await cleanTestData();
  });

  // ── normalizarPagamentos ──────────────────────────────────────
  describe("normalizarPagamentos()", () => {
    it("undefined = sem alterações", () => {
      expect(normalizarPagamentos(undefined)).toBeUndefined();
    });

    it("null = limpar ledger (lista vazia)", () => {
      expect(normalizarPagamentos(null)).toEqual([]);
    });

    it("valida valor > 0 e arredonda a 2 casas", () => {
      const r = normalizarPagamentos([{ valor: 10.004, metodo: "DINHEIRO" }]);
      expect(r).toHaveLength(1);
      expect(r![0].valor).toBe(10);
    });

    it("lança PAGAMENTO_VALOR_INVALIDO para valor <= 0", () => {
      expect(() => normalizarPagamentos([{ valor: 0, metodo: "DINHEIRO" }])).toThrow(
        "PAGAMENTO_VALOR_INVALIDO"
      );
      expect(() => normalizarPagamentos([{ valor: -5, metodo: "DINHEIRO" }])).toThrow(
        "PAGAMENTO_VALOR_INVALIDO"
      );
    });

    it("lança PAGAMENTO_METODO_OBRIGATORIO sem método válido", () => {
      expect(() => normalizarPagamentos([{ valor: 10, metodo: "" as never }])).toThrow(
        "PAGAMENTO_METODO_OBRIGATORIO"
      );
      expect(() => normalizarPagamentos([{ valor: 10, metodo: "NIF" as never }])).toThrow(
        "PAGAMENTO_METODO_OBRIGATORIO"
      );
    });

    it("preserva referencia e nota (null quando ausentes)", () => {
      const r = normalizarPagamentos([{ valor: 10, metodo: "MBWAY" }]);
      expect(r![0].referencia).toBeNull();
      expect(r![0].nota).toBeNull();
    });
  });

  // ── sincronizarPagamentosReserva ──────────────────────────────
  describe("sincronizarPagamentosReserva()", () => {
    it("replace-all: cria ledger e deriva pago=true (soma >= total)", async () => {
      const total = await sincronizarPagamentosReserva(testPrisma, R1, [
        { valor: 60, metodo: "DINHEIRO" },
        { valor: 40, metodo: "MBWAY" },
      ]);

      expect(total).toBe(100);

      const pagamentos = await testPrisma.pagamento.findMany({
        where: { reservaId: R1 },
        orderBy: { createdAt: "asc" },
      });
      expect(pagamentos).toHaveLength(2);
      expect(pagamentos[0].metodo).toBe("DINHEIRO");
      expect(pagamentos[1].metodo).toBe("MBWAY");

      const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: R1 } });
      // pago derivado: soma (100) >= valorTotal (100)
      expect(reserva.pago).toBe(true);
    });

    it("pagamento parcial: pago=false e falta a dever", async () => {
      await sincronizarPagamentosReserva(testPrisma, R1, [{ valor: 30, metodo: "MBWAY" }]);

      const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: R1 } });
      expect(reserva.pago).toBe(false);

      const pagamentos = await testPrisma.pagamento.findMany({ where: { reservaId: R1 } });
      expect(pagamentos).toHaveLength(1); // replace-all: a entrada antiga foi removida
    });

    it("limpar ledger ([]): pago=false", async () => {
      await sincronizarPagamentosReserva(testPrisma, R1, []);

      const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: R1 } });
      expect(reserva.pago).toBe(false);
      const pagamentos = await testPrisma.pagamento.findMany({ where: { reservaId: R1 } });
      expect(pagamentos).toHaveLength(0);
    });

    it("pagoExplícito tem prioridade sobre a derivação", async () => {
      const total = await sincronizarPagamentosReserva(testPrisma, R1, [], { pagoExplicito: true });
      expect(total).toBe(0);
      const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: R1 } });
      expect(reserva.pago).toBe(true);

      // Restaurar estado derivado para os testes seguintes
      await sincronizarPagamentosReserva(testPrisma, R1, [{ valor: 100, metodo: "DINHEIRO" }]);
    });
  });

  // ── sincronizarPagamentosEntradaLivre ─────────────────────────
  describe("sincronizarPagamentosEntradaLivre()", () => {
    it("cria ledger e deriva pago quando atinge o custo", async () => {
      const total = await sincronizarPagamentosEntradaLivre(testPrisma, E1, [
        { valor: 12, metodo: "MULTIBANCO" },
        { valor: 8, metodo: "DINHEIRO" },
      ]);
      expect(total).toBe(20);

      const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({ where: { id: E1 } });
      expect(entrada.pago).toBe(true);

      const pagamentos = await testPrisma.pagamento.findMany({
        where: { entradaLivreId: E1 },
        orderBy: { createdAt: "asc" },
      });
      expect(pagamentos).toHaveLength(2);
      expect(pagamentos[0].metodo).toBe("MULTIBANCO");
    });

    it("parcial: pago=false; usa custoTotalFinal quando existe", async () => {
      await testPrisma.entradaLivre.update({ where: { id: E1 }, data: { custoTotalFinal: 25 } });

      await sincronizarPagamentosEntradaLivre(testPrisma, E1, [{ valor: 10, metodo: "DINHEIRO" }]);

      const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({ where: { id: E1 } });
      expect(entrada.pago).toBe(false); // 10 < 25 (custoTotalFinal)
    });

    it("pagoExplícito preservado (compatibilidade com chamadas existentes)", async () => {
      const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({ where: { id: E1 } });
      expect(entrada.pago).toBe(false);

      await sincronizarPagamentosEntradaLivre(testPrisma, E1, [], { pagoExplicito: true });
      const atualizada = await testPrisma.entradaLivre.findUniqueOrThrow({ where: { id: E1 } });
      expect(atualizada.pago).toBe(true);
    });
  });

  // ── somaPagamentos ────────────────────────────────────────────
  describe("somaPagamentos()", () => {
    it("soma valores (aceita Decimal serializado como string)", () => {
      expect(somaPagamentos([{ valor: 10 }, { valor: "30.5" }, { valor: null }])).toBe(40.5);
      expect(somaPagamentos([])).toBe(0);
    });
  });

  // ── Integração com reserva.service (payload pagamentos[] → ledger) ──
  describe("integração: create() com pagamentos[] cria entradas no ledger", () => {
    it("reserva criada com 2 pagamentos tem 2 entradas no ledger e pago derivado", async () => {
      const { reservaService } = await import("@/services/reserva.service");
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 10);
      const reserva = await reservaService.create({
        data: futuro.toISOString().split("T")[0]!,
        horario: "15:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        aniversariantes: [
          {
            nome: "Criança Ledger Integração",
            dataNascimento: "2018-05-15",
            encarregadoNome: "Enc Ledger",
            encarregadoEmail: "enc-ledger@test.com",
            encarregadoTelefone: "918888888",
          },
        ],
        valorTotal: 150,
        pagamentos: [
          { valor: 100, metodo: "DINHEIRO" },
          { valor: 50, metodo: "MBWAY" },
        ],
      });

      const noLedger = await testPrisma.pagamento.findMany({
        where: { reservaId: reserva.id },
        orderBy: { createdAt: "asc" },
      });
      expect(noLedger).toHaveLength(2);
      expect(Number(noLedger[0].valor)).toBe(100);
      expect(Number(noLedger[1].valor)).toBe(50);

      // Estado pago derivado: soma (150) >= valorTotal (150)
      expect(reserva.pago).toBe(true);

      // Limpeza (fora do cleanTestData, ID gerado)
      await testPrisma.reserva.delete({ where: { id: reserva.id } });
    });
  });
});
