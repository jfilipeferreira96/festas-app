import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";
import { reservaService } from "@/services/reserva.service";
import { entradaLivreService } from "@/services/entradaLivre.service";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

/**
 * Fluxo completo FESTA + ACERTOS (tabs Pagamento/Acertos do FestaForm):
 *  1. Festa criada (form) com pagamento parcial no ledger
 *  2. Acertos: desconto + acréscimo (write-through no valorTotal, pago re-derivado)
 *  3. Editar a festa SEM valorTotal (o que o FestaForm envia): ajustes preservados
 *  4. Editar com valorTotal explícito → pago re-derivado (hardening do update)
 *  5. Redefinir preço por criança (REDEFINICAO, não removível)
 *  6. Remover acerto → delta revertido no total
 *  7. Ledger replace-all na edição + total coberto → pago derivado true
 */
describe("Festa + Acertos (fluxo completo do form)", () => {
  const FESTA_ID = "test-festa-ajustes-001";
  const USER = { id: TEST_IDS.USER_ADMIN, name: "Admin Teste" };

  beforeAll(async () => {
    await seedTestData();
    // Limpeza defensiva de execuções anteriores
    await testPrisma.pagamento.deleteMany({ where: { reservaId: FESTA_ID } });
    await testPrisma.ajustePagamento.deleteMany({ where: { reservaId: FESTA_ID } });
    await testPrisma.reserva.deleteMany({ where: { id: FESTA_ID } });

    // 1. Festa criada pelo form: total acordado 100 €, pagamento parcial 50 €
    await testPrisma.reserva.create({
      data: {
        id: FESTA_ID,
        data: new Date("2030-06-10T14:00:00.000Z"),
        horario: "14:00",
        duracaoMinutos: 135,
        numCriancas: 15,
        previsaoCriancas: 15,
        numCriancasConfirmadas: 15,
        estado: "CONFIRMADO",
        clienteId: TEST_IDS.CLIENTE_1,
        valorTotal: 100,
        notas: "Festa de teste - fluxo de ajustes",
        pagamentos: {
          create: [{ valor: 50, metodo: "DINHEIRO", criadoPorId: TEST_IDS.USER_ADMIN }],
        },
      },
    });
  });

  const FESTA_CRIADA_ID = { id: "" };
  const ENTRADA_CRIADA_ID = { id: "" };

  afterAll(async () => {
    // Registros criados pelos testes de "criar com ajustes" (ids dinâmicos)
    if (FESTA_CRIADA_ID.id) {
      await testPrisma.ajustePagamento.deleteMany({ where: { reservaId: FESTA_CRIADA_ID.id } });
      await testPrisma.pagamento.deleteMany({ where: { reservaId: FESTA_CRIADA_ID.id } });
      await testPrisma.reservaAniversariante.deleteMany({ where: { reservaId: FESTA_CRIADA_ID.id } });
      await testPrisma.reserva.deleteMany({ where: { id: FESTA_CRIADA_ID.id } });
    }
    if (ENTRADA_CRIADA_ID.id) {
      await testPrisma.ajustePagamento.deleteMany({ where: { entradaLivreId: ENTRADA_CRIADA_ID.id } });
      await testPrisma.pagamento.deleteMany({ where: { entradaLivreId: ENTRADA_CRIADA_ID.id } });
      await testPrisma.entradaLivre.deleteMany({ where: { id: ENTRADA_CRIADA_ID.id } });
    }
    await testPrisma.pagamento.deleteMany({ where: { reservaId: FESTA_ID } });
    await testPrisma.ajustePagamento.deleteMany({ where: { reservaId: FESTA_ID } });
    await testPrisma.reserva.deleteMany({ where: { id: FESTA_ID } });
    await cleanTestData();
  });

  it("festa criada com pagamento parcial: 50 € de 100 € → pago=false (derivado)", async () => {
    const reserva = await reservaService.getById(FESTA_ID);
    expect(Number(reserva.valorTotal)).toBe(100);
    expect(reserva.pago).toBe(false);
  });

  it("Acertos - desconto 10 €: write-through no valorTotal (100 → 90)", async () => {
    const ajuste = await ajustePagamentoService.create(
      { tipo: "DESCONTO", valor: 10, motivo: "Desconto comercial", reservaId: FESTA_ID },
      USER
    );
    expect(ajuste.tipo).toBe("DESCONTO");
    expect(ajuste.motivo).toBe("Desconto comercial");
    expect(ajuste.criadoPorId).toBe(TEST_IDS.USER_ADMIN);

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(90);
  });

  it("Acertos - acréscimo 5 €: soma ao total (90 → 95) e fica listado com autor", async () => {
    await ajustePagamentoService.create(
      { tipo: "ACRESCIMO", valor: 5, motivo: "Hora extra", reservaId: FESTA_ID },
      USER
    );

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(95);

    const ajustes = await ajustePagamentoService.list({ reservaId: FESTA_ID });
    expect(ajustes).toHaveLength(2);
    expect(ajustes.map((a) => a.motivo).sort()).toEqual(["Desconto comercial", "Hora extra"]);
    expect(ajustes[0].criadoPor?.id).toBe(TEST_IDS.USER_ADMIN);
  });

  it("editar a festa SEM valorTotal (form de edição): total ajustado preservado (95)", async () => {
    await reservaService.update(FESTA_ID, {
      notas: "Notas actualizadas na edição",
      tema: "Festa do Pijama",
    });

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(reserva.notas).toBe("Notas actualizadas na edição");
    expect(reserva.tema).toBe("Festa do Pijama");
    // O total com ajustes NÃO é perdido nem recalculado
    expect(Number(reserva.valorTotal)).toBe(95);
    expect((await ajustePagamentoService.list({ reservaId: FESTA_ID })).length).toBe(2);
  });

  it("editar com valorTotal explícito: total actualizado + pago re-derivado (50 < 95)", async () => {
    await reservaService.update(FESTA_ID, { valorTotal: 95 });

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(95);
    expect(reserva.pago).toBe(false);
  });

  it("redefinir preço POR_CRIANCA 10 € × 15 crianças → 150 € (REDEFINICAO registada)", async () => {
    const redef = await ajustePagamentoService.redefinirPreco(
      { modo: "POR_CRIANCA", precoPorCabeca: 10, motivo: "Renegociado no dia", reservaId: FESTA_ID },
      USER
    );
    expect(Number(redef.valor)).toBe(150);

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(150);
  });

  it("REDEFINICAO não é removível", async () => {
    const ajustes = await ajustePagamentoService.list({ reservaId: FESTA_ID });
    const redef = ajustes.find((a) => a.tipo === "REDEFINICAO");
    expect(redef).toBeDefined();
    await expect(ajustePagamentoService.remove(redef!.id)).rejects.toThrow("REDEFINICAO_NAO_REMOVIVEL");
  });

  it("remover o desconto reverte o delta no total (150 → 160)", async () => {
    const ajustes = await ajustePagamentoService.list({ reservaId: FESTA_ID });
    const desconto = ajustes.find((a) => a.tipo === "DESCONTO");
    expect(desconto).toBeDefined();

    await ajustePagamentoService.remove(desconto!.id);

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(160);
  });

  it("edição com ledger replace-all (150 €) e total 160 €: pago derivado false", async () => {
    await reservaService.update(FESTA_ID, {
      pagamentos: [
        { valor: 50, metodo: "DINHEIRO" },
        { valor: 100, metodo: "MULTIBANCO" },
      ],
    });

    const pags = await testPrisma.pagamento.findMany({ where: { reservaId: FESTA_ID } });
    expect(pags).toHaveLength(2);
    expect(pags.reduce((s, p) => s + Number(p.valor), 0)).toBe(150);

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(reserva.pago).toBe(false);
  });

  it("editar com total coberto pelo ledger (150 = 150): pago derivado true", async () => {
    await reservaService.update(FESTA_ID, {
      valorTotal: 150,
      pagamentos: [{ valor: 150, metodo: "MULTIBANCO" }],
    });

    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: FESTA_ID } });
    expect(Number(reserva.valorTotal)).toBe(150);
    expect(reserva.pago).toBe(true);
  });

  // ── CRIAR festa COM ajustes no payload (tab "Acertos" do form na criação) ──
  it("criar festa COM ajustes: backend grava-os após criar com write-through (100 → 95) e auditoria", async () => {
    const created = await reservaService.create(
      {
        data: "2030-07-15",
        horario: "10:00",
        duracaoMinutos: 135,
        clienteId: TEST_IDS.CLIENTE_1,
        numCriancas: 0,
        enviarEmail: false,
        valorTotal: 100,
        pagamentos: [{ valor: 40, metodo: "DINHEIRO" }],
        ajustes: [
          { tipo: "DESCONTO", valor: 10, motivo: "Desconto na criação" },
          { tipo: "ACRESCIMO", valor: 5, motivo: "Hora extra na criação" },
        ],
      },
      USER
    );
    FESTA_CRIADA_ID.id = created.id;

    // Write-through: 100 - 10 + 5 = 95 (devolvido fresco pelo serviço)
    expect(Number(created.valorTotal)).toBe(95);

    // Tabela de ajustes: 2 registos com auditoria do autor
    const ajustes = await ajustePagamentoService.list({ reservaId: created.id });
    expect(ajustes).toHaveLength(2);
    expect(ajustes.map((a) => a.motivo).sort()).toEqual(["Desconto na criação", "Hora extra na criação"]);
    expect(ajustes[0].criadoPorId).toBe(TEST_IDS.USER_ADMIN);

    // pago re-derivado contra o total final: 40 < 95
    const reserva = await testPrisma.reserva.findUniqueOrThrow({ where: { id: created.id } });
    expect(reserva.pago).toBe(false);
  });

  // ── CRIAR entrada livre COM ajustes no payload ──
  it("criar entrada livre COM ajustes: write-through no custoTotal (20 → 25) e auditoria", async () => {
    const entrada = await entradaLivreService.create(
      {
        criancas: [{ nome: "Criança Acertos", idade: 6 }],
        encarregadoNome: "Encarregado Acertos",
        encarregadoTelefone: "934444444",
        duracaoMinutos: 60,
        custoTotal: 20,
        pago: false,
        ajustes: [{ tipo: "ACRESCIMO", valor: 5, motivo: "Extra na criação" }],
      },
      USER
    );
    ENTRADA_CRIADA_ID.id = entrada.id;

    // Sem custoTotalFinal, o ajuste aplica-se ao custoTotal: 20 + 5 = 25
    expect(Number(entrada.custoTotal)).toBe(25);

    const ajustes = await ajustePagamentoService.list({ entradaLivreId: entrada.id });
    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].motivo).toBe("Extra na criação");
    expect(ajustes[0].criadoPorId).toBe(TEST_IDS.USER_ADMIN);
  });
});
