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
 * Use cases da caução e do auto-inicio (pedido do cliente, 24/09/2026):
 *  - pagar a caução materializa etapas+cacifos e entra no ledger;
 *  - a hora marcada atingida inicia a festa com inicioEm = hora marcada;
 *  - a caução paga é imutável;
 *  - em curso, a receção só mexe em total/presentes/caução.
 */

/** Data futura (>= +minDias) normalizada para o dia da semana pretendido. */
function dataFutura(minDias: number, diaSemana: number): string {
  const d = new Date();
  d.setDate(d.getDate() + minDias);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DATA_QUARTA_FUTURA = dataFutura(60, 3); // caução paga dias antes

function isoDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Festa de hoje com a hora marcada `offsetMin` minutos no passado (30 min
 * por omissão). Cada teste usa um offset diferente para nunca colidir no
 * mesmo slot (guard por data+horário+sala).
 */
function payloadPassada(offsetMin: number, email: string, overrides?: Record<string, unknown>) {
  const t = new Date(Date.now() - (30 + offsetMin) * 60_000);
  return {
    data: isoDe(t),
    horario: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`,
    duracaoMinutos: 120,
    aniversariantes: [
      {
        nome: "Criança Caucao",
        dataNascimento: "2019-06-15",
        encarregadoNome: "Pai Caucao",
        encarregadoEmail: email,
        encarregadoTelefone: "916000001",
      },
    ],
    numCriancas: 12,
    previsaoCriancas: 12,
    valorTotal: 180, // 12 × 15 € (tarifa de semana do seed)
    ...overrides,
  };
}

function payloadFutura(email: string, overrides?: Record<string, unknown>) {
  return {
    data: DATA_QUARTA_FUTURA,
    horario: "16:00",
    duracaoMinutos: 120,
    aniversariantes: [
      {
        nome: "Criança Caucao",
        dataNascimento: "2019-06-15",
        encarregadoNome: "Pai Caucao",
        encarregadoEmail: email,
        encarregadoTelefone: "916000001",
      },
    ],
    numCriancas: 12,
    previsaoCriancas: 12,
    valorTotal: 180,
    ...overrides,
  };
}

/** Etapas activas do catálogo - o materializador de preparação usa-as. */
async function semearEtapas() {
  for (const [i, nome] of ["Brindes UC", "Fotos UC"].entries()) {
    await testPrisma.etapaFesta.upsert({
      where: { id: `etapa-uc-${i}` },
      update: { activo: true },
      create: { id: `etapa-uc-${i}`, nome, ordem: 90 + i, activo: true },
    });
  }
}

async function limparFestasDeTeste() {
  const clientes = await testPrisma.cliente.findMany({
    where: { email: { contains: "uc-caucao" } },
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

describe("Caução no fluxo da festa + auto-inicio", () => {
  beforeAll(async () => {
    await seedTestData();
    await semearEtapas();
  }, 60000);

  afterAll(async () => {
    await limparFestasDeTeste();
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  it("pagar a caução materializa etapas + cacifos e regista 'Caução' no ledger; festa futura não inicia", async () => {
    const festa = await reservaService.create(
      payloadFutura(`uc-caucao-1-${Date.now()}@teste.pt`) as never
    );
    expect(festa.estado).toBe("RESERVA");
    expect(festa.inicioEm).toBeNull();
    expect(festa.pagamentos).toHaveLength(0);

    // Pagar a caução (dias antes da festa)
    const atualizada = await reservaService.update(festa.id, {
      caucao: "PAGA",
      valorCaucao: 50,
      metodoCaucao: "MBWAY",
    });

    // Confirma (comportamento mantido) e fica "Preparada" (materializada)
    expect(atualizada.estado).toBe("CONFIRMADO");
    expect(atualizada.caucao).toBe("PAGA");

    // Ledger: entrada única "Caução" de 50 €
    const entradaCaucao = atualizada.pagamentos.filter((p) => p.nota === "Caução");
    expect(entradaCaucao).toHaveLength(1);
    expect(Number(entradaCaucao[0]!.valor)).toBe(50);
    expect(entradaCaucao[0]!.metodo).toBe("MBWAY");

    // Materialização: etapas activas do catálogo
    expect(atualizada.etapas.length).toBeGreaterThan(0);

    // Sem cronómetro: festa é daqui a 2 meses
    const refetch = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(refetch?.inicioEm).toBeNull();
  });

  it("pagar a caução com a hora marcada já passada inicia com inicioEm = hora marcada", async () => {
    const festa = await reservaService.create(
      payloadPassada(0, `uc-caucao-2-${Date.now()}@teste.pt`) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");

    const antes = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(antes?.estado).toBe("CONFIRMADO");
    expect(antes?.inicioEm).toBeNull();

    // Caução paga agora (hora marcada já passou) → promoção + auto-inicio
    await reservaService.update(festa.id, {
      caucao: "PAGA",
      valorCaucao: 50,
      metodoCaucao: "DINHEIRO",
    });

    const depois = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(depois?.estado).toBe("EM_CURSO");
    expect(depois?.inicioEm).not.toBeNull();

    // inicioEm = HORA MARCADA (~30 min atrás), não o momento da transição
    const horaMarcada = new Date(depois!.inicioEm!).getTime();
    const diffMin = Math.round((Date.now() - horaMarcada) / 60000);
    expect(diffMin).toBeGreaterThanOrEqual(28); // tolerância para latência
    expect(diffMin).toBeLessThanOrEqual(45);

    // fimPrevisto = inicioEm + duração (120 min)
    const fimPrevisto = new Date(depois!.fimPrevisto!).getTime();
    expect(Math.round((fimPrevisto - horaMarcada) / 60000)).toBe(120);

    // Ledger: a caução entrou como pagamento
    const pg = await testPrisma.pagamento.findMany({
      where: { reservaId: festa.id, nota: "Caução" },
    });
    expect(pg).toHaveLength(1);
  });

  it("varrimento idempotente: segundo autoIniciarVencidas não duplica nem altera", async () => {
    const festa = await reservaService.create(
      payloadPassada(1, `uc-caucao-3-${Date.now()}@teste.pt`) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");
    await reservaService.update(festa.id, { caucao: "PAGA", valorCaucao: 30, metodoCaucao: "MBWAY" });

    const primeira = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(primeira?.estado).toBe("EM_CURSO");

    const nSegundo = await reservaService.autoIniciarVencidas();
    expect(nSegundo).toBe(0); // nada novo a fazer

    const segunda = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true },
    });
    expect(segunda?.inicioEm?.getTime()).toBe(primeira?.inicioEm?.getTime());
    expect(segunda?.pagamentos.filter((p) => p.nota === "Caução")).toHaveLength(1);
  });

  it("festa CONFIRMADO sem caução paga NÃO auto-inicia à hora (varrimento não a toca)", async () => {
    const festa = await reservaService.create(
      payloadPassada(2, `uc-caucao-4-${Date.now()}@teste.pt`) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");

    const n = await reservaService.autoIniciarVencidas();

    const depois = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(depois?.estado).toBe("CONFIRMADO");
    expect(depois?.inicioEm).toBeNull();
    expect(n).toBe(0);
  });

  it("'Iniciar Festa' manual com caução por pagar marca PAGA + ledger e inicia com inicioEm = agora", async () => {
    const festa = await reservaService.create(
      payloadPassada(3, `uc-caucao-5-${Date.now()}@teste.pt`, {
        valorCaucao: 50,
        metodoCaucao: "MBWAY",
      }) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");

    const antes = Date.now();
    const iniciada = await reservaService.iniciar(festa.id);
    const depois = Date.now();

    expect(iniciada.estado).toBe("EM_CURSO");
    expect(iniciada.caucao).toBe("PAGA");

    // inicioEm manual = agora (± 5 s), não a hora marcada
    const inicio = new Date(iniciada.inicioEm!).getTime();
    expect(inicio).toBeGreaterThanOrEqual(antes - 5000);
    expect(inicio).toBeLessThanOrEqual(depois + 5000);

    // Ledger: entrada "Caução" com o valor configurado
    const pg = await testPrisma.pagamento.findMany({
      where: { reservaId: festa.id, nota: "Caução" },
    });
    expect(pg).toHaveLength(1);
    expect(Number(pg[0]!.valor)).toBe(50);
    expect(pg[0]!.metodo).toBe("MBWAY");
  });

  it("caução paga é imutável: update e atualizarPagamento recusam alterações (CAUCAO_BLOQUEADA)", async () => {
    const festa = await reservaService.create(
      payloadFutura(`uc-caucao-6-${Date.now()}@teste.pt`, { horario: "16:30" }) as never
    );
    await reservaService.update(festa.id, { caucao: "PAGA", valorCaucao: 40, metodoCaucao: "MBWAY" });

    await expect(reservaService.update(festa.id, { caucao: "NAO_PAGA" })).rejects.toThrow(
      "CAUCAO_BLOQUEADA"
    );
    await expect(reservaService.update(festa.id, { valorCaucao: 99 })).rejects.toThrow(
      "CAUCAO_BLOQUEADA"
    );
    await expect(
      reservaService.atualizarPagamento(festa.id, { caucao: "PAGA_NO_DIA" })
    ).rejects.toThrow("CAUCAO_BLOQUEADA");

    // O valor mantém-se
    const refetch = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(Number(refetch?.valorCaucao)).toBe(40);
    expect(refetch?.caucao).toBe("PAGA");
  });

  it("em curso, a receção só altera total de crianças, presentes e caução - resto bloqueia", async () => {
    const festa = await reservaService.create(
      payloadPassada(4, `uc-caucao-7-${Date.now()}@teste.pt`) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");
    await reservaService.update(festa.id, { caucao: "PAGA", valorCaucao: 50, metodoCaucao: "MBWAY" });
    const emCurso = await testPrisma.reserva.findUnique({ where: { id: festa.id } });
    expect(emCurso?.estado).toBe("EM_CURSO");

    // Receção ajusta o total de crianças (pedido do cliente)
    const comNovoTotal = await reservaService.update(festa.id, { numCriancas: 15 });
    expect(comNovoTotal.numCriancas).toBe(15);

    // Equipa de cacifos ajusta as crianças que entraram (pedido do cliente)
    const comPresentes = await reservaService.update(festa.id, { numCriancasPresentes: 14 });
    expect(comPresentes.numCriancasPresentes).toBe(14);

    // Resto do payload: bloqueado (mesmo misturado com campos permitidos)
    await expect(
      reservaService.update(festa.id, { tema: "Heróis" })
    ).rejects.toThrow("CANNOT_MODIFY_IN_PROGRESS");
    await expect(
      reservaService.update(festa.id, { tema: "Heróis", numCriancas: 16 })
    ).rejects.toThrow("CANNOT_MODIFY_IN_PROGRESS");
    await expect(
      reservaService.update(festa.id, { pagamentos: [{ valor: 50, metodo: "DINHEIRO" }] })
    ).rejects.toThrow("CANNOT_MODIFY_IN_PROGRESS");
    // Caução paga continua imutável em EM_CURSO
    await expect(
      reservaService.update(festa.id, { caucao: "NAO_PAGA" })
    ).rejects.toThrow("CAUCAO_BLOQUEADA");
  });

  it("iniciar: ALREADY_IN_PROGRESS em festa já em curso; estado mantém-se em edição válida", async () => {
    const festa = await reservaService.create(
      payloadPassada(5, `uc-caucao-8-${Date.now()}@teste.pt`, { valorCaucao: 40 }) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");
    await reservaService.iniciar(festa.id);

    await expect(reservaService.iniciar(festa.id)).rejects.toThrow("ALREADY_IN_PROGRESS");

    // Edição válida em curso não des-promove o estado nem a caução
    const apos = await reservaService.update(festa.id, { numCriancasPresentes: 10 });
    expect(apos.estado).toBe("EM_CURSO");
    expect(apos.caucao).toBe("PAGA");
  });

  it("promoverPorCaucao sem valorCaucao: materializa etapas mas não cria entrada no ledger", async () => {
    // Hora futura de hoje: 23:59 (teste corre antes; guard cobre o caso raro)
    const festa = await reservaService.create(
      payloadPassada(-580, `uc-caucao-9-${Date.now()}@teste.pt`) as never
    );
    await reservaService.updateStatus(festa.id, "CONFIRMADO");
    await reservaService.update(festa.id, { caucao: "PAGA" }); // sem valor

    const refetch = await testPrisma.reserva.findUnique({
      where: { id: festa.id },
      include: { pagamentos: true, etapas: true },
    });
    expect(refetch?.etapas.length).toBeGreaterThan(0); // materializou sempre
    const horaMarcadaPassou = dataHoraMarcadaPassou(refetch!);
    if (!horaMarcadaPassou) {
      expect(refetch?.estado).toBe("CONFIRMADO");
      expect(refetch?.pagamentos).toHaveLength(0);
    }
  });
});

/** Espelho local de dataHoraMarcada do serviço (para asserção condicional). */
function dataHoraMarcadaPassou(reserva: { data: Date | string; horario: string }): boolean {
  const iso =
    typeof reserva.data === "string" ? reserva.data.slice(0, 10) : reserva.data.toISOString().slice(0, 10);
  return new Date(`${iso}T${reserva.horario}:00`) <= new Date();
}
