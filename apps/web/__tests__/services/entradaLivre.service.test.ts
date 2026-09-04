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

import { entradaLivreService } from "@/services/entradaLivre.service";

describe("Entrada Livre Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return all entradas livres", async () => {
      const entradas = await entradaLivreService.list();
      expect(entradas.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by estado", async () => {
      const ativas = await entradaLivreService.list({ estado: "ATIVA" });
      expect(ativas.every((e: any) => e.estado === "ATIVA")).toBe(true);

      const concluidas = await entradaLivreService.list({ estado: "CONCLUIDA" });
      expect(concluidas.every((e: any) => e.estado === "CONCLUIDA")).toBe(true);
    });

    // ── Date filters ────────────────────────────────────────────
    it("should filter by data (today)", async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const entradas = await entradaLivreService.list({ data: hoje });
      expect(entradas.length).toBeGreaterThanOrEqual(0);
      // All results should have inicioEm on the given date
      entradas.forEach((e: any) => {
        const entradaDate = new Date(e.inicioEm).toISOString().split("T")[0];
        expect(entradaDate).toBe(hoje);
      });
    });

    it("should filter by data (tomorrow - expect empty)", async () => {
      // Data em horário LOCAL (não UTC) - evita flake quando a suite corre
      // logo após a meia-noite local: o seed usa dias locais, mas o
      // toISOString() serializa o dia UTC e saltava para o dia errado.
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;
      const entradas = await entradaLivreService.list({ data: amanhaStr });
      // Should be empty since we don't seed entries for tomorrow
      expect(entradas.length).toBe(0);
    });

    it("should filter by dataInicio and dataFim (date range)", async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const entradas = await entradaLivreService.list({ dataInicio: hoje, dataFim: hoje });
      // Range of same day should work
      expect(Array.isArray(entradas)).toBe(true);
    });

    it("should combine estado + data filters", async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const entradas = await entradaLivreService.list({ estado: "ATIVA", data: hoje });
      expect(entradas.every((e: any) => e.estado === "ATIVA")).toBe(true);
      entradas.forEach((e: any) => {
        const entradaDate = new Date(e.inicioEm).toISOString().split("T")[0];
        expect(entradaDate).toBe(hoje);
      });
    });

    // ── Pesquisa ────────────────────────────────────────────────
    it("should search by encarregadoNome", async () => {
      const entradas = await entradaLivreService.list({ pesquisa: "Encarregado" });
      expect(entradas.length).toBeGreaterThanOrEqual(1);
      entradas.forEach((e: any) => {
        const match =
          e.encarregadoNome?.toLowerCase().includes("encarregado") ||
          e.criancas?.some?.((c: any) => c.nome?.toLowerCase().includes("encarregado"));
        expect(match).toBe(true);
      });
    });

    it("should return empty for non-matching search", async () => {
      const entradas = await entradaLivreService.list({ pesquisa: "ZZZ_NONEXISTENT_ZZZ" });
      expect(entradas.length).toBe(0);
    });

    it("should search by crianca nome", async () => {
      // The seed data has criança names
      const entradas = await entradaLivreService.list({ pesquisa: "Criança" });
      expect(entradas.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ── getById ───────────────────────────────────────────────────
  describe("getById()", () => {
    it("should return an entrada by ID with criancas", async () => {
      const entrada = await entradaLivreService.getById("test-entrada-livre-001");
      expect(entrada).toBeDefined();
      expect(entrada.id).toBe("test-entrada-livre-001");
      expect(entrada.estado).toBe("ATIVA");
      expect(entrada.criancas).toHaveLength(2);
    });

    it("should throw NOT_FOUND for non-existent ID", async () => {
      await expect(entradaLivreService.getById("non-existent-id")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new entrada livre with children", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Maria Teste",
        encarregadoTelefone: "912345678",
        encarregadoEmail: "maria@email.pt",
        duracaoMinutos: 90,
        pago: true,
        criancas: [{ nome: "João", idade: 6 }, { nome: "Ana", idade: 5 }],
        observacoes: "Teste de criação",
      });

      expect(entrada).toBeDefined();
      expect(entrada.encarregadoNome).toBe("Maria Teste");
      expect(entrada.criancas).toHaveLength(2);
      expect(entrada.estado).toBe("ATIVA");
      expect(entrada.inicioEm).toBeDefined();
      expect(entrada.fimPrevisto).toBeDefined();
      expect(entrada.custoTotal).toBeGreaterThan(0);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should create entrada without cacifo", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Pedro Sem Cacifo",
        encarregadoTelefone: "923456789",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Luís" }],
      });

      expect(entrada.cacifo).toBeNull();

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should create entrada with cacifo (via cacifoId)", async () => {
      // Ensure cacifo 1 is free
      await testPrisma.cacifo.update({
        where: { numero: 1 },
        data: { estado: "LIVRE", reservaId: null },
      });

      const cacifo = await testPrisma.cacifo.findUnique({ where: { numero: 1 } });

      const entrada = await entradaLivreService.create({
        encarregadoNome: "Ana Com Cacifo",
        encarregadoTelefone: "934567890",
        cacifoId: cacifo!.id,
        duracaoMinutos: 120,
        pago: true,
        criancas: [{ nome: "Beatriz" }],
      });

      expect(entrada.cacifo).not.toBeNull();
      expect(entrada.cacifo!.numero).toBe(1);

      // Cleanup
      await testPrisma.cacifo.update({
        where: { numero: 1 },
        data: { estado: "LIVRE", reservaId: null },
      });
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should create entrada using global pricing config", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Global",
        encarregadoTelefone: "912345678",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      // Tarifário por escalão: 60 min = escalão 1h (6€), aplica-se a todos os dias
      const esperado = 6;

      expect(entrada).toBeDefined();
      expect(Number(entrada.custoHora)).toBe(esperado);
      expect(Number(entrada.custoTotal)).toBe(esperado); // 60 min = escalão 1h

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should create entrada with temLanche=true (lanche incluído)", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Com Lanche",
        encarregadoTelefone: "912345679",
        duracaoMinutos: 120,
        pago: true,
        criancas: [{ nome: "Criança" }, { nome: "Criança 2" }],
        temLanche: true,
      });

      expect(entrada).toBeDefined();
      expect(entrada.temLanche).toBe(true);
      expect(entrada.custoTotal).toBeGreaterThan(0);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should charge lanche only for children with querLanche=true", async () => {
      // Referência sem lanche (mesma duração e nº de crianças)
      const ref = await entradaLivreService.create({
        encarregadoNome: "Ref Sem Lanche",
        encarregadoTelefone: "912345611",
        duracaoMinutos: 90,
        pago: true,
        criancas: [{ nome: "A" }, { nome: "B" }],
        temLanche: false,
      });

      const entrada = await entradaLivreService.create({
        encarregadoNome: "Lanche Parcial",
        encarregadoTelefone: "912345612",
        duracaoMinutos: 90,
        pago: true,
        criancas: [
          { nome: "A", querLanche: true },
          { nome: "B", querLanche: false },
        ],
        temLanche: true,
      });

      const base = Number(ref.custoTotal);
      const precoLanche = 3; // default (config sem precoLancheEntrada)
      expect(Number(entrada.custoTotal)).toBeCloseTo(base + 1 * precoLanche, 2);

      await testPrisma.entradaLivre.delete({ where: { id: ref.id } });
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should count all children as lanche when flag is absent (retrocompatibilidade)", async () => {
      const ref = await entradaLivreService.create({
        encarregadoNome: "Ref Sem Lanche 2",
        encarregadoTelefone: "912345613",
        duracaoMinutos: 90,
        pago: true,
        criancas: [{ nome: "A" }, { nome: "B" }],
        temLanche: false,
      });

      // Sem querLanche - registo antigo: todas as crianças contam
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Lanche Retro",
        encarregadoTelefone: "912345614",
        duracaoMinutos: 90,
        pago: true,
        criancas: [{ nome: "A" }, { nome: "B" }],
        temLanche: true,
      });

      const base = Number(ref.custoTotal);
      const precoLanche = 3;
      expect(Number(entrada.custoTotal)).toBeCloseTo(base + 2 * precoLanche, 2);

      await testPrisma.entradaLivre.delete({ where: { id: ref.id } });
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should not charge lanche when temLanche=false even with querLanche flags", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Sem Lanche Flags",
        encarregadoTelefone: "912345615",
        duracaoMinutos: 90,
        pago: true,
        criancas: [
          { nome: "A", querLanche: true },
          { nome: "B", querLanche: true },
        ],
        temLanche: false,
      });

      const semLanche = await entradaLivreService.create({
        encarregadoNome: "Sem Lanche Simples",
        encarregadoTelefone: "912345616",
        duracaoMinutos: 90,
        pago: true,
        criancas: [{ nome: "A" }, { nome: "B" }],
        temLanche: false,
      });

      expect(Number(entrada.custoTotal)).toBeCloseTo(Number(semLanche.custoTotal), 2);

      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
      await testPrisma.entradaLivre.delete({ where: { id: semLanche.id } });
    });

    it("should recalculate custoTotal on update when a child toggles querLanche", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Update Lanche",
        encarregadoTelefone: "912345617",
        duracaoMinutos: 90,
        pago: true,
        criancas: [
          { nome: "A", querLanche: true },
          { nome: "B", querLanche: true },
        ],
        temLanche: true,
      });

      const atualizada = await entradaLivreService.atualizar(entrada.id, {
        criancas: [
          { nome: "A", querLanche: true },
          { nome: "B", querLanche: false },
        ],
      });

      // Menos um lanche (3€) face à criação
      expect(Number(atualizada.custoTotal)).toBeCloseTo(Number(entrada.custoTotal) - 3, 2);

      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should create entrada with numAdultos (pai paga)", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Pai Paga",
        encarregadoTelefone: "912345680",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança Pequena", idade: 2 }],
        numAdultos: 1,
      });

      expect(entrada).toBeDefined();
      expect(entrada.numAdultos).toBe(1);
      expect(entrada.custoTotal).toBeGreaterThan(0);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should throw PAGAMENTO_OBRIGATORIO when pago is undefined", async () => {
      await expect(
        entradaLivreService.create({
          encarregadoNome: "Sem Pagamento",
          encarregadoTelefone: "912345678",
          duracaoMinutos: 60,
          criancas: [{ nome: "Criança" }],
          // pago omitted - must throw
        } as any)
      ).rejects.toThrow("PAGAMENTO_OBRIGATORIO");
    });

    it("should throw PAGAMENTO_OBRIGATORIO when pago is null", async () => {
      await expect(
        entradaLivreService.create({
          encarregadoNome: "Sem Pagamento Null",
          encarregadoTelefone: "912345678",
          duracaoMinutos: 60,
          criancas: [{ nome: "Criança" }],
          pago: null,
        } as any)
      ).rejects.toThrow("PAGAMENTO_OBRIGATORIO");
    });

    it("should create entrada with pago=false (não pago) - valid", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Não Pago Válido",
        encarregadoTelefone: "912345678",
        duracaoMinutos: 60,
        criancas: [{ nome: "Criança" }],
        pago: false,
      });

      expect(entrada).toBeDefined();
      expect(entrada.pago).toBe(false);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── concluir ─────────────────────────────────────────────────
  describe("concluir()", () => {
    it("should conclude entrada without overtime", async () => {
      // Create entrada that started 60 min ago with 90 min duration
      const now = new Date();
      const inicio = new Date(now.getTime() - 60 * 60 * 1000);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          id: "test-concluir-no-excess",
          encarregadoNome: "Teste Sem Excesso",
          encarregadoTelefone: "999999999",
          inicioEm: inicio,
          duracaoMinutos: 90,
          custoHora: 10.0,
          custoTotal: 12.0,
          estado: "ATIVA",
          fimPrevisto: new Date(inicio.getTime() + 90 * 60 * 1000),
          criancas: { create: [{ nome: "Criança" }] },
        },
      });

      const concluida = await entradaLivreService.concluir(entrada.id);

      expect(concluida.estado).toBe("CONCLUIDA");
      expect(concluida.fimReal).toBeDefined();
      expect(concluida.excessoMinutos).toBe(0);
      expect(concluida.custoExcesso).toBe(0);
      expect(concluida.custoTotalFinal).toBe(12.0);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should conclude entrada with overtime and calculate excess cost", async () => {
      // Create entrada that started 120 min ago with 90 min duration (30 min excess)
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          id: "test-concluir-com-excesso",
          encarregadoNome: "Teste Com Excesso",
          encarregadoTelefone: "999999999",
          inicioEm: inicio,
          duracaoMinutos: 90,
          custoHora: 10.0,
          custoTotal: 12.0,
          estado: "ATIVA",
          fimPrevisto: new Date(inicio.getTime() + 90 * 60 * 1000),
          criancas: { create: [{ nome: "Criança" }] },
        },
      });

      const concluida = await entradaLivreService.concluir(entrada.id);

      expect(concluida.estado).toBe("CONCLUIDA");
      expect(concluida.excessoMinutos).toBe(30);
      expect(concluida.custoExcesso).toBe(5.0); // fixed excesso price from tarifário (default 5)
      expect(concluida.custoTotalFinal).toBe(17.0); // 12 + 5

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should throw NOT_FOUND for non-existent entrada", async () => {
      await expect(entradaLivreService.concluir("non-existent-id")).rejects.toThrow("NOT_FOUND");
    });

    it("should use manual custoExcesso when provided (overrides fixed suggestion)", async () => {
      // Entrada with 30 min excess → suggestion would be precoExcessoFixo (default 5)
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          id: "test-concluir-manual",
          encarregadoNome: "Teste Manual",
          encarregadoTelefone: "999999999",
          inicioEm: inicio,
          duracaoMinutos: 90,
          custoHora: 10.0,
          custoTotal: 12.0,
          estado: "ATIVA",
          fimPrevisto: new Date(inicio.getTime() + 90 * 60 * 1000),
          criancas: { create: [{ nome: "Criança" }] },
        },
      });

      // Manual value of 7.50 overrides the fixed suggestion
      const concluida = await entradaLivreService.concluir(entrada.id, { custoExcessoManual: 7.5 });

      expect(concluida.estado).toBe("CONCLUIDA");
      expect(concluida.excessoMinutos).toBe(30);
      expect(concluida.custoExcesso).toBe(7.5);
      expect(concluida.custoTotalFinal).toBe(19.5); // 12 + 7.5

      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should allow manual custoExcesso of 0 (no charge even with excess)", async () => {
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          id: "test-concluir-manual-zero",
          encarregadoNome: "Teste Zero",
          encarregadoTelefone: "999999999",
          inicioEm: inicio,
          duracaoMinutos: 90,
          custoHora: 10.0,
          custoTotal: 12.0,
          estado: "ATIVA",
          fimPrevisto: new Date(inicio.getTime() + 90 * 60 * 1000),
          criancas: { create: [{ nome: "Criança" }] },
        },
      });

      const concluida = await entradaLivreService.concluir(entrada.id, { custoExcessoManual: 0 });

      expect(concluida.estado).toBe("CONCLUIDA");
      expect(concluida.excessoMinutos).toBe(30);
      expect(concluida.custoExcesso).toBe(0);
      expect(concluida.custoTotalFinal).toBe(12.0); // 12 + 0

      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should free cacifo when concluding", async () => {
      // Ensure cacifo 2 is free
      await testPrisma.cacifo.update({
        where: { numero: 2 },
        data: { estado: "LIVRE", reservaId: null },
      });

      const cacifo = await testPrisma.cacifo.findUnique({ where: { numero: 2 } });
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Libertar Cacifo",
        encarregadoTelefone: "999999999",
        cacifoId: cacifo!.id,
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      expect(entrada.cacifo!.estado).toBe("OCUPADO");

      await entradaLivreService.concluir(entrada.id);

      const cacifoAfter = await testPrisma.cacifo.findUnique({ where: { numero: 2 } });
      expect(cacifoAfter?.estado).toBe("LIVRE");

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── cancelar ─────────────────────────────────────────────────
  describe("cancelar()", () => {
    it("should cancel an active entrada", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Para Cancelar",
        encarregadoTelefone: "999999999",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      const cancelada = await entradaLivreService.cancelar(entrada.id);

      expect(cancelada.estado).toBe("CANCELADA");
      expect(cancelada.fimReal).toBeDefined();

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should throw NOT_FOUND for non-existent entrada", async () => {
      await expect(entradaLivreService.cancelar("non-existent-id")).rejects.toThrow("NOT_FOUND");
    });

    it("should free cacifo when canceling", async () => {
      // Ensure cacifo 3 is free
      await testPrisma.cacifo.update({
        where: { numero: 3 },
        data: { estado: "LIVRE", reservaId: null },
      });

      const cacifo = await testPrisma.cacifo.findUnique({ where: { numero: 3 } });
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Cancelar Com Cacifo",
        encarregadoTelefone: "999999999",
        cacifoId: cacifo!.id,
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      await entradaLivreService.cancelar(entrada.id);

      const cacifoAfter = await testPrisma.cacifo.findUnique({ where: { numero: 3 } });
      expect(cacifoAfter?.estado).toBe("LIVRE");

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── eliminar ─────────────────────────────────────────────────
  describe("eliminar()", () => {
    it("should delete a non-active entrada", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Para Eliminar",
        encarregadoTelefone: "999999999",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      await entradaLivreService.cancelar(entrada.id);

      await entradaLivreService.eliminar(entrada.id);

      const deleted = await testPrisma.entradaLivre.findUnique({ where: { id: entrada.id } });
      expect(deleted).toBeNull();
    });

    it("should throw NOT_FOUND for non-existent entrada", async () => {
      await expect(entradaLivreService.eliminar("non-existent-id")).rejects.toThrow("NOT_FOUND");
    });

    it("should throw CANNOT_DELETE_ACTIVE if entrada is ATIVA", async () => {
      // Create an active entrada first
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Ativa Teste",
        encarregadoTelefone: "999999999",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança" }],
      });

      await expect(entradaLivreService.eliminar(entrada.id)).rejects.toThrow("CANNOT_DELETE_ACTIVE");

      // Cleanup
      await entradaLivreService.cancelar(entrada.id);
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── atualizarPagamento ───────────────────────────────────────
  describe("atualizarPagamento()", () => {
    it("should mark pago as true", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Pagamento",
        encarregadoTelefone: "999999999",
        duracaoMinutos: 60,
        criancas: [{ nome: "Criança" }],
        pago: false,
      });

      const atualizada = await entradaLivreService.atualizarPagamento(entrada.id, {
        pago: true,
        metodoPagamento: "MBWAY",
      });

      expect(atualizada.pago).toBe(true);
      expect(atualizada.metodoPagamento).toBe("MBWAY");

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should mark pagoExcesso as true", async () => {
      // Create entrada with excess
      const now = new Date();
      const inicio = new Date(now.getTime() - 120 * 60 * 1000);

      const entrada = await testPrisma.entradaLivre.create({
        data: {
          id: "test-pagamento-excesso",
          encarregadoNome: "Teste",
          encarregadoTelefone: "999999999",
          inicioEm: inicio,
          duracaoMinutos: 90,
          custoHora: 10.0,
          custoTotal: 12.0,
          custoExcesso: 5.0,
          excessoMinutos: 30,
          custoTotalFinal: 17.0,
          estado: "CONCLUIDA",
          fimPrevisto: new Date(inicio.getTime() + 90 * 60 * 1000),
          criancas: { create: [{ nome: "Criança" }] },
        },
      });

      const atualizada = await entradaLivreService.atualizarPagamento(entrada.id, {
        pagoExcesso: true,
      });

      expect(atualizada.pagoExcesso).toBe(true);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── contadores ───────────────────────────────────────────────
  describe("getContadores()", () => {
    it("should return counters", async () => {
      const contadores = await entradaLivreService.getContadores();
      expect(contadores).toHaveProperty("ativas");
      expect(contadores).toHaveProperty("concluidasHoje");
      expect(contadores).toHaveProperty("totalHoje");
      expect(contadores.ativas).toBeGreaterThanOrEqual(0);
    });
  });

  // ── create() - Cliente creation (marketing base de contactos) ─
  describe("create() - Cliente creation", () => {
    it("should create a new Cliente when encarregado is new", async () => {
      const countBefore = await testPrisma.cliente.count();

      const entrada = await entradaLivreService.create({
        encarregadoNome: "Novo Encarregado Teste",
        encarregadoTelefone: "9555444333",
        encarregadoEmail: "novo-enc-teste@test.com",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança Nova" }],
      });

      // Entrada should have clienteId and cliente populated
      expect(entrada.cliente?.id).toBeDefined();
      expect(entrada.cliente).toBeDefined();
      expect(entrada.cliente!.nome).toBe("Novo Encarregado Teste");
      expect(entrada.cliente!.email).toBe("novo-enc-teste@test.com");

      // A new cliente was created
      const countAfter = await testPrisma.cliente.count();
      expect(countAfter).toBe(countBefore + 1);

      // Cleanup
      const clienteId = entrada.cliente?.id;
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
      if (clienteId) await testPrisma.cliente.delete({ where: { id: clienteId } });
    });

    it("should reuse existing Cliente by email", async () => {
      // CLIENTE_1: email "teste1@email.pt", telefone "911111111"
      const countBefore = await testPrisma.cliente.count();

      const entrada = await entradaLivreService.create({
        encarregadoNome: "Cliente Existente",
        encarregadoTelefone: "911111111",
        encarregadoEmail: "teste1@email.pt",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança Reuso" }],
      });

      // Should reuse CLIENTE_1, not create a new one
      expect(entrada.cliente?.id).toBe(TEST_IDS.CLIENTE_1);
      const countAfter = await testPrisma.cliente.count();
      expect(countAfter).toBe(countBefore);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("should reuse existing Cliente by telefone when email is absent", async () => {
      // CLIENTE_2: telefone "922222222"
      const countBefore = await testPrisma.cliente.count();

      const entrada = await entradaLivreService.create({
        encarregadoNome: "Cliente Por Telefone",
        encarregadoTelefone: "922222222",
        // No email → should match by telefone
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança Tel" }],
      });

      // Should reuse CLIENTE_2, not create a new one
      expect(entrada.cliente?.id).toBe(TEST_IDS.CLIENTE_2);
      const countAfter = await testPrisma.cliente.count();
      expect(countAfter).toBe(countBefore);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });

  // ── v2: meias e split payment ──────────────────────────────────
  describe("create() - meias e pagamento dividido", () => {
    it("deve criar entrada com meiasQuantidade e metodoPagamento2", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Meias Split",
        encarregadoTelefone: "915555555",
        duracaoMinutos: 60,
        pago: true,
        criancas: [{ nome: "Criança 1" }, { nome: "Criança 2" }, { nome: "Criança 3" }],
        meiasQuantidade: 3,
        metodoPagamento: "DINHEIRO",
        metodoPagamento2: "MBWAY",
        valorPago2: 10,
      });

      expect(entrada.meiasQuantidade).toBe(3);
      expect(entrada.metodoPagamento2).toBe("MBWAY");
      expect(Number(entrada.valorPago2)).toBe(10);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("deve persistir valorPago (recebido no pagamento 1)", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Teste Recebido Pag1",
        encarregadoTelefone: "917777777",
        duracaoMinutos: 60,
        pago: false,
        criancas: [{ nome: "Criança Sinal" }],
        metodoPagamento: "DINHEIRO",
        valorPago: 5,
      });

      expect(Number(entrada.valorPago)).toBe(5);
      expect(entrada.metodoPagamento).toBe("DINHEIRO");
      expect(entrada.pago).toBe(false);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });

    it("deve criar entrada com várias crianças (multi-criança)", async () => {
      const entrada = await entradaLivreService.create({
        encarregadoNome: "Multi Crianças",
        encarregadoTelefone: "916666666",
        duracaoMinutos: 90,
        pago: true,
        criancas: [
          { nome: "C1", idade: 4 },
          { nome: "C2", idade: 5 },
          { nome: "C3", idade: 6 },
          { nome: "C4", idade: 7 },
        ],
      });

      expect(entrada.criancas).toHaveLength(4);

      // Cleanup
      await testPrisma.entradaLivre.delete({ where: { id: entrada.id } });
    });
  });
});
