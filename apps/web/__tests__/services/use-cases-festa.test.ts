import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

// Email fire-and-forget - nunca no caminho dos use cases
vi.mock("@/services/email.service", () => ({
  enfileirarEmailConfirmacaoReserva: vi.fn(async () => undefined),
}));

import { reservaService } from "@/services/reserva.service";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";

/**
 * Tarifário determinístico para os use cases (in-place no singleton do seed;
 * cleanTestData apaga a config no afterAll e a suíte seguinte volta a semear).
 */
const TARIFARIO = {
  precoCriancaSemana: 15,
  precoCriancaFimSemana: 20,
  precoMeias: 1.5,
  precoExcessoFixo: 5,
  caucaoDefault: 50,
};

/** Data futura (>= +60 dias) normalizada para o dia da semana pretendido. */
function dataFutura(diasMinimos: number, diaSemana: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasMinimos);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DATA_QUARTA = dataFutura(60, 3); // 4ª-feira (tarifa de semana)
const DATA_SABADO = dataFutura(60, 6); // sábado (tarifa de FDS)
const USER_ADMIN = { id: TEST_IDS.USER_ADMIN, name: "Admin" };

function aniversariante(emailUnico: string) {
  return [
    {
      nome: "Bebela UC",
      dataNascimento: "2019-04-10",
      encarregadoNome: "Pai UC",
      encarregadoEmail: emailUnico,
      encarregadoTelefone: "915000001",
    },
  ];
}

describe("Use cases — Festas (custos)", () => {
  beforeAll(async () => {
    await seedTestData();
    await testPrisma.configuracaoPreco.updateMany({ data: TARIFARIO });
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  it("UC-F1: 20 planeadas → 15 vieram (pagam as 15) → ajuste +100 € → 325 €", async () => {
    // 1. Criação: "Total de Crianças" = 20 → preço/criança de 4ª-feira (15 €),
    //    total acordado enviado pelo form = 20 × 15 = 300 €
    const festa = await reservaService.create({
      data: DATA_QUARTA,
      horario: "15:00",
      duracaoMinutos: 135,
      aniversariantes: aniversariante(`uc-f1-${Date.now()}@teste.pt`),
      numCriancas: 20,
      previsaoCriancas: 20,
      valorTotal: 300,
    });

    expect(Number(festa.precoCriancaAplicado)).toBe(15);
    expect(Number(festa.minimoCriancas)).toBe(10); // mínimo para 1 aniversariante
    expect(festa.estado).toBe("RESERVA");
    expect(Number(festa.valorTotal)).toBe(300);
    expect(festa.pago).toBe(false);

    // 2. No dia apenas 15 confirmam — o preço NÃO muda por si (o campo que
    //    cobra é numCriancas; confirmadas alimenta a redefinição)
    await reservaService.update(festa.id, { numCriancasConfirmadas: 15 });
    const aposConfirmadas = await reservaService.getById(festa.id);
    expect(aposConfirmadas.numCriancasConfirmadas).toBe(15);
    expect(Number(aposConfirmadas.valorTotal)).toBe(300);

    // 3. "Acertos → Redefinir por criança": 15 × 15 € = 225 €
    const redefinicao = await ajustePagamentoService.redefinirPreco(
      {
        modo: "POR_CRIANCA",
        precoPorCabeca: 15,
        motivo: "Só 15 crianças apareceram",
        reservaId: festa.id,
      },
      USER_ADMIN
    );
    expect(redefinicao.tipo).toBe("REDEFINICAO");
    expect(Number(redefinicao.valor)).toBe(225);
    expect(redefinicao.criadoPorId).toBe(TEST_IDS.USER_ADMIN);

    const aposRedefinicao = await reservaService.getById(festa.id);
    expect(Number(aposRedefinicao.valorTotal)).toBe(225);

    // REDEFINICAO é permanente (auditoria)
    await expect(ajustePagamentoService.remove(redefinicao.id)).rejects.toThrow(
      "REDEFINICAO_NAO_REMOVIVEL"
    );

    // 4. Acréscimo de 100 € (write-through + auditoria do autor)
    const acrescimo = await ajustePagamentoService.create(
      { tipo: "ACRESCIMO", valor: 100, motivo: "Pinturas faciais no dia", reservaId: festa.id },
      USER_ADMIN
    );
    expect(acrescimo.criadoPorId).toBe(TEST_IDS.USER_ADMIN);

    const aposAcrescimo = await reservaService.getById(festa.id);
    expect(Number(aposAcrescimo.valorTotal)).toBe(325);

    // 5. Ledger: sinal de 100 € não liquida; completar 325 € → Pago derivado
    const parcial = await reservaService.atualizarPagamento(festa.id, {
      pagamentos: [{ valor: 100, metodo: "MBWAY" }],
    });
    expect(parcial.pago).toBe(false);

    await reservaService.atualizarPagamento(festa.id, {
      pagamentos: [
        { valor: 100, metodo: "MBWAY" },
        { valor: 225, metodo: "DINHEIRO" },
      ],
    });
    const liquidada = await reservaService.getById(festa.id);
    expect(liquidada.pago).toBe(true);
    expect(liquidada.pagamentos).toHaveLength(2);

    // Histórico de acertos da festa: REDEFINICAO + ACRESCIMO
    const ajustes = await testPrisma.ajustePagamento.findMany({
      where: { reservaId: festa.id },
    });
    expect(ajustes.map((a) => a.tipo).sort()).toEqual(["ACRESCIMO", "REDEFINICAO"]);
  });

  it("UC-F2 (diferentes opções): sábado com menu — o menu define o preço e o mínimo aplica-se", async () => {
    const menu = await testPrisma.extra.upsert({
      where: { id: "extra-menu-uc-fds" },
      update: { precoUnitario: 16.5, fimDeSemana: true, activo: true },
      create: {
        id: "extra-menu-uc-fds",
        nome: "Menu UseCase FDS",
        categoria: "MENU",
        precoUnitario: 16.5,
        fimDeSemana: true,
        requerTexto: false,
        activo: true,
      },
    });

    // 6 crianças previstas num sábado com menu a 16,50 €/criança:
    // o menu sobrepõe o tarifário de FDS (20 €) e o mínimo (10) fatura-se
    const festa = await reservaService.create({
      data: DATA_SABADO,
      horario: "15:00",
      duracaoMinutos: 135,
      aniversariantes: aniversariante(`uc-f2-${Date.now()}@teste.pt`),
      numCriancas: 6,
      previsaoCriancas: 6,
      menuId: menu.id,
      valorTotal: 165, // 10 × 16,50 — o que o form mostraria
    });

    expect(Number(festa.precoCriancaAplicado)).toBe(16.5); // menu > tarifário FDS
    expect(Number(festa.minimoCriancas)).toBe(10);
    expect(Number(festa.valorTotal)).toBe(165);

    // O menu é gravado em Reserva.menu (não é extra da reserva)
    const detalhe = await reservaService.getById(festa.id);
    expect(detalhe.menu?.nome).toBe("Menu UseCase FDS");
  });
});
