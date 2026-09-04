import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

import { alocacaoMonitorService } from "@/services/alocacaoMonitor.service";

// H:MM → minutos desde meia-noite
const H = (h: number, m = 0) => h * 60 + m;

// Datas fixas e determinísticas (UTC) - evitam dependência de "hoje"
const DATA = "2026-01-15";
const DATA_ANTERIOR = "2026-01-10";
const DATA_POSTERIOR = "2026-01-20";

describe("AlocacaoMonitorService", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // Limpa alocações antes de cada teste para garantir isolamento total
  beforeEach(async () => {
    await testPrisma.alocacaoMonitor.deleteMany();
  });

  // ── create() ──────────────────────────────────────────────────
  describe("create()", () => {
    it("deve criar uma alocação e devolver monitor + local incluídos", async () => {
      const aloc = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
        observacoes: "Turno da manhã",
      });

      expect(aloc.id).toBeDefined();
      expect(aloc.horaInicio).toBe(H(10));
      expect(aloc.horaFim).toBe(H(12));
      expect(aloc.observacoes).toBe("Turno da manhã");
      expect(aloc.monitor).toBeDefined();
      expect(aloc.monitor.id).toBe(TEST_IDS.MONITOR_1);
      expect(aloc.local).toBeDefined();
      expect(aloc.local.id).toBe(TEST_IDS.LOCAL_1);
    });

    it("deve lançar HORAS_INVALIDAS quando horaFim <= horaInicio", async () => {
      await expect(
        alocacaoMonitorService.create({
          data: DATA,
          horaInicio: H(12),
          horaFim: H(12),
          monitorId: TEST_IDS.MONITOR_1,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("HORAS_INVALIDAS");

      await expect(
        alocacaoMonitorService.create({
          data: DATA,
          horaInicio: H(13),
          horaFim: H(12),
          monitorId: TEST_IDS.MONITOR_1,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("HORAS_INVALIDAS");
    });

    it("deve lançar MONITOR_OVERLAP quando há sobreposição para o mesmo monitor/dia", async () => {
      // Alocação existente: 10:00 – 12:00
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // Sobreposição parcial: 11:00 – 13:00
      await expect(
        alocacaoMonitorService.create({
          data: DATA,
          horaInicio: H(11),
          horaFim: H(13),
          monitorId: TEST_IDS.MONITOR_1,
          localId: TEST_IDS.LOCAL_1,
        })
      ).rejects.toThrow("MONITOR_OVERLAP");

      // Sobreposição total (contida): 10:30 – 11:30
      await expect(
        alocacaoMonitorService.create({
          data: DATA,
          horaInicio: H(10, 30),
          horaFim: H(11, 30),
          monitorId: TEST_IDS.MONITOR_1,
          localId: TEST_IDS.LOCAL_2,
        })
      ).rejects.toThrow("MONITOR_OVERLAP");
    });

    it("deve permitir horários adjacentes (sem sobreposição) para o mesmo monitor/dia", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // Adjacente logo a seguir (12:00 – 14:00) - não sobreposta
      const aloc2 = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(12),
        horaFim: H(14),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_2,
      });
      expect(aloc2.id).toBeDefined();

      // Adjacente antes (08:00 – 10:00)
      const aloc3 = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(8),
        horaFim: H(10),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(aloc3.id).toBeDefined();
    });

    it("deve permitir o mesmo horário para monitores diferentes", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const aloc2 = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_2,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(aloc2.id).toBeDefined();
    });

    it("deve permitir o mesmo horário para o mesmo monitor em dia diferente", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const aloc2 = await alocacaoMonitorService.create({
        data: DATA_POSTERIOR,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(aloc2.id).toBeDefined();
    });

    it("deve armazenar observacoes como null quando não fornecidas", async () => {
      const aloc = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      expect(aloc.observacoes).toBeNull();
    });
  });

  // ── getById() ─────────────────────────────────────────────────
  describe("getById()", () => {
    it("deve devolver a alocação pelo id", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const encontrada = await alocacaoMonitorService.getById(criada.id);
      expect(encontrada.id).toBe(criada.id);
      expect(encontrada.horaInicio).toBe(H(10));
    });

    it("deve lançar NOT_FOUND para id inexistente", async () => {
      await expect(alocacaoMonitorService.getById("id-inexistente-999")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── list() ────────────────────────────────────────────────────
  describe("list()", () => {
    it("deve filtrar por dia específico (data)", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA_POSTERIOR,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_2,
        localId: TEST_IDS.LOCAL_2,
      });

      const dia = await alocacaoMonitorService.list({ data: DATA });
      expect(dia).toHaveLength(1);
      expect(dia[0]!.monitor.id).toBe(TEST_IDS.MONITOR_1);
    });

    it("deve filtrar por intervalo (dataInicio/dataFim)", async () => {
      await alocacaoMonitorService.create({
        data: DATA_ANTERIOR,
        horaInicio: H(9),
        horaFim: H(11),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA_POSTERIOR,
        horaInicio: H(14),
        horaFim: H(16),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // Intervalo [DATA_ANTERIOR, DATA_POSTERIOR) - inclui anterior + DATA, exclui posterior
      const range = await alocacaoMonitorService.list({
        dataInicio: DATA_ANTERIOR,
        dataFim: DATA,
      });
      expect(range).toHaveLength(2);
      expect(range.map((a) => a.monitor.id)).toEqual([TEST_IDS.MONITOR_1, TEST_IDS.MONITOR_1]);
    });

    it("deve filtrar por monitorId", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(14),
        horaFim: H(16),
        monitorId: TEST_IDS.MONITOR_2,
        localId: TEST_IDS.LOCAL_2,
      });

      const apenasMonitor1 = await alocacaoMonitorService.list({
        data: DATA,
        monitorId: TEST_IDS.MONITOR_1,
      });
      expect(apenasMonitor1).toHaveLength(1);
      expect(apenasMonitor1[0]!.monitor.id).toBe(TEST_IDS.MONITOR_1);
    });

    it("deve filtrar por localId", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(14),
        horaFim: H(16),
        monitorId: TEST_IDS.MONITOR_2,
        localId: TEST_IDS.LOCAL_2,
      });

      const apenasLocal2 = await alocacaoMonitorService.list({
        data: DATA,
        localId: TEST_IDS.LOCAL_2,
      });
      expect(apenasLocal2).toHaveLength(1);
      expect(apenasLocal2[0]!.local.id).toBe(TEST_IDS.LOCAL_2);
    });

    it("deve ordenar por data e horaInicio asc", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(14),
        horaFim: H(16),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(9),
        horaFim: H(11),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const ordenadas = await alocacaoMonitorService.list({ data: DATA });
      expect(ordenadas).toHaveLength(2);
      expect(ordenadas[0]!.horaInicio).toBe(H(9));
      expect(ordenadas[1]!.horaInicio).toBe(H(14));
    });
  });

  // ── update() ──────────────────────────────────────────────────
  describe("update()", () => {
    it("deve atualizar observacoes e horário sem conflito", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const atualizada = await alocacaoMonitorService.update(criada.id, {
        horaInicio: H(10, 30),
        horaFim: H(12, 30),
        observacoes: "Atualizado",
      });

      expect(atualizada.horaInicio).toBe(H(10, 30));
      expect(atualizada.horaFim).toBe(H(12, 30));
      expect(atualizada.observacoes).toBe("Atualizado");
    });

    it("deve ignorar a própria alocação ao verificar sobreposição", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // Mudar o próprio horário para um intervalo que se sobrepõe ao original
      // não deve disparar MONITOR_OVERLAP (ignora o próprio id)
      const atualizada = await alocacaoMonitorService.update(criada.id, {
        horaInicio: H(11),
        horaFim: H(13),
      });
      expect(atualizada.horaInicio).toBe(H(11));
    });

    it("deve lançar MONITOR_OVERLAP ao mover para horário sobreposto com outra alocação", async () => {
      const a = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      const b = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(13),
        horaFim: H(15),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_2,
      });

      // Mover B para 11:00 – 13:00 sobrepõe-se a A
      await expect(
        alocacaoMonitorService.update(b.id, {
          horaInicio: H(11),
          horaFim: H(13),
        })
      ).rejects.toThrow("MONITOR_OVERLAP");

      // A mantém-se intocada
      const aVerif = await alocacaoMonitorService.getById(a.id);
      expect(aVerif.horaInicio).toBe(H(10));
    });

    it("deve lançar HORAS_INVALIDAS ao definir horaFim <= horaInicio", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      await expect(
        alocacaoMonitorService.update(criada.id, { horaInicio: H(12), horaFim: H(12) })
      ).rejects.toThrow("HORAS_INVALIDAS");
    });

    it("deve lançar NOT_FOUND para id inexistente", async () => {
      await expect(
        alocacaoMonitorService.update("id-inexistente-999", { observacoes: "x" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── delete() ──────────────────────────────────────────────────
  describe("delete()", () => {
    it("deve eliminar a alocação", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      await alocacaoMonitorService.delete(criada.id);

      await expect(alocacaoMonitorService.getById(criada.id)).rejects.toThrow("NOT_FOUND");
    });

    it("deve lançar NOT_FOUND ao eliminar id inexistente", async () => {
      await expect(alocacaoMonitorService.delete("id-inexistente-999")).rejects.toThrow("NOT_FOUND");
    });
  });

  // ── verificarSobreposicao() ───────────────────────────────────
  describe("verificarSobreposicao()", () => {
    it("deve detectar sobreposição correctamente", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const sobrep = await alocacaoMonitorService.verificarSobreposicao(
        DATA,
        H(11),
        H(13),
        TEST_IDS.MONITOR_1
      );
      expect(sobrep).toBe(true);

      const livre = await alocacaoMonitorService.verificarSobreposicao(
        DATA,
        H(12),
        H(14),
        TEST_IDS.MONITOR_1
      );
      expect(livre).toBe(false);
    });

    it("deve ignorar a própria alocação via ignorarId", async () => {
      const criada = await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // O próprio intervalo, ignorando o próprio id → não deve contar como sobreposição
      const sobrep = await alocacaoMonitorService.verificarSobreposicao(
        DATA,
        H(10),
        H(12),
        TEST_IDS.MONITOR_1,
        criada.id
      );
      expect(sobrep).toBe(false);
    });
  });

  // ── calcularHorasMonitor() ─────────────────────────────────────
  describe("calcularHorasMonitor()", () => {
    it("deve calcular horas, custo total e nº de alocações", async () => {
      // Definir valorHora = 8.50 €/h no MONITOR_1
      await testPrisma.monitor.update({
        where: { id: TEST_IDS.MONITOR_1 },
        data: { valorHora: 8.5 },
      });

      // Criar 3 alocações: 4h + 3h + 2h = 9h total → 9 × 8.50 = 76.50
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(9),
        horaFim: H(13),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(14),
        horaFim: H(17),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA_POSTERIOR,
        horaInicio: H(10),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const resultado = await alocacaoMonitorService.calcularHorasMonitor(
        TEST_IDS.MONITOR_1,
        DATA,
        DATA_POSTERIOR
      );

      expect(resultado.monitorId).toBe(TEST_IDS.MONITOR_1);
      expect(resultado.alocacoes).toBe(3);
      expect(resultado.totalMinutos).toBe(9 * 60); // 540 min
      expect(resultado.totalHoras).toBeCloseTo(9, 2);
      expect(resultado.valorHora).toBeCloseTo(8.5, 2);
      expect(resultado.valorTotal).toBeCloseTo(76.5, 2);

      // Cleanup
      await testPrisma.monitor.update({
        where: { id: TEST_IDS.MONITOR_1 },
        data: { valorHora: null },
      });
    });

    it("deve filtrar por intervalo de datas", async () => {
      await alocacaoMonitorService.create({
        data: DATA_ANTERIOR,
        horaInicio: H(9),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(9),
        horaFim: H(12),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      // Só a alocação em DATA (dentro de DATA..DATA_POSTERIOR)
      const resultado = await alocacaoMonitorService.calcularHorasMonitor(
        TEST_IDS.MONITOR_1,
        DATA,
        DATA_POSTERIOR
      );

      expect(resultado.alocacoes).toBe(1);
      expect(resultado.totalHoras).toBeCloseTo(3, 2);
    });

    it("deve devolver valorHora=0 e valorTotal=0 quando monitor não tem valor/hora", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(10),
        horaFim: H(14),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const resultado = await alocacaoMonitorService.calcularHorasMonitor(
        TEST_IDS.MONITOR_1,
        DATA,
        DATA_POSTERIOR
      );

      expect(resultado.totalHoras).toBeCloseTo(4, 2);
      expect(resultado.valorHora).toBe(0);
      expect(resultado.valorTotal).toBe(0);
    });

    it("deve lançar NOT_FOUND para monitor inexistente", async () => {
      await expect(
        alocacaoMonitorService.calcularHorasMonitor("non-existent")
      ).rejects.toThrow("NOT_FOUND");
    });

    it("deve calcular todas as alocações sem filtro de datas", async () => {
      await alocacaoMonitorService.create({
        data: DATA,
        horaInicio: H(9),
        horaFim: H(13),
        monitorId: TEST_IDS.MONITOR_1,
        localId: TEST_IDS.LOCAL_1,
      });

      const resultado = await alocacaoMonitorService.calcularHorasMonitor(TEST_IDS.MONITOR_1);

      expect(resultado.alocacoes).toBeGreaterThanOrEqual(1);
      expect(resultado.totalMinutos).toBeGreaterThanOrEqual(240);
    });
  });
});
