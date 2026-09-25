import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

vi.mock("@/services/email.service", () => ({
  enfileirarEmailConfirmacaoReserva: vi.fn(async () => undefined),
}));

import { reservaService } from "@/services/reserva.service";

/**
 * Caução no ledger à criação (queixa do cliente, 25/09/2026):
 *  - festa criada com caução PAGA tem de a registar no ledger como valor já
 *    recebido, para a modal de pagamento a descontar da falta;
 *  - sem duplicação com promoverPorCaucao/iniciar nem com payload manual;
 *  - PAGA_NO_DIA e caução sem valor não criam linha.
 */

/** Data futura (>= +minDias) normalizada para quarta-feira. */
function dataFutura(minDias: number, diaSemana: number): string {
  const d = new Date();
  d.setDate(d.getDate() + minDias);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DATA_QUARTA_FUTURA = dataFutura(60, 3);

/**
 * Festa futura; cada teste usa um horário distinto para não colidir no
 * mesmo slot (guard por data+horário+sala).
 */
function payload(email: string, horario: string, overrides?: Record<string, unknown>) {
  return {
    data: DATA_QUARTA_FUTURA,
    horario,
    duracaoMinutos: 120,
    aniversariantes: [
      {
        nome: "Criança Caucao Ledger",
        dataNascimento: "2019-06-15",
        encarregadoNome: "Pai Caucao Ledger",
        encarregadoEmail: email,
        encarregadoTelefone: "917000001",
      },
    ],
    numCriancas: 12,
    previsaoCriancas: 12,
    valorTotal: 200,
    ...overrides,
  };
}

async function limparFestasDeTeste() {
  const clientes = await testPrisma.cliente.findMany({
    where: { email: { contains: "cl-ledger" } },
    select: { id: true },
  });
  for (const c of clientes) {
    await testPrisma.pagamento.deleteMany({ where: { reserva: { clienteId: c.id } } });
    await testPrisma.reservaEtapa.deleteMany({ where: { reserva: { clienteId: c.id } } });
    await testPrisma.reservaExtra.deleteMany({ where: { reserva: { clienteId: c.id } } });
    await testPrisma.ajustePagamento.deleteMany({ where: { reserva: { clienteId: c.id } } });
    await testPrisma.reserva.deleteMany({ where: { clienteId: c.id } });
    await testPrisma.cliente.delete({ where: { id: c.id } });
  }
}

describe("Caução no ledger à criação da festa", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await limparFestasDeTeste();
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  it("criar com caução PAGA regista a linha 'Caução' no ledger; festa não nasce paga", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-1-${Date.now()}@teste.pt`, "17:00", {
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
      }) as never
    );

    // Caução paga na criação → nasce directamente CONFIRMADA
    expect(festa.estado).toBe("CONFIRMADO");

    // Ledger: entrada única "Caução" de 50 €
    const entradaCaucao = festa.pagamentos.filter((p) => p.nota === "Caução");
    expect(entradaCaucao).toHaveLength(1);
    expect(Number(entradaCaucao[0]!.valor)).toBe(50);
    expect(entradaCaucao[0]!.metodo).toBe("MBWAY");

    // 50 € recebidos de 200 € → não está paga
    expect(festa.pago).toBe(false);
  });

  it("a caução desconta a falta: pagar o restante liquida a festa", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-2-${Date.now()}@teste.pt`, "17:15", {
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
      }) as never
    );

    // A modal envia o ledger completo (caução + pagamentos do dia)
    await reservaService.atualizarPagamento(festa.id, {
      pagamentos: [
        { valor: 50, metodo: "MBWAY", nota: "Caução" },
        { valor: 150, metodo: "DINHEIRO", nota: "Resto no dia" },
      ],
    });

    const apos = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true },
    });
    const soma = (apos?.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
    expect(soma).toBe(200);
    expect(apos?.pago).toBe(true);
  });

  it("promoverPorCaucao não duplica a linha de caução já no ledger", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-3-${Date.now()}@teste.pt`, "17:30", {
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
      }) as never
    );

    await reservaService.promoverPorCaucao(festa.id);

    const refetch = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true },
    });
    expect(refetch?.pagamentos.filter((p) => p.nota === "Caução")).toHaveLength(1);
  });

  it("criar com caução PAGA sem valor não cria linha no ledger", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-4-${Date.now()}@teste.pt`, "17:45", { caucao: "PAGA" }) as never
    );
    expect(festa.pagamentos).toHaveLength(0);
    expect(festa.pago).toBe(false);
  });

  it("PAGA_NO_DIA não cria linha no ledger (ainda não foi recebida)", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-5-${Date.now()}@teste.pt`, "18:00", {
        caucao: "PAGA_NO_DIA",
        valorCaucao: 50,
      }) as never
    );
    expect(festa.estado).toBe("RESERVA");
    expect(festa.pagamentos).toHaveLength(0);
  });

  it("caução que cobre o total acordado: festa nasce paga", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-6-${Date.now()}@teste.pt`, "18:15", {
        valorTotal: 50,
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "DINHEIRO",
      }) as never
    );
    expect(festa.pagamentos.filter((p) => p.nota === "Caução")).toHaveLength(1);
    expect(festa.pago).toBe(true);
  });

  it("linha 'Caução' manual no payload de criação não é duplicada", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-7-${Date.now()}@teste.pt`, "18:30", {
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
        pagamentos: [{ valor: 50, metodo: "DINHEIRO", nota: "Caução" }],
      }) as never
    );
    const entradaCaucao = festa.pagamentos.filter((p) => p.nota === "Caução");
    expect(entradaCaucao).toHaveLength(1);
    expect(Number(entradaCaucao[0]!.valor)).toBe(50);
    expect(entradaCaucao[0]!.metodo).toBe("DINHEIRO");
  });

  it("replace-all sem a linha 'Caução' re-materializa a caução paga (atualizarPagamento)", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-8-${Date.now()}@teste.pt`, "18:45", {
        caucao: "PAGA",
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
      }) as never
    );

    // Chamada API direta (ou cliente defeituoso) envia o ledger SEM a caução
    await reservaService.atualizarPagamento(festa.id, {
      pagamentos: [{ valor: 150, metodo: "DINHEIRO" }],
    });

    const apos = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true },
    });
    const caucaoRows = apos?.pagamentos.filter((p) => p.nota === "Caução") ?? [];
    expect(caucaoRows).toHaveLength(1);
    expect(Number(caucaoRows[0]!.valor)).toBe(50);
    const soma = (apos?.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
    expect(soma).toBe(200);
    expect(apos?.pago).toBe(true);
  });

  it("replace-all via update sem a linha 'Caução' também re-materializa", async () => {
    const festa = await reservaService.create(
      payload(`cl-ledger-9-${Date.now()}@teste.pt`, "19:00", {
        caucao: "PAGA",
        valorCaucao: 40,
        metodoCaucao: "DINHEIRO",
      }) as never
    );

    await reservaService.update(festa.id, {
      pagamentos: [{ valor: 160, metodo: "MULTIBANCO" }],
    });

    const apos = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true },
    });
    expect(apos?.pagamentos.filter((p) => p.nota === "Caução")).toHaveLength(1);
    const soma = (apos?.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
    expect(soma).toBe(200);
    expect(apos?.pago).toBe(true);
  });
});
