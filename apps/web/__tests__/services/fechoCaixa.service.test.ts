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

import { fechoCaixaService } from "@/services/fechoCaixa.service";

describe("Fecho de Caixa Service", () => {
  let diaFesta: string;

  beforeAll(async () => {
    await seedTestData();
    // Derivar o dia da reserva confirmada (split MBWAY 50 + MULTIBANCO 240)
    // a partir do valor armazenado — evita flakiness de fuso horário.
    const reserva = await testPrisma.reserva.findUnique({
      where: { id: TEST_IDS.RESERVA_CONFIRMADA },
      select: { data: true },
    });
    diaFesta = reserva!.data.toISOString().split("T")[0];
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  }, 60000);

  describe("getFechoCaixa()", () => {
    it("deve agregar o pagamento dividido nos dois métodos (split)", async () => {
      const fecho = await fechoCaixaService.getFechoCaixa(diaFesta);

      // Seed: MBWAY 50 + MULTIBANCO 240 na reserva confirmada (paga)
      expect(fecho.porMetodo.MBWAY).toBeGreaterThanOrEqual(50);
      expect(fecho.porMetodo.MULTIBANCO).toBeGreaterThanOrEqual(240);
    }, 30000);

    it("numerário = DINHEIRO e eletrónico = total − numerário", async () => {
      const fecho = await fechoCaixaService.getFechoCaixa(diaFesta);

      const somaMetodos =
        fecho.porMetodo.DINHEIRO +
        fecho.porMetodo.MULTIBANCO +
        fecho.porMetodo.TRANSFERENCIA +
        fecho.porMetodo.MBWAY +
        fecho.porMetodo.CARTAO +
        fecho.porMetodo.OUTRO;

      expect(fecho.numerario).toBe(fecho.porMetodo.DINHEIRO);
      expect(fecho.total).toBeCloseTo(Math.round(somaMetodos * 100) / 100, 2);
      expect(fecho.eletronico).toBeCloseTo(
        Math.round((somaMetodos - fecho.porMetodo.DINHEIRO) * 100) / 100,
        2
      );
    }, 30000);

    it("dia sem movimento devolve zeros", async () => {
      const fecho = await fechoCaixaService.getFechoCaixa("2000-01-01");

      expect(fecho.total).toBe(0);
      expect(fecho.numerario).toBe(0);
      expect(fecho.eletronico).toBe(0);
      expect(fecho.ajustes).toHaveLength(0);
      expect(fecho.ajustesLiquido).toBe(0);
    }, 30000);

    it("deve listar os ajustes do dia para auditoria (ACRESCIMO do seed)", async () => {
      const fecho = await fechoCaixaService.getFechoCaixa(diaFesta);

      // Seed cria um ACRESCIMO de 10€ (DINHEIRO) na reserva confirmada
      const acrescimo = fecho.ajustes.find(
        (a) => a.tipo === "ACRESCIMO" && a.reservaId === TEST_IDS.RESERVA_CONFIRMADA
      );
      expect(acrescimo).toBeDefined();
      expect(acrescimo!.valor).toBe(10);
      expect(acrescimo!.metodoPagamento).toBe("DINHEIRO");
      expect(fecho.ajustesLiquido).toBeGreaterThanOrEqual(10);
    }, 30000);

    it("detalhe.festas inclui o valor da reserva paga do dia", async () => {
      const fecho = await fechoCaixaService.getFechoCaixa(diaFesta);

      expect(fecho.detalhe.festas).toBeGreaterThanOrEqual(290); // 50 + 240
    }, 30000);

    it("deve lançar DATA_INVALIDA para data inválida", async () => {
      await expect(fechoCaixaService.getFechoCaixa("nao-e-data")).rejects.toThrow("DATA_INVALIDA");
    });

    it("deve lançar UNAUTHORIZED para utilizador não-admin", async () => {
      await expect(
        fechoCaixaService.getFechoCaixa(diaFesta, { id: "u1", funcao: "LANCHE" })
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
