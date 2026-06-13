import prisma from "@festas/db";

interface CreateAlocacaoData {
  data: string; // "yyyy-MM-dd"
  horaInicio: number; // minutos desde meia-noite (0–1440)
  horaFim: number; // minutos desde meia-noite
  monitorId: string;
  localId: string;
  observacoes?: string;
}

interface UpdateAlocacaoData {
  data?: string;
  horaInicio?: number;
  horaFim?: number;
  monitorId?: string;
  localId?: string;
  observacoes?: string | null;
}

interface ListFiltros {
  data?: string; // dia específico
  dataInicio?: string; // início do intervalo (inclusive)
  dataFim?: string; // fim do intervalo (exclusive — exclusive do dia seguinte)
  monitorId?: string;
  localId?: string;
}

/** Converte "yyyy-MM-dd" num par de datas [início, dia-seguinte] para range gte/lt */
function diaParaRange(dataStr: string): { gte: Date; lt: Date } {
  const start = new Date(dataStr + "T00:00:00.000Z");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

export const alocacaoMonitorService = {
  async list(filtros?: ListFiltros) {
    const where: Record<string, unknown> = {};

    if (filtros?.monitorId) where.monitorId = filtros.monitorId;
    if (filtros?.localId) where.localId = filtros.localId;

    if (filtros?.data) {
      const { gte, lt } = diaParaRange(filtros.data);
      where.data = { gte, lt };
    } else if (filtros?.dataInicio || filtros?.dataFim) {
      const dateFilter: Record<string, Date> = {};
      if (filtros.dataInicio) dateFilter.gte = new Date(filtros.dataInicio + "T00:00:00.000Z");
      if (filtros.dataFim) {
        const end = new Date(filtros.dataFim + "T00:00:00.000Z");
        end.setDate(end.getDate() + 1); // exclusive do dia seguinte
        dateFilter.lt = end;
      }
      where.data = dateFilter;
    }

    return prisma.alocacaoMonitor.findMany({
      where,
      include: {
        monitor: { select: { id: true, nome: true, fotoUrl: true } },
        local: { select: { id: true, nome: true } },
      },
      orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
    });
  },

  async getById(id: string) {
    const alocacao = await prisma.alocacaoMonitor.findUnique({
      where: { id },
      include: {
        monitor: { select: { id: true, nome: true, fotoUrl: true } },
        local: { select: { id: true, nome: true } },
      },
    });
    if (!alocacao) throw new Error("NOT_FOUND");
    return alocacao;
  },

  /** Verifica se um monitor já tem alocação sobreposta na mesma data */
  async verificarSobreposicao(
    dataStr: string,
    horaInicio: number,
    horaFim: number,
    monitorId: string,
    ignorarId?: string
  ) {
    const { gte, lt } = diaParaRange(dataStr);
    const sobrepostas = await prisma.alocacaoMonitor.findMany({
      where: {
        monitorId,
        data: { gte, lt },
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
      select: { horaInicio: true, horaFim: true },
    });

    // Sobreposição: a.horaInicio < b.horaFim && b.horaInicio < a.horaFim
    return sobrepostas.some((s) => horaInicio < s.horaFim && s.horaInicio < horaFim);
  },

  async create(data: CreateAlocacaoData) {
    if (!data.monitorId) throw new Error("MONITOR_REQUIRED");
    if (!data.localId) throw new Error("LOCAL_REQUIRED");
    if (!data.data) throw new Error("DATA_REQUIRED");
    if (data.horaFim <= data.horaInicio) throw new Error("HORAS_INVALIDAS");

    const existeSobreposicao = await this.verificarSobreposicao(
      data.data,
      data.horaInicio,
      data.horaFim,
      data.monitorId
    );
    if (existeSobreposicao) throw new Error("MONITOR_OVERLAP");

    return prisma.alocacaoMonitor.create({
      data: {
        data: new Date(data.data + "T00:00:00.000Z"),
        horaInicio: data.horaInicio,
        horaFim: data.horaFim,
        monitorId: data.monitorId,
        localId: data.localId,
        observacoes: data.observacoes || null,
      },
      include: {
        monitor: { select: { id: true, nome: true, fotoUrl: true } },
        local: { select: { id: true, nome: true } },
      },
    });
  },

  async update(id: string, data: UpdateAlocacaoData) {
    const actual = await this.getById(id);

    const novaData = data.data ?? formatDataParaString(actual.data);
    const novaHoraInicio = data.horaInicio ?? actual.horaInicio;
    const novaHoraFim = data.horaFim ?? actual.horaFim;
    const novoMonitorId = data.monitorId ?? actual.monitorId;

    if (novaHoraFim <= novaHoraInicio) throw new Error("HORAS_INVALIDAS");

    // Só valida sobreposição se houver alteração relevante
    const mudouHorario =
      data.data || data.horaInicio !== undefined || data.horaFim !== undefined || data.monitorId;
    if (mudouHorario) {
      const existeSobreposicao = await this.verificarSobreposicao(
        novaData,
        novaHoraInicio,
        novaHoraFim,
        novoMonitorId,
        id
      );
      if (existeSobreposicao) throw new Error("MONITOR_OVERLAP");
    }

    return prisma.alocacaoMonitor.update({
      where: { id },
      data: {
        ...(data.data ? { data: new Date(data.data + "T00:00:00.000Z") } : {}),
        horaInicio: data.horaInicio,
        horaFim: data.horaFim,
        monitorId: data.monitorId,
        localId: data.localId,
        observacoes: data.observacoes === undefined ? undefined : data.observacoes || null,
      },
      include: {
        monitor: { select: { id: true, nome: true, fotoUrl: true } },
        local: { select: { id: true, nome: true } },
      },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.alocacaoMonitor.delete({ where: { id } });
  },
};

/** Converte um Date (dia) para "yyyy-MM-dd" */
function formatDataParaString(date: Date): string {
  const ano = date.getUTCFullYear();
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(date.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
