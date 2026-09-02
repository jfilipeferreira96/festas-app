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

  // ── redefinirPreco: REDEFINICAO ────────────────────────────────
  it("deve redefinir o preço total absoluto (modo TOTAL)", async () => {
    const ajuste = await ajustePagamentoService.redefinirPreco(
      {
        modo: "TOTAL",
        valor: 180,
        motivo: "Acerto combinado com o cliente",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      },
      { id: TEST_IDS.USER_ADMIN, name: "Admin Teste" }
    );

    expect(ajuste.tipo).toBe("REDEFINICAO");
    expect(ajuste.modo).toBe("TOTAL");
    expect(Number(ajuste.valor)).toBe(180);
    expect(ajuste.precoPorCabeca).toBeNull();

    const reserva = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_PENDENTE },
    });
    expect(Number(reserva.valorPago)).toBe(180);
  });

  it("deve redefinir por criança usando confirmadas ?? previstas (modo POR_CRIANCA)", async () => {
    // 4 crianças confirmadas × 45 € = 180 €
    await testPrisma.reserva.update({
      where: { id: TEST_IDS.RESERVA_PENDENTE },
      data: { numCriancasConfirmadas: 4 },
    });

    const ajuste = await ajustePagamentoService.redefinirPreco({
      modo: "POR_CRIANCA",
      precoPorCabeca: 45,
      motivo: "Preço especial por miúdo",
      reservaId: TEST_IDS.RESERVA_PENDENTE,
    });

    expect(ajuste.tipo).toBe("REDEFINICAO");
    expect(ajuste.modo).toBe("POR_CRIANCA");
    expect(Number(ajuste.precoPorCabeca)).toBe(45);
    expect(Number(ajuste.valor)).toBe(180); // 45 × 4

    const reserva = await testPrisma.reserva.findUniqueOrThrow({
      where: { id: TEST_IDS.RESERVA_PENDENTE },
    });
    expect(Number(reserva.valorPago)).toBe(180);
  });

  it("deve redefinir entrada livre por criança (nº de crianças do array)", async () => {
    // ENTRADA_LIVRE_1 tem 2 crianças (João, Maria) → 2 × 6 = 12
    const ajuste = await ajustePagamentoService.redefinirPreco({
      modo: "POR_CRIANCA",
      precoPorCabeca: 6,
      motivo: "Entrada ajustada",
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
    });

    expect(Number(ajuste.valor)).toBe(12);

    const entrada = await testPrisma.entradaLivre.findUniqueOrThrow({
      where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
    });
    // Sem custoTotalFinal → redefine custoTotal
    expect(Number(entrada.custoTotal)).toBe(12);
  });

  it("deve recusar modo inválido, motivo vazio e valor inválido", async () => {
    await expect(
      ajustePagamentoService.redefinirPreco({
        modo: "X" as "TOTAL",
        valor: 10,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      })
    ).rejects.toThrow("MODO_INVALIDO");

    await expect(
      ajustePagamentoService.redefinirPreco({
        modo: "TOTAL",
        valor: 10,
        motivo: "  ",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      })
    ).rejects.toThrow("MOTIVO_OBRIGATORIO");

    await expect(
      ajustePagamentoService.redefinirPreco({
        modo: "TOTAL",
        valor: 0,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      })
    ).rejects.toThrow("VALOR_INVALIDO");

    await expect(
      ajustePagamentoService.redefinirPreco({
        modo: "POR_CRIANCA",
        precoPorCabeca: -1,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      })
    ).rejects.toThrow("VALOR_INVALIDO");
  });

  it("deve recusar POR_CRIANCA em festa sem crianças", async () => {
    await testPrisma.reserva.update({
      where: { id: TEST_IDS.RESERVA_PENDENTE },
      data: { numCriancasConfirmadas: null, numCriancas: 0 },
    });

    await expect(
      ajustePagamentoService.redefinirPreco({
        modo: "POR_CRIANCA",
        precoPorCabeca: 10,
        motivo: "x",
        reservaId: TEST_IDS.RESERVA_PENDENTE,
      })
    ).rejects.toThrow("CRIANCAS_INVALIDO");
  });

  it("REDEFINICAO não é removível (auditoria)", async () => {
    const ajuste = await ajustePagamentoService.redefinirPreco({
      modo: "TOTAL",
      valor: 100,
      motivo: "Para tentar remover",
      reservaId: TEST_IDS.RESERVA_PENDENTE,
    });

    await expect(ajustePagamentoService.remove(ajuste.id)).rejects.toThrow(
      "REDEFINICAO_NAO_REMOVIVEL"
    );
  });

  it("list devolve modo e precoPorCabeca das redefinições", async () => {
    const ajustes = await ajustePagamentoService.list({
      reservaId: TEST_IDS.RESERVA_PENDENTE,
    });

    const redef = ajustes.find(
      (a: { tipo: string; modo: string | null; precoPorCabeca: number | null }) =>
        a.tipo === "REDEFINICAO" && a.modo === "POR_CRIANCA"
    );
    expect(redef).toBeDefined();
    expect(redef!.precoPorCabeca).toBe(45);
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
    // Criar um ajuste com autor conhecido (os anteriores deste ficheiro
    // não passam user e ficam com criadoPorId null)
    const ajusteComAutor = await ajustePagamentoService.create(
      {
        tipo: "ACRESCIMO",
        valor: 1,
        motivo: "Listagem de entrada livre",
        entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
      },
      { id: TEST_IDS.USER_ADMIN, name: "Admin Teste" }
    );

    const ajustes = await ajustePagamentoService.list({
      entradaLivreId: TEST_IDS.ENTRADA_LIVRE_1,
    });

    // ACRESCIMO (line above) + REDEFINICAO POR_CRIANCA criados antes neste ficheiro
    expect(ajustes.length).toBeGreaterThanOrEqual(2);
    for (const a of ajustes) {
      expect(a.entradaLivreId).toBe(TEST_IDS.ENTRADA_LIVRE_1);
      expect(a.reservaId).toBeNull();
      expect(typeof a.valor).toBe("number");
    }
    const comAutor = ajustes.find((a) => a.id === ajusteComAutor.id);
    expect(comAutor).toBeDefined();
    expect(comAutor!.criadoPor).toBeDefined();
    expect(comAutor!.criadoPor!.id).toBe(TEST_IDS.USER_ADMIN);
  });
});
