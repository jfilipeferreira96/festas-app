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

import { campanhaService } from "@/services/campanha.service";

describe("Campanha Service", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── list ──────────────────────────────────────────────────────
  describe("list()", () => {
    it("should return campanhas", async () => {
      const campanhas = await campanhaService.list();
      // May be empty if no campanhas created in seed
      expect(Array.isArray(campanhas)).toBe(true);
    });

    it("should filter by tipo EMAIL", async () => {
      const campanhas = await campanhaService.list("EMAIL");
      expect(campanhas.every((c: { tipo: string }) => c.tipo === "EMAIL")).toBe(true);
    });
  });

  // ── create ────────────────────────────────────────────────────
  describe("create()", () => {
    it("should create a new campanha rascunho", async () => {
      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        assunto: "Teste de Campanha",
        mensagem: "Olá {{nome}}! Esta é uma campanha de teste.",
        segmentoId: TEST_IDS.SEGMENTO_1,
      });

      expect(campanha).toBeDefined();
      expect(campanha.estado).toBe("RASCUNHO");
      expect(campanha.tipo).toBe("EMAIL");
      expect(campanha.segmento).toBeDefined();

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });

    it("should create a campanha agendada", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campanha = await campanhaService.create({
        tipo: "SMS",
        mensagem: "SMS de teste",
        segmentoId: TEST_IDS.SEGMENTO_1,
        agendadaPara: tomorrow.toISOString(),
      });

      expect(campanha.estado).toBe("AGENDADA");

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });

    it("should throw SEGMENTO_NOT_FOUND for non-existent segmento", async () => {
      await expect(
        campanhaService.create({
          tipo: "EMAIL",
          mensagem: "Teste",
          segmentoId: "non-existent",
        })
      ).rejects.toThrow("SEGMENTO_NOT_FOUND");
    });
  });

  // ── update ────────────────────────────────────────────────────
  describe("update()", () => {
    it("should update a rascunho campanha", async () => {
      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        assunto: "Original",
        mensagem: "Mensagem original",
        segmentoId: TEST_IDS.SEGMENTO_1,
      });

      const updated = await campanhaService.update(campanha.id, {
        assunto: "Actualizado",
      });
      expect(updated.assunto).toBe("Actualizado");

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });

    it("should throw CANNOT_EDIT_SENT for sent campanha", async () => {
      // Create and "send" a campanha
      const campanha = await testPrisma.campanha.create({
        data: {
          tipo: "EMAIL",
          assunto: "Enviada",
          mensagem: "Teste",
          estado: "ENVIADA",
          enviadaEm: new Date(),
          segmentoId: TEST_IDS.SEGMENTO_1,
        },
      });

      await expect(
        campanhaService.update(campanha.id, { assunto: "Novo" })
      ).rejects.toThrow("CANNOT_EDIT_SENT");

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });
  });

  // ── enviar ────────────────────────────────────────────────────
  describe("enviar()", () => {
    it("should send a campanha and create envios", async () => {
      // Create newsletter contactos in the segment
      const contacto = await testPrisma.newsletterContacto.create({
        data: { id: "test-contacto-camp", clienteId: TEST_IDS.CLIENTE_1 },
      });
      await testPrisma.contactoSegmento.create({
        data: { contactoId: contacto.id, segmentoId: TEST_IDS.SEGMENTO_1 },
      });

      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        assunto: "Para Enviar",
        mensagem: "Teste de envio",
        segmentoId: TEST_IDS.SEGMENTO_1,
      });

      const sent = await campanhaService.enviar(campanha.id);
      expect(sent.estado).toBe("ENVIADA");
      expect(sent.enviadaEm).toBeDefined();

      // Verify envios were created
      const envios = await testPrisma.envioCampanha.findMany({
        where: { campanhaId: campanha.id },
      });
      expect(envios.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await testPrisma.envioCampanha.deleteMany({ where: { campanhaId: campanha.id } });
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
      await testPrisma.contactoSegmento.deleteMany({ where: { contactoId: contacto.id } });
      await testPrisma.newsletterContacto.delete({ where: { id: contacto.id } });
    });

    it("should throw ALREADY_SENT for already sent campanha", async () => {
      const campanha = await testPrisma.campanha.create({
        data: {
          tipo: "EMAIL",
          mensagem: "Teste",
          estado: "ENVIADA",
          enviadaEm: new Date(),
          segmentoId: TEST_IDS.SEGMENTO_1,
        },
      });

      await expect(campanhaService.enviar(campanha.id)).rejects.toThrow("ALREADY_SENT");

      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });

    it("should throw NO_CONTACTS if segment has no contacts", async () => {
      // Create a segment with no contacts
      const segmento = await testPrisma.segmento.create({
        data: { id: "test-seg-empty", nome: "Vazio" },
      });

      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        mensagem: "Teste",
        segmentoId: segmento.id,
      });

      await expect(campanhaService.enviar(campanha.id)).rejects.toThrow("NO_CONTACTS");

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
      await testPrisma.segmento.delete({ where: { id: segmento.id } });
    });
  });

  // ── getMetricas ───────────────────────────────────────────────
  describe("getMetricas()", () => {
    it("should return metrics for a campanha", async () => {
      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        assunto: "Métricas",
        mensagem: "Teste",
        segmentoId: TEST_IDS.SEGMENTO_1,
      });

      const metricas = await campanhaService.getMetricas(campanha.id);
      expect(metricas).toHaveProperty("totalEnvios");
      expect(metricas).toHaveProperty("abertos");
      expect(metricas).toHaveProperty("falhados");
      expect(metricas).toHaveProperty("taxaAbertura");

      // Cleanup
      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });
  });

  // ── delete ────────────────────────────────────────────────────
  describe("delete()", () => {
    it("should delete a rascunho campanha", async () => {
      const campanha = await campanhaService.create({
        tipo: "EMAIL",
        mensagem: "Para apagar",
        segmentoId: TEST_IDS.SEGMENTO_1,
      });

      await campanhaService.delete(campanha.id);

      const found = await testPrisma.campanha.findUnique({ where: { id: campanha.id } });
      expect(found).toBeNull();
    });

    it("should throw CANNOT_DELETE_SENT for sent campanha", async () => {
      const campanha = await testPrisma.campanha.create({
        data: {
          tipo: "EMAIL",
          mensagem: "Teste",
          estado: "ENVIADA",
          enviadaEm: new Date(),
          segmentoId: TEST_IDS.SEGMENTO_1,
        },
      });

      await expect(campanhaService.delete(campanha.id)).rejects.toThrow("CANNOT_DELETE_SENT");

      await testPrisma.campanha.delete({ where: { id: campanha.id } });
    });
  });
});
