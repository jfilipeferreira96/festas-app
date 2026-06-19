import prisma from "@festas/db";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";

interface AniversarianteInput {
  nome: string;
  dataNascimento?: string;
  // Parent/encarregado data
  encarregadoNome: string;
  encarregadoEmail: string;
  encarregadoTelefone: string;
  encarregadoContribuinte?: string;
  encarregadoCodigoPostal?: string;
}

interface CreateReservaData {
  data: string;
  horario: string;
  duracaoMinutos: number;
  localId: string;
  clienteId?: string;
  numCriancas?: number;
  notas?: string;
  // Festa fields
  tema?: string;
  previsaoCriancas?: number;
  cor?: string;
  bolo?: string;
  // Observações
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;
  // Pagamento
  metodoPagamento?: string;
  valorPago?: number;
  pago?: boolean;
  referenciaPagamento?: string;
  caucao?: string;
  valorCaucao?: number;
  descontoPercentagem?: number;
  descontoMotivo?: string;
  boloQuantidade?: number;
  // Related
  extrasIds?: string[];
  extrasTexto?: Record<string, string>;
  monitoresIds?: string[];
  etapasIds?: string[];
  // Aniversariantes (multiple)
  aniversariantes?: AniversarianteInput[];
  // Participantes
  participantes?: { nome: string; cacifoId?: string }[];
  // Cliente
  clienteNome?: string;
  clienteContacto?: string;
  clienteEmail?: string;
  clienteCodigoPostal?: string;
  adicionarCliente?: boolean;
}

interface UpdateReservaData {
  data?: string;
  horario?: string;
  duracaoMinutos?: number;
  localId?: string;
  clienteId?: string;
  numCriancas?: number;
  notas?: string;
  tema?: string;
  previsaoCriancas?: number;
  cor?: string;
  bolo?: string;
  boloQuantidade?: number;
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;
  metodoPagamento?: string;
  valorPago?: number;
  pago?: boolean;
  referenciaPagamento?: string;
  caucao?: string;
  valorCaucao?: number;
  descontoPercentagem?: number;
  descontoMotivo?: string;
  extrasIds?: string[];
  extrasTexto?: Record<string, string>;
  monitoresIds?: string[];
  etapasIds?: string[];
  aniversariantes?: AniversarianteInput[];
  participantes?: { nome: string; cacifoId?: string }[];
  clienteNome?: string;
  clienteContacto?: string;
  clienteEmail?: string;
  clienteCodigoPostal?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  RESERVA: ["CONFIRMADO", "CANCELADA"],
  CONFIRMADO: ["EM_CURSO", "CANCELADA"],
  EM_CURSO: ["CONCLUIDA"],
  CONCLUIDA: [],
  CANCELADA: [],
};

async function findOrCreateCliente(input: AniversarianteInput): Promise<string> {
  // Try to find existing client by email or telefone
  const existing = await prisma.cliente.findFirst({
    where: {
      OR: [
        ...(input.encarregadoEmail ? [{ email: input.encarregadoEmail }] : []),
        { telefone: input.encarregadoTelefone },
      ],
    },
  });

  if (existing) return existing.id;

  const cliente = await prisma.cliente.create({
    data: {
      nome: input.encarregadoNome,
      email: input.encarregadoEmail,
      telefone: input.encarregadoTelefone,
      contribuinte: input.encarregadoContribuinte,
      codigoPostal: input.encarregadoCodigoPostal,
    },
  });
  return cliente.id;
}

// ── Disponibilidade / conflitos de horário ──────────────────────
export interface ConflitoInfo {
  id: string;
  horario: string;
  duracaoMinutos: number;
  tema?: string | null;
  aniversarianteNome: string;
  estado: string;
}

export interface DisponibilidadeResult {
  disponivel: boolean;
  conflitos: ConflitoInfo[];
}

/** Converte "HH:MM" para minutos desde a meia-noite. */
function horarioParaMinutos(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Procura reservas que se sobrepõem no tempo (considerando a duração)
 * para um dado local + data. Duas reservas conflituam se os seus
 * intervalos [início, fim] se intercetam.
 */
async function findConflitos(params: {
  data: string | Date;
  horario: string;
  duracaoMinutos: number;
  localId: string;
  excludeId?: string;
}): Promise<ConflitoInfo[]> {
  const reservaDate = typeof params.data === "string" ? new Date(params.data) : params.data;
  const nextDay = new Date(reservaDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const candidatos = await prisma.reserva.findMany({
    where: {
      localId: params.localId,
      data: { gte: reservaDate, lt: nextDay },
      estado: { in: ["RESERVA", "CONFIRMADO", "EM_CURSO"] },
      ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
    },
    include: {
      aniversariantes: { include: { aniversariante: true } },
    },
  });

  const novoInicio = horarioParaMinutos(params.horario);
  const novoFim = novoInicio + (params.duracaoMinutos || 0);

  const conflitos: ConflitoInfo[] = [];
  for (const r of candidatos) {
    const existInicio = horarioParaMinutos(r.horario);
    const existFim = existInicio + (r.duracaoMinutos || 0);
    // Sobreposição temporal: novoInicio < existFim && existInicio < novoFim
    if (novoInicio < existFim && existInicio < novoFim) {
      conflitos.push({
        id: r.id,
        horario: r.horario,
        duracaoMinutos: r.duracaoMinutos,
        tema: r.tema,
        aniversarianteNome: r.aniversariantes?.[0]?.aniversariante?.nome ?? "",
        estado: r.estado,
      });
    }
  }
  return conflitos;
}

export const reservaService = {
  async list(filters?: { estado?: string; data?: string; localId?: string; pesquisa?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.data) {
      const date = new Date(filters.data);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.data = { gte: date, lt: nextDay };
    }
    if (filters?.localId) where.localId = filters.localId;
    if (filters?.pesquisa) {
      where.OR = [
        { aniversariantes: { some: { aniversariante: { nome: { contains: filters.pesquisa } } } } },
        { cliente: { nome: { contains: filters.pesquisa } } },
        { cliente: { telefone: { contains: filters.pesquisa } } },
      ];
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.reserva.findMany({
        where,
        orderBy: { data: "desc" },
        skip,
        take: pageSize,
        include: {
          local: true,
          cliente: true,
          aniversariantes: { include: { aniversariante: true } },
          extras: { include: { extra: true } },
          monitores: { include: { monitor: true } },
          cacifos: true,
          participantes: { include: { cacifo: true } },
        },
      }),
      prisma.reserva.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getById(id: string) {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: { include: { cliente: true } } } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
    });
    if (!reserva) throw new Error("NOT_FOUND");
    return reserva;
  },

  /**
   * Verifica a disponibilidade de um local para uma data/horário/duração,
   * considerando sobreposição temporal (não apenas match exato de horário).
   * Não bloqueia — serve apenas para alertar o utilizador antes de gravar.
   */
  async checkDisponibilidade(params: {
    data: string;
    horario: string;
    duracaoMinutos: number;
    localId: string;
    excludeId?: string;
  }): Promise<DisponibilidadeResult> {
    if (!params.data) throw new Error("DATA_REQUIRED");
    if (!params.horario) throw new Error("HORARIO_REQUIRED");
    if (!params.localId) throw new Error("LOCAL_REQUIRED");
    if (!params.duracaoMinutos) throw new Error("DURACAO_REQUIRED");

    const conflitos = await findConflitos(params);
    return { disponivel: conflitos.length === 0, conflitos };
  },

  async create(data: CreateReservaData) {
    if (!data.data) throw new Error("DATA_REQUIRED");
    if (!data.horario) throw new Error("HORARIO_REQUIRED");
    if (!data.localId) throw new Error("LOCAL_REQUIRED");

    let clienteId = data.clienteId;

    // Process aniversariantes if provided
    const aniversarianteIds: string[] = [];
    if (data.aniversariantes && data.aniversariantes.length > 0) {
      for (const anvInput of data.aniversariantes) {
        // Find or create cliente
        const cId = await findOrCreateCliente(anvInput);
        if (!clienteId) clienteId = cId;

        // Create aniversariante
        const anv = await prisma.aniversariante.create({
          data: {
            nome: anvInput.nome,
            dataNascimento: anvInput.dataNascimento ? new Date(anvInput.dataNascimento) : null,
            clienteId: cId,
          },
        });
        aniversarianteIds.push(anv.id);
      }
    }

    if (!clienteId) throw new Error("CLIENTE_REQUIRED");

    const local = await prisma.local.findUnique({ where: { id: data.localId } });
    if (!local) throw new Error("LOCAL_NOT_FOUND");
    if (!local.activo) throw new Error("LOCAL_INACTIVE");

    if (data.numCriancas && data.numCriancas > local.capacidade) {
      throw new Error("CAPACITY_EXCEEDED");
    }

    // Check for conflicts (duration overlap)
    const conflitosCriacao = await findConflitos({
      data: data.data,
      horario: data.horario,
      duracaoMinutos: data.duracaoMinutos,
      localId: data.localId,
    });
    if (conflitosCriacao.length > 0) throw new Error("LOCAL_NOT_AVAILABLE");

    return prisma.reserva.create({
      data: {
        data: new Date(data.data),
        horario: data.horario,
        duracaoMinutos: data.duracaoMinutos,
        localId: data.localId,
        clienteId,
        numCriancas: data.numCriancas || 0,
        notas: data.notas,
        tema: data.tema,
        previsaoCriancas: data.previsaoCriancas,
        cor: data.cor,
        bolo: data.bolo,
        observacoesGerais: data.observacoesGerais,
        observacoesLesoes: data.observacoesLesoes,
        observacoesBrindes: data.observacoesBrindes,
        outrosExtras: data.outrosExtras,
        metodoPagamento: data.metodoPagamento as "DINHEIRO" | "MULTIBANCO" | "MBWAY" | "TRANSFERENCIA" | "CARTAO" | "OUTRO" | undefined,
        valorPago: data.valorPago,
        pago: data.pago ?? false,
        referenciaPagamento: data.referenciaPagamento,
        caucao: (data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA") ?? "NAO_PAGA",
        valorCaucao: data.valorCaucao,
        descontoPercentagem: data.descontoPercentagem,
        descontoMotivo: data.descontoMotivo,
        boloQuantidade: data.boloQuantidade,
        estado: "RESERVA",
        extras: data.extrasIds
          ? { create: data.extrasIds.map((extraId) => ({ extraId, textoPersonalizado: data.extrasTexto?.[extraId] })) }
          : undefined,
        monitores: data.monitoresIds
          ? { create: data.monitoresIds.map((monitorId) => ({ monitorId })) }
          : undefined,
        etapas: data.etapasIds
          ? { create: data.etapasIds.map((etapaId) => ({ etapaId, concluida: false })) }
          : undefined,
        aniversariantes: aniversarianteIds.length > 0
          ? { create: aniversarianteIds.map((aniversarianteId) => ({ aniversarianteId })) }
          : undefined,
        participantes: data.participantes
          ? { create: data.participantes.map((p) => ({ nome: p.nome, cacifoId: p.cacifoId })) }
          : undefined,
      },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
    });
  },

  async update(id: string, data: UpdateReservaData) {
    const reserva = await this.getById(id);
    if (reserva.estado === "EM_CURSO") throw new Error("CANNOT_MODIFY_IN_PROGRESS");

    // Process new aniversariantes if provided
    const aniversarianteIds: string[] = [];
    if (data.aniversariantes && data.aniversariantes.length > 0) {
      for (const anvInput of data.aniversariantes) {
        const cId = await findOrCreateCliente(anvInput);
        const anv = await prisma.aniversariante.create({
          data: {
            nome: anvInput.nome,
            dataNascimento: anvInput.dataNascimento ? new Date(anvInput.dataNascimento) : null,
            clienteId: cId,
          },
        });
        aniversarianteIds.push(anv.id);
      }
    }

    if (data.localId || data.data || data.horario) {
      const conflitosUpdate = await findConflitos({
        data: data.data ?? reserva.data,
        horario: data.horario ?? reserva.horario,
        duracaoMinutos: data.duracaoMinutos ?? reserva.duracaoMinutos,
        localId: data.localId ?? reserva.localId,
        excludeId: id,
      });
      if (conflitosUpdate.length > 0) throw new Error("LOCAL_NOT_AVAILABLE");
    }

    if (data.extrasIds) {
      await prisma.reservaExtra.deleteMany({ where: { reservaId: id } });
    }
    if (data.monitoresIds) {
      await prisma.reservaMonitor.deleteMany({ where: { reservaId: id } });
    }
    if (data.etapasIds) {
      await prisma.reservaEtapa.deleteMany({ where: { reservaId: id } });
    }
    // Sync aniversariantes if new ones provided
    if (aniversarianteIds.length > 0) {
      await prisma.reservaAniversariante.deleteMany({ where: { reservaId: id } });
    }

    return prisma.reserva.update({
      where: { id },
      data: {
        data: data.data ? new Date(data.data) : undefined,
        horario: data.horario,
        duracaoMinutos: data.duracaoMinutos,
        localId: data.localId,
        clienteId: data.clienteId,
        numCriancas: data.numCriancas,
        notas: data.notas,
        tema: data.tema,
        previsaoCriancas: data.previsaoCriancas,
        cor: data.cor,
        bolo: data.bolo,
        observacoesGerais: data.observacoesGerais,
        observacoesLesoes: data.observacoesLesoes,
        observacoesBrindes: data.observacoesBrindes,
        outrosExtras: data.outrosExtras,
        metodoPagamento: data.metodoPagamento as "DINHEIRO" | "MULTIBANCO" | "MBWAY" | "TRANSFERENCIA" | "CARTAO" | "OUTRO" | undefined,
        valorPago: data.valorPago,
        pago: data.pago,
        referenciaPagamento: data.referenciaPagamento,
        caucao: data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA" | undefined,
        valorCaucao: data.valorCaucao,
        descontoPercentagem: data.descontoPercentagem,
        descontoMotivo: data.descontoMotivo,
        boloQuantidade: data.boloQuantidade,
        extras: data.extrasIds
          ? { create: data.extrasIds.map((extraId) => ({ extraId, textoPersonalizado: data.extrasTexto?.[extraId] })) }
          : undefined,
        monitores: data.monitoresIds
          ? { create: data.monitoresIds.map((monitorId) => ({ monitorId })) }
          : undefined,
        etapas: data.etapasIds
          ? { create: data.etapasIds.map((etapaId) => ({ etapaId, concluida: false })) }
          : undefined,
        aniversariantes: aniversarianteIds.length > 0
          ? { create: aniversarianteIds.map((aniversarianteId) => ({ aniversarianteId })) }
          : undefined,
      },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
    });
  },

  async updateStatus(id: string, novoEstado: string) {
    const reserva = await this.getById(id);
    const currentEstado = reserva.estado as string;
    const validNext = VALID_TRANSITIONS[currentEstado];
    if (!validNext || !validNext.includes(novoEstado)) {
      throw new Error("INVALID_STATUS");
    }

    return prisma.reserva.update({
      where: { id },
      data: { estado: novoEstado as "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA" },
    });
  },

  async delete(id: string) {
    const reserva = await this.getById(id);
    if (reserva.estado === "EM_CURSO") throw new Error("CANNOT_DELETE_IN_PROGRESS");

    await prisma.reservaAniversariante.deleteMany({ where: { reservaId: id } });
    await prisma.reservaExtra.deleteMany({ where: { reservaId: id } });
    await prisma.reservaMonitor.deleteMany({ where: { reservaId: id } });
    await prisma.reservaEtapa.deleteMany({ where: { reservaId: id } });
    await prisma.participante.deleteMany({ where: { reservaId: id } });
    return prisma.reserva.delete({ where: { id } });
  },

  async iniciar(id: string) {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: { etapas: true },
    });
    if (!reserva) throw new Error("NOT_FOUND");
    if (reserva.estado !== "CONFIRMADO") throw new Error("RESERVA_NOT_CONFIRMED");
    if (reserva.inicioEm) throw new Error("ALREADY_IN_PROGRESS");

    const inicioEm = new Date();
    const fimPrevisto = new Date(inicioEm.getTime() + reserva.duracaoMinutos * 60000);

    const etapasData: { create?: { etapaId: string; concluida: boolean }[] } = {};
    if (reserva.etapas.length === 0) {
      const activeEtapas = await prisma.etapaFesta.findMany({
        where: { activo: true },
        select: { id: true },
      });
      etapasData.create = activeEtapas.map((etapa: { id: string }) => ({
        etapaId: etapa.id,
        concluida: false,
      }));
    }

    return prisma.reserva.update({
      where: { id },
      data: {
        estado: "EM_CURSO",
        inicioEm,
        fimPrevisto,
        etapas: etapasData,
      },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
    });
  },

  async finalizar(id: string, options?: { custoExcessoManual?: number }) {
    const reserva = await this.getById(id);
    if (reserva.estado !== "EM_CURSO") throw new Error("NOT_IN_PROGRESS");

    const fimReal = new Date();

    // ── Calcular excesso de tempo ──────────────────
    let excessoMinutos = 0;
    let custoExcesso = 0;

    if (reserva.fimPrevisto && fimReal > new Date(reserva.fimPrevisto)) {
      excessoMinutos = Math.floor(
        (fimReal.getTime() - new Date(reserva.fimPrevisto).getTime()) / (1000 * 60),
      );
      // Sugere o preço fixo de excesso do tarifário global
      custoExcesso = await configuracaoPrecoService.getPrecoExcesso();
    }

    // Valor manual do utilizador prevalece sobre o sugerido
    if (options?.custoExcessoManual !== undefined) {
      custoExcesso = options.custoExcessoManual;
    }

    const custoTotalFinal = Number(reserva.valorPago ?? 0) + custoExcesso;

    // Save cacifos snapshot before releasing
    const cacifos = await prisma.cacifo.findMany({
      where: { reservaId: id },
      select: { numero: true, estado: true, notas: true, criancas: true },
      orderBy: { numero: "asc" },
    });
    const cacifosHistorico = cacifos.map(
      (c: { numero: number; estado: string; notas: string | null; criancas: string | null }) => ({
        numero: c.numero,
        estado: c.estado,
        notas: c.notas,
        criancas: c.criancas,
      })
    );

    // Release all cacifos
    await prisma.cacifo.updateMany({
      where: { reservaId: id },
      data: { estado: "LIVRE", reservaId: null, notas: null, criancas: null },
    });

    return prisma.reserva.update({
      where: { id },
      data: {
        estado: "CONCLUIDA",
        fimReal,
        cacifosHistorico,
        excessoMinutos,
        custoExcesso,
        custoTotalFinal,
      },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
    });
  },

  async alocarMonitor(reservaId: string, monitorId: string) {
    await this.getById(reservaId);
    const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) throw new Error("MONITOR_NOT_FOUND");
    if (!monitor.activo) throw new Error("MONITOR_INACTIVE");
    return prisma.reservaMonitor.create({ data: { reservaId, monitorId } });
  },

  async removerMonitor(reservaId: string, monitorId: string) {
    return prisma.reservaMonitor.delete({
      where: { reservaId_monitorId: { reservaId, monitorId } },
    });
  },

  async toggleEtapa(reservaId: string, etapaId: string) {
    await this.getById(reservaId);
    const reservaEtapa = await prisma.reservaEtapa.findUnique({
      where: { reservaId_etapaId: { reservaId, etapaId } },
    });
    if (!reservaEtapa) throw new Error("ETAPA_NOT_FOUND");

    const concluida = !reservaEtapa.concluida;
    return prisma.reservaEtapa.update({
      where: { id: reservaEtapa.id },
      data: { concluida, concluidaEm: concluida ? new Date() : null },
      include: { etapa: true },
    });
  },

  async getActive() {
    return prisma.reserva.findMany({
      where: { estado: "EM_CURSO" },
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
      orderBy: { inicioEm: "asc" },
    });
  },

  async getConcluidas(data?: string) {
    const where: Record<string, unknown> = { estado: "CONCLUIDA" };
    if (data) {
      const date = new Date(data);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.fimReal = { gte: date, lt: nextDay };
    }
    return prisma.reserva.findMany({
      where,
      include: {
        local: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
      orderBy: { fimReal: "desc" },
    });
  },

  async removerEtapa(reservaId: string, etapaId: string) {
    await this.getById(reservaId);
    const reservaEtapa = await prisma.reservaEtapa.findUnique({
      where: { reservaId_etapaId: { reservaId, etapaId } },
    });
    if (!reservaEtapa) throw new Error("ETAPA_NOT_FOUND");
    return prisma.reservaEtapa.delete({ where: { id: reservaEtapa.id } });
  },

  async marcarEtapasConcluidas(reservaId: string) {
    await this.getById(reservaId);
    const now = new Date();
    await prisma.reservaEtapa.updateMany({
      where: { reservaId, concluida: false },
      data: { concluida: true, concluidaEm: now },
    });
    return prisma.reservaEtapa.findMany({
      where: { reservaId },
      include: { etapa: true },
      orderBy: { etapa: { ordem: "asc" } },
    });
  },
};