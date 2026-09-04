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

import { extraService } from "@/services/extra.service";
import { reservaService } from "@/services/reserva.service";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { quantidadeDeExtra, calcularCustoExtras } from "@/lib/extras-custo";

const today = new Date();
const futureDate = new Date(today);
futureDate.setDate(futureDate.getDate() + 10);
const futureStr = futureDate.toISOString().split("T")[0]!;

describe("Extras - quantidade e cobrança por pessoa", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── extra.service: baseCobranca ───────────────────────────────
  describe("extra.service - baseCobranca", () => {
    it("assume POR_UNIDADE por omissão", async () => {
      const extra = await extraService.create({
        nome: "Extra Base Teste",
        precoUnitario: 10,
      });
      expect(extra.baseCobranca).toBe("POR_UNIDADE");
    });

    it("cria com POR_PESSOA quando indicado", async () => {
      const extra = await extraService.create({
        nome: "Extra Pessoa Teste",
        precoUnitario: 3,
        baseCobranca: "POR_PESSOA",
      });
      expect(extra.baseCobranca).toBe("POR_PESSOA");
    });

    it("atualiza baseCobranca", async () => {
      const extra = await extraService.create({
        nome: "Extra Update Teste",
        precoUnitario: 5,
      });
      const updated = await extraService.update(extra.id, {
        baseCobranca: "POR_PESSOA",
      });
      expect(updated.baseCobranca).toBe("POR_PESSOA");
    });

    it("rejeita base de cobrança inválida", async () => {
      await expect(
        extraService.create({
          nome: "Extra Inválido",
          precoUnitario: 5,
          baseCobranca: "POR_HORA" as "POR_UNIDADE",
        })
      ).rejects.toThrow("BASE_COBRANCA_INVALID");
    });
  });

  // ── reserva.service: extrasQuantidades + guard bolo ──────────
  describe("reserva.service - extrasQuantidades e bolo", () => {
    it("persiste quantidade por extra no create", async () => {
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "10:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        extrasIds: [TEST_IDS.EXTRA_1, TEST_IDS.EXTRA_2],
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 3 },
        // EXTRA_2 sem quantidade → 1
      });

      const qtds = new Map(reserva.extras.map((e) => [e.extraId, e.quantidade]));
      expect(qtds.get(TEST_IDS.EXTRA_1)).toBe(3);
      expect(qtds.get(TEST_IDS.EXTRA_2)).toBe(1);
    });

    it("re-sincroniza quantidades no update", async () => {
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "12:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        extrasIds: [TEST_IDS.EXTRA_1],
      });
      expect(reserva.extras[0]!.quantidade).toBe(1);

      const updated = await reservaService.update(reserva.id, {
        extrasIds: [TEST_IDS.EXTRA_1, TEST_IDS.EXTRA_2],
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 2, [TEST_IDS.EXTRA_2]: 5 },
      });
      const qtds = new Map(updated.extras.map((e) => [e.extraId, e.quantidade]));
      expect(qtds.get(TEST_IDS.EXTRA_1)).toBe(2);
      expect(qtds.get(TEST_IDS.EXTRA_2)).toBe(5);
    });

    it("guard boloQuantidade: NOSSO_* sem quantidade → 1", async () => {
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "16:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        bolo: "NOSSO_1KG",
      });
      expect(reserva.boloQuantidade).toBe(1);
    });

    it("guard boloQuantidade: PAIS_TRAZEM limpa a quantidade", async () => {
      const reserva = await reservaService.create({
        data: futureStr,
       
        horario: "20:30",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        bolo: "PAIS_TRAZEM",
        boloQuantidade: 3,
      });
      expect(reserva.boloQuantidade).toBeNull();
    });

    it("guard boloQuantidade no update: mudar para NOSSO_* sem quantidade → 1", async () => {
      const reserva = await reservaService.create({
        data: futureStr,
        horario: "18:00",
        duracaoMinutos: 120,
        localId: TEST_IDS.LOCAL_1,
        clienteId: TEST_IDS.CLIENTE_1,
        bolo: "A_DECIDIR",
      });
      const updated = await reservaService.update(reserva.id, { bolo: "NOSSO_2KG" });
      expect(updated.bolo).toBe("NOSSO_2KG");
      expect(updated.boloQuantidade).toBe(1);
    });
  });

  // ── entradaLivre.service: custoTotal com extras + meias ──────
  describe("entradaLivre.service - custoTotal com extras e meias", () => {
    const baseCreate = {
      criancas: [
        { nome: "Criança A", idade: 6 },
        { nome: "Criança B", idade: 5 },
      ],
      encarregadoNome: "Encarregado Extras",
      encarregadoTelefone: "960000000",
      duracaoMinutos: 60,
      numAdultos: 1, // 3 pessoas no total
      pago: false,
    };

    it("inclui extras (unidade × quantidade + por pessoa × pessoas) e meias no custoTotal", async () => {
      const semExtras = await entradaLivreService.create({ ...baseCreate });
      const comExtras = await entradaLivreService.create({
        ...baseCreate,
        extrasIds: [TEST_IDS.EXTRA_1, TEST_IDS.EXTRA_2], // EXTRA_2 é POR_PESSOA no seed
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 2 }, // 50 × 2 = 100
        meiasQuantidade: 2, // 2 × 2 (precoMeias do seed) = 4
      });

      // EXTRA_2 POR_PESSOA: 30 × 3 pessoas = 90. Total extras+meias = 194
      expect(comExtras.custoTotal - semExtras.custoTotal).toBeCloseTo(194, 2);

      const qtds = new Map(comExtras.extras.map((e) => [e.extraId, e.quantidade]));
      expect(qtds.get(TEST_IDS.EXTRA_1)).toBe(2);
      expect(qtds.get(TEST_IDS.EXTRA_2)).toBe(1);
    });

    it("custoTotal manual prevalece sobre o calculado", async () => {
      const entrada = await entradaLivreService.create({
        ...baseCreate,
        custoTotal: 50,
        extrasIds: [TEST_IDS.EXTRA_1],
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 2 },
      });
      expect(entrada.custoTotal).toBe(50);
    });

    it("recalcula o custo quando os extras mudam no atualizar", async () => {
      const entrada = await entradaLivreService.create({
        ...baseCreate,
        extrasIds: [TEST_IDS.EXTRA_1],
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 2 }, // +100
      });
      const antes = entrada.custoTotal;

      const atualizada = await entradaLivreService.atualizar(entrada.id, {
        extrasIds: [],
      });
      // Remover os extras retira 100€ ao custo
      expect(antes - atualizada.custoTotal).toBeCloseTo(100, 2);
      expect(atualizada.extras).toHaveLength(0);
    });

    it("mantém o custo manual no atualizar quando fornecido", async () => {
      const entrada = await entradaLivreService.create({ ...baseCreate });
      const atualizada = await entradaLivreService.atualizar(entrada.id, {
        extrasIds: [TEST_IDS.EXTRA_1],
        extrasQuantidades: { [TEST_IDS.EXTRA_1]: 1 },
        custoTotal: 77,
      });
      expect(atualizada.custoTotal).toBe(77);
    });
  });

  // ── Helpers puros ────────────────────────────────────────────
  describe("lib/extras-custo (puro)", () => {
    const extras = [
      { id: "a", precoUnitario: 10, baseCobranca: "POR_UNIDADE" as const },
      { id: "b", precoUnitario: 2.5, baseCobranca: "POR_PESSOA" as const },
    ];

    it("quantidadeDeExtra aplica mínimo 1 e arredonda", () => {
      expect(quantidadeDeExtra(undefined, "a")).toBe(1);
      expect(quantidadeDeExtra({ a: 0 }, "a")).toBe(1);
      expect(quantidadeDeExtra({ a: 2.4 }, "a")).toBe(2);
      expect(quantidadeDeExtra({ a: 4 }, "a")).toBe(4);
    });

    it("calcularCustoExtras multiplica POR_PESSOA pelo nº de pessoas", () => {
      const custo = calcularCustoExtras(
        [
          { extraId: "a", quantidade: 3 },
          { extraId: "b", quantidade: 1 },
        ],
        extras,
        8
      );
      // a: 10 × 3 = 30; b: 2.5 × 8 pessoas = 20
      expect(custo).toBeCloseTo(50, 2);
    });

    it("calcularCustoExtras ignora extras desconhecidos", () => {
      expect(calcularCustoExtras([{ extraId: "zzz", quantidade: 5 }], extras, 3)).toBe(0);
    });
  });
});
