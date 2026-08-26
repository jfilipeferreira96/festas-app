import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

describe("ajustePagamentoService", () => {
  beforeAll(async () => {
    await seedTestData();
    // Limpar ajustes de execuções anteriores (o seed usa upsert e não repõe totais)
    await testPrisma.ajustePagamento.deleteMany();
    await testPrisma.reserva.update({
      where: { id: TEST_IDS.RESERVA_CONFIRMADA },
      data: { valorPago: 50 },
    });
    await testPrisma.entradaLivre.update({
      where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
      data: { custoTotal: 15, custoTotalFinal: null },
    });
    await testPrisma.entradaLivre.update({
      where: { id: TEST_IDS.ENTRADA_LIVRE_2 },
      data: { custoTotalFinal: 17 },
    });
  });

  afterAll(async () => {
    await testPrisma.ajustePagamento.deleteMany();
    await cleanTestData();
  });

  // ── create: festas (reservas) ─────────────────────────────────
  it("deve aplicar acréscimo ao valorPago da reserva", async () => {
    const ajuste = await ajustePagamentoService.create(
      {
        tipo: "ACRESCIMO",
        valor: 5,
        motivo: "Lanche extra",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
      },
      { id: TEST_IDS.USER_ADMIN, name: "Admin Teste" }
    );

    expect(ajuste.tipo).toBe("ACRESCIMO");
    expect(Number(ajuste.valor)).toBe(5);
    expect(ajuste.motivo).toBe("Lanche extra");
    expect(ajuste.criadoPorId).toBe(TEST_IDS.USER_ADMIN);

    const reserva = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_EM_CURSO },
    });
    // valorPago inicial era null (0) → 0 + 5 = 5
    expect(Number(reserva.valorPago)).toBe(5);
  });

  it("deve aplicar desconto ao valorPago da reserva", async () => {
    await ajustePagamentoService.create({
      tipo: "DESCONTO",
      valor: 10,
      motivo: "Desconto comercial",
      reservaId: TEST_IDS.RESERVA_CONFIRMADA,
    });

    const reserva = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_CONFIRMADA },
    });
    // valorPago inicial era 50 → 50 - 10 = 40
    expect(Number(reserva.valorPago)).toBe(40);
  });

  it("deve recusar desconto que torna o total da reserva negativo", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "DESCONTO",
        valor: 999,
        motivo: "Desconto absurdo",
        reservaId: TEST_IDS.RESERVA_CONFIRMADA,
      })
    ).rejects.toThrow("VALOR_INVALIDO");
  });

  // ── create: entradas livres ───────────────────────────────────
  it("deve aplicar acréscimo ao custoTotal quando entrada não tem custoTotalFinal", async () => {
    await ajustePagamentoService.create({
      tipo: "ACRESCIMO",
      valor: 2,
      motivo: "Meias",
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
    });

    const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({
      where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
    });
    // custoTotal 15, sem custoTotalFinal → 15 + 2 = 17
    expect(Number(entrada.custoTotal)).toBe(17);
    expect(entrada.custoTotalFinal).toBeNull();
  });

  it("deve aplicar desconto ao custoTotalFinal quando entrada já foi concluída", async () => {
    await ajustePagamentoService.create({
      tipo: "DESCONTO",
      valor: 2,
      motivo: "Erro de cálculo",
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_2,
    });

    const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({
      where: { id: TEST_IDS.ENTRADA_LIVRE_2 },
    });
    // custoTotalFinal 17 → 17 - 2 = 15 (custoTotal original 12 intacto)
    expect(Number(entrada.custoTotalFinal)).toBe(15);
    expect(Number(entrada.custoTotal)).toBe(12);
  });

  // ── validações ────────────────────────────────────────────────
  it("deve recusar tipo inválido", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "OUTRO" as "ACRESCIMO",
        valor: 5,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
      })
    ).rejects.toThrow("TIPO_INVALIDO");
  });

  it("deve recusar valor zero ou negativo", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: 0,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
      })
    ).rejects.toThrow("VALOR_INVALIDO");

    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: -3,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
      })
    ).rejects.toThrow("VALOR_INVALIDO");
  });

  it("deve recusar motivo vazio", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: 5,
        motivo: "   ",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
      })
    ).rejects.toThrow("MOTIVO_OBRIGATORIO");
  });

  it("deve recusar sem alvo ou com dois alvos", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: 5,
        motivo: "sem alvo",
      })
    ).rejects.toThrow("ALVO_INVALIDO");

    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: 5,
        motivo: "dois alvos",
        reservaId: TEST_IDS.RESERVA_EM_CURSO,
        entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
      })
    ).rejects.toThrow("ALVO_INVALIDO");
  });

  it("deve recusar reserva inexistente", async () => {
    await expect(
      ajustePagamentoService.create({
        tipo: "ACRESCIMO",
        valor: 5,
        motivo: "x",
        reservaId: "reserva-inexistente",
      })
    ).rejects.toThrow("NOT_FOUND");
  });

  // ── remove ────────────────────────────────────────────────────
  it("deve reverter o total ao remover o ajuste", async () => {
    const ajuste = await ajustePagamentoService.create({
      tipo: "ACRESCIMO",
      valor: 7.5,
      motivo: "Acréscimo temporário",
      reservaId: TEST_IDS.RESERVA_EM_CURSO,
    });

    const antes = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_EM_CURSO },
    });
    expect(Number(antes.valorPago)).toBe(12.5); // 5 + 7.5

    await ajustePagamentoService.remove(ajuste.id);

    const depois = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_EM_CURSO },
    });
    expect(Number(depois.valorPago)).toBe(5);

    const eliminado = await testPrisma.ajustePagamento.findUnique({
      where: { id: ajuste.id },
    });
    expect(eliminado).toBeNull();
  });

  it("deve reverter custoTotalFinal da entrada ao remover ajuste", async () => {
    const ajuste = await ajustePagamentoService.create({
      tipo: "DESCONTO",
      valor: 2,
      motivo: "Desconto temporário",
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_2,
    });
    // 15 - 2 = 13
    const antes = await testPrisma.entradaLivre.findUniqueOrThrow({
      where: { id: TEST_IDS.ENTRADA_LIVRE_2 },
    });
    expect(Number(antes.custoTotalFinal)).toBe(13);

    await ajustePagamentoService.remove(ajuste.id);

    const depois = await testPrisma.entradaLivre.findUniqueOrThrow({
      where: { id: TEST_IDS.ENTRADA_LIVRE_2 },
    });
    expect(Number(depois.custoTotalFinal)).toBe(15);
  });

  it("deve recusar remover ajuste inexistente", async () => {
    await expect(ajustePagamentoService.remove("ajuste-inexistente")).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  // ── list ──────────────────────────────────────────────────────
  it("deve listar apenas ajustes da reserva filtrada", async () => {
    const ajustes = await ajustePagamentoService.list({
      reservaId: TEST_IDS.RESERVA_EM_CURSO,
    });

    expect(ajustes.length).toBeGreaterThan(0);
    for (const a of ajustes) {
      expect(a.reservaId).toBe(TEST_IDS.RESERVA_EM_CURSO);
      expect(a.entradaLivreId).toBeNull();
    }
    // valor serializado como número
    expect(typeof ajustes[0].valor).toBe("number");
  });

  it("deve listar ajustes de uma entrada livre", async () => {
    const ajustes = await ajustePagamentoService.list({
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
    });

    expect(ajustes.length).toBe(1);
    expect(ajustes[0].entradaLivreId).toBe(TEST_IDS.ENTRADA_LIVRE_1);
    expect(ajustes[0].criadoPor).toBeDefined();
  });
});
