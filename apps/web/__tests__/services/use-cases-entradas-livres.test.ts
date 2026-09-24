import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

import { entradaLivreService } from "@/services/entradaLivre.service";

/**
 * Tarifário determinístico para os use cases (o seed cria a config sem os
 * campos de entrada livre — esses vinham de fallbacks no código). O update
 * é in-place no singleton criado pelo seed; cleanTestData apaga a config no
 * afterAll e a suíte seguinte volta a semear a sua.
 */
const TARIFARIO = {
  precoEntrada1h: 6,
  precoEntrada2h: 10,
  precoEntradaHoraAdicional: 5,
  precoAdulto: 6,
  precoLancheEntrada: 3,
  precoMeias: 1.5,
  precoExcessoFixo: 5,
};

describe("Use cases — Entradas Livres (custos)", () => {
  beforeAll(async () => {
    await seedTestData();
    await testPrisma.configuracaoPreco.updateMany({ data: TARIFARIO });
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  it("UC-E1: criança leva o pai e paga 2 pares de meias — o backend calcula o custo (15,00 €)", async () => {
    // SEM custoTotal no payload: o cálculo é do servidor, não do form.
    const entrada = await entradaLivreService.create({
      criancas: [{ nome: "Tomé UC", idade: 7 }],
      encarregadoNome: "Rui UC",
      encarregadoTelefone: "914000001",
      duracaoMinutos: 60,
      numAdultos: 1,
      meiasQuantidade: 2,
      meiasPrecoUnit: 1.5,
      pago: true,
      pagamentos: [{ valor: 15, metodo: "MBWAY", nota: "Pago à entrada" }],
    });

    // 6 (criança 1h) + 6 (adulto) + 2 × 1,50 (meias) = 15
    expect(Number(entrada.custoTotal)).toBe(15);
    expect(Number(entrada.custoHora)).toBe(6);
    expect(entrada.numAdultos).toBe(1);
    expect(entrada.meiasQuantidade).toBe(2);
    expect(entrada.estado).toBe("ATIVA");
    expect(entrada.pago).toBe(true);
    expect(entrada.criancas).toHaveLength(1);
    expect(entrada.cliente?.nome).toBe("Rui UC");
  });

  it("UC-E2: criança com lanche; no fim valida-se o excesso e os custos finais", async () => {
    const entrada = await entradaLivreService.create({
      criancas: [{ nome: "Alice UC", idade: 5, querLanche: true }],
      encarregadoNome: "Marta UC",
      encarregadoTelefone: "914000002",
      duracaoMinutos: 60,
      temLanche: true,
      pago: true,
      pagamentos: [{ valor: 9, metodo: "MBWAY" }],
    });

    // 6 (entrada 1h) + 3 (lanche) = 9
    expect(Number(entrada.custoTotal)).toBe(9);
    expect(entrada.pago).toBe(true);

    // Fica 30 min além do previsto (simulação do fim real)
    const inicio = new Date(Date.now() - 90 * 60_000);
    await testPrisma.entradaLivre.update({
      where: { id: entrada.id },
      data: { inicioEm: inicio, fimPrevisto: new Date(inicio.getTime() + 60 * 60_000) },
    });

    const concluida = await entradaLivreService.concluir(entrada.id);
    expect(concluida.estado).toBe("CONCLUIDA");
    expect(concluida.excessoMinutos).toBe(30);
    expect(Number(concluida.custoExcesso)).toBe(5); // sugerido do tarifário
    expect(Number(concluida.custoTotalFinal)).toBe(14); // 9 + 5
    // Regressão: com o total final a subir, o ledger (9) já não cobre → Por pagar
    expect(concluida.pago).toBe(false);

    // Liquidar a diferença no balcão → Pago derivado da soma do ledger
    await entradaLivreService.atualizarPagamento(entrada.id, {
      pagamentos: [{ valor: 14, metodo: "DINHEIRO" }],
    });
    const liquidada = await entradaLivreService.getById(entrada.id);
    expect(liquidada.pago).toBe(true);
    expect(liquidada.pagamentos).toHaveLength(1);
  });

  it("UC-E3 (characterization): o custoTotal do form substitui o cálculo do backend", async () => {
    // Documenta o comportamento atual: um custoTotal >= 0 vindo do cliente
    // É GRAVADO TAL E QUAL (risco conhecido — ver entradaLivre.service.ts:343).
    const entrada = await entradaLivreService.create({
      criancas: [{ nome: "Gaspar UC", idade: 9 }],
      encarregadoNome: "Hugo UC",
      encarregadoTelefone: "914000003",
      duracaoMinutos: 120, // cálculo do servidor seria 10
      custoTotal: 999,
      pago: false,
    });

    expect(Number(entrada.custoTotal)).toBe(999);
  });
});
