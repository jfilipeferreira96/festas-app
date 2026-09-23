import prisma from "@festas/db";
import { Prisma } from "@prisma/client";
import type { CriarPagamentoDTO, MetodoPagamento, TipoBolo, EstadoReserva } from "@saas/shared-types";
import logger from "@/lib/logger";
import { enfileirarEmailConfirmacaoReserva } from "@/services/email.service";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";
import { excecaoCalendarioService } from "@/services/excecaoCalendario.service";
import { cacifoService } from "@/services/cacifo.service";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";

/** Utilizador autenticado (para auditoria dos ajustes iniciais). */
interface SessionUser {
  id: string;
  name?: string;
}
import { menuService } from "@/services/menu.service";
import {
  normalizarPagamentos,
  sincronizarPagamentosReserva,
  rederivarPagoReserva,
  somaPagamentos,
  type PagamentoInput,
} from "@/services/pagamento.service";

/** Tolerância de cêntimos para comparação soma(pagamentos) >= total. */
const EPS = 0.004;

interface AniversarianteInput {
  nome: string;
  dataNascimento: string;
  // Parent/encarregado data
  encarregadoNome: string;
  encarregadoEmail: string;
  encarregadoTelefone: string;
  encarregadoContribuinte?: string;
  encarregadoCodigoPostal?: string;
}

interface CreateReservaData {
  /** Acertos iniciais (criação): gravados após criar, com write-through + auditoria. */
  ajustes?: { tipo: "ACRESCIMO" | "DESCONTO"; valor: number; motivo: string; metodoPagamento?: string }[];
  data: string;
  horario: string;
   horaLanche?: string;
   salaLancheId?: string;
   duracaoMinutos: number;
   clienteId?: string;
  numCriancas?: number;
  notas?: string;
  menuId?: string | null;
  // Festa fields
  tema?: string;
  previsaoCriancas?: number;
  numAdultos?: number;
  cor?: string;
  bolo?: TipoBolo;
  boloTema?: string;
  numCriancasConfirmadas?: number;
  /** Nº total de crianças que apareceram na festa (receção/conclusão). */
  numCriancasPresentes?: number | null;
  /** Enviar email de confirmação ao cliente na criação (default true; o backend
   *  respeita sempre o optOut global do cliente). */
  enviarEmail?: boolean;
  notasCacifos?: string;
  notasLanche?: string;
  // Observações
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;
  // Pagamento
  valorTotal?: number;
  pago?: boolean;
  caucao?: string;
  valorCaucao?: number;
  metodoCaucao?: string;
  descontoPercentagem?: number;
  descontoMotivo?: string;
  boloQuantidade?: number;
  // Ledger de pagamentos (fonte única do recebido)
  pagamentos?: CriarPagamentoDTO[];
  // Meias (compra obrigatória)
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;
  // Related
  extrasIds?: string[];
  extrasTexto?: Record<string, string>;
  extrasQuantidades?: Record<string, number>;
  monitoresIds?: string[];
  etapasIds?: string[];
  // Aniversariantes (multiple)
  aniversariantes?: AniversarianteInput[];
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
   horaLanche?: string;
   salaLancheId?: string;
   duracaoMinutos?: number;
   clienteId?: string;
  numCriancas?: number;
  notas?: string;
  menuId?: string | null;
  tema?: string;
  previsaoCriancas?: number;
  numAdultos?: number;
  cor?: string;
  bolo?: TipoBolo;
  boloTema?: string;
  boloQuantidade?: number;
  numCriancasConfirmadas?: number;
  /** Nº total de crianças que apareceram na festa (receção/conclusão). */
  numCriancasPresentes?: number | null;
  notasCacifos?: string;
  notasLanche?: string;
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;
  valorTotal?: number | null;
  pago?: boolean;
  caucao?: string;
  valorCaucao?: number;
  metodoCaucao?: string;
  descontoPercentagem?: number;
  descontoMotivo?: string;
  // Ledger de pagamentos - substitui o ledger existente (replace-all)
  pagamentos?: CriarPagamentoDTO[] | null;
  // Meias (compra obrigatória)
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;
  extrasIds?: string[];
  extrasTexto?: Record<string, string>;
  extrasQuantidades?: Record<string, number>;
  monitoresIds?: string[];
  etapasIds?: string[];
  aniversariantes?: AniversarianteInput[];
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

/**
 * Caução 100% paga promove a festa de RESERVA para CONFIRMADO (estado
 * seguinte; pedido do cliente, 22/09/2026). Nunca des-promove: PAGA_NO_DIA
 * e NAO_PAGA não alteram o estado, e estados posteriores mantêm-se.
 */
function estadoAposCaucao(
  estadoActual: string,
  caucaoResultante: string | undefined | null
): EstadoReserva {
  if (estadoActual === "RESERVA" && caucaoResultante === "PAGA") return "CONFIRMADO";
  return estadoActual as EstadoReserva;
}

const BOLO_SEM_QUANTIDADE: readonly string[] = ["PAIS_TRAZEM", "A_DECIDIR"];

function quantidadeDeExtra(quantidades: Record<string, number> | undefined, extraId: string) {
  const q = quantidades?.[extraId];
  return Math.max(1, Math.round(q ?? 1));
}

function normalizarBoloQuantidade(bolo: TipoBolo | undefined, quantidade: number | null | undefined) {
  if (!bolo || BOLO_SEM_QUANTIDADE.includes(bolo)) return null;
  return quantidade && quantidade > 0 ? Math.round(quantidade) : 1;
}

/** Converte "YYYY-MM-DD" (ou ISO) em Date; erro do cliente se inválida. */
function parseDataObrigatoria(valor: string | undefined | null, codigo: string): Date {
  const d = new Date(valor ?? "");
  if (!valor || Number.isNaN(d.getTime())) throw new Error(codigo);
  return d;
}

async function findOrCreateCliente(input: AniversarianteInput): Promise<string> {
  const email = input.encarregadoEmail?.trim() || undefined;
  const telefone = input.encarregadoTelefone?.trim() || "";
  if (!email && !telefone) {
    throw new Error("CLIENTE_REQUIRED");
  }

  // Try to find existing client by email or telefone
  const where = {
    OR: [
      ...(email ? [{ email }] : []),
      ...(telefone ? [{ telefone }] : []),
    ],
  };
  const existing = await prisma.cliente.findFirst({ where });

  if (existing) return existing.id;

  try {
    // email undefined → coluna NULL (nunca ""), para não esgotar o unique
    // com vários clientes "sem email".
    const cliente = await prisma.cliente.create({
      data: {
        nome: input.encarregadoNome,
        email,
        telefone,
        contribuinte: input.encarregadoContribuinte,
        codigoPostal: input.encarregadoCodigoPostal,
      },
    });
    return cliente.id;
  } catch (err) {
    // Corrida: outro pedido criou o mesmo cliente entretanto (P2002 unique).
    // Resolve re-procurando - o resultado para o utilizador é o mesmo.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const cliente = await prisma.cliente.findFirst({ where });
      if (cliente) return cliente.id;
    }
    throw err;
  }
}

/**
 * Reutiliza a criança (Aniversariante) já registada do cliente com o mesmo
 * nome; só cria nova se não existir. Sem isto, cada criar/editar festa
 * duplicava os filhos na tabela (e o form de entrada já deduplicava por nome).
 */
async function obterOuCriarAniversariante(
  clienteId: string,
  nome: string,
  dataNascimento: Date
): Promise<string> {
  const nomeLimpo = nome.trim();
  const existente = await prisma.aniversariante.findFirst({
    where: { clienteId, nome: nomeLimpo },
    select: { id: true, dataNascimento: true },
  });
  if (existente) {
    // Completar a data em falta (registos antigos de entradas livres vêm sem ela)
    if (!existente.dataNascimento) {
      await prisma.aniversariante.update({
        where: { id: existente.id },
        data: { dataNascimento },
      });
    }
    return existente.id;
  }
  const anv = await prisma.aniversariante.create({
    data: { nome: nomeLimpo, dataNascimento, clienteId },
  });
  return anv.id;
}

/**
 * Faz upsert (ou remove) o registo Menu da reserva a partir do Extra de
 * categoria MENU seleccionado no formulário (menuId).
 * - menuId string → resolve o Extra e cria/atualiza o Menu (nome + preço)
 * - menuId null   → remove o menu existente (utilizador limpou a seleção)
 */
async function syncMenuFromExtra(reservaId: string, menuId: string | null | undefined) {
  if (menuId === undefined) return;

  if (menuId === null) {
    await prisma.menu.deleteMany({ where: { reservaId } });
    return;
  }

  const extra = await prisma.extra.findUnique({ where: { id: menuId } });
  if (!extra || extra.categoria !== "MENU") throw new Error("MENU_NOT_FOUND");

  await menuService.createOrUpdateForReserva(reservaId, {
    nome: extra.nome,
    preco: Number(extra.precoUnitario),
  });
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
 * para uma dada data. Duas reservas conflituam se os seus
 * intervalos [início, fim] se intercetam E partilham a sala de lanche
 * (pares da grelha à mesma hora em salas distintas são legítimos - sem aviso).
 */
async function findConflitos(params: {
  data: string | Date;
  horario: string;
  duracaoMinutos: number;
  salaLancheId?: string | null;
  excludeId?: string;
}): Promise<ConflitoInfo[]> {
  const reservaDate = typeof params.data === "string" ? new Date(params.data) : params.data;
  const nextDay = new Date(reservaDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const candidatos = await prisma.reserva.findMany({
    where: {
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
  const novaSala = params.salaLancheId ?? null;

  const conflitos: ConflitoInfo[] = [];
  for (const r of candidatos) {
    const existInicio = horarioParaMinutos(r.horario);
    const existFim = existInicio + (r.duracaoMinutos || 0);
    // Sobreposição temporal: novoInicio < existFim && existInicio < novoFim
    if (novoInicio < existFim && existInicio < novoFim) {
      const salaExistente = r.salaLancheId ?? null;
      // Salas distintas e ambas conhecidas → não é conflito (grelha por pares).
      if (salaExistente !== null && novaSala !== null && salaExistente !== novaSala) continue;
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

/**
 * Guard de capacidade por (horário, sala): a grelha diária define a capacidade
 * do dia. Um horário só pode ter uma festa activa POR SALA de lanche; festa
 * sem sala conflita com qualquer festa no mesmo horário (regra conservadora -
 * mantém cada horário limitado a máx. 2 festas, 1 por sala).
 */
async function verificarSlotOcupado(params: {
  data: string | Date;
  horario: string;
  salaLancheId?: string | null;
  excludeId?: string;
}): Promise<void> {
  const reservaDate = typeof params.data === "string" ? new Date(params.data) : params.data;
  const nextDay = new Date(reservaDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const existentes = await prisma.reserva.findMany({
    where: {
      data: { gte: reservaDate, lt: nextDay },
      horario: params.horario,
      estado: { in: ["RESERVA", "CONFIRMADO", "EM_CURSO"] },
      ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
    },
    select: { id: true, salaLancheId: true },
  });

  const novaSala = params.salaLancheId ?? null;
  const conflito = existentes.some((r) => {
    const salaExistente = r.salaLancheId ?? null;
    return salaExistente === null || novaSala === null || salaExistente === novaSala;
  });
  if (conflito) throw new Error("SLOT_OCCUPIED");
}

/**
 * IDs de Extra obrigatórios para um (dia, horário): slots activos com esse
 * `horaInicio` exacto que se aplicam ao tipo de dia (fimDeSemana null = ambos).
 */
async function extrasObrigatoriosDoSlot(dataFesta: Date, horario: string): Promise<string[]> {
  const fdsOuFeriado =
    dataFesta.getDay() === 0 ||
    dataFesta.getDay() === 6 ||
    (await excecaoCalendarioService.isFeriado(dataFesta).catch(() => false));
  const slots = await prisma.slotHorario.findMany({
    where: { horaInicio: horario, activo: true },
    select: { fimDeSemana: true, extrasObrigatorios: true },
  });
  const ids = slots
    .filter((s) => s.fimDeSemana === null || s.fimDeSemana === fdsOuFeriado)
    .flatMap((s) =>
      Array.isArray(s.extrasObrigatorios)
        ? s.extrasObrigatorios.filter((x): x is string => typeof x === "string")
        : []
    );
  return Array.from(new Set(ids));
}

/**
 * Junta os extras obrigatórios do slot aos extras do payload. Quantidade:
 * já informada no payload → mantém; senão total de crianças se o extra é
 * POR_PESSOA → senão 1. Devolve null quando não há nada a acrescentar.
 */
async function mergeExtrasObrigatorios(
  idsObrigatorios: string[],
  extrasIds: string[] | undefined,
  extrasQuantidades: Record<string, number> | undefined,
  numCriancas: number | undefined
): Promise<{ ids: string[]; quantidades: Record<string, number> } | null> {
  if (idsObrigatorios.length === 0) return null;
  const extras = await prisma.extra.findMany({
    where: { id: { in: idsObrigatorios } },
    select: { id: true, baseCobranca: true },
  });
  const baseCobrancaDe = new Map(extras.map((e) => [e.id, e.baseCobranca]));
  const ids = [...(extrasIds ?? [])];
  const quantidades = { ...(extrasQuantidades ?? {}) };
  for (const id of idsObrigatorios) {
    if (!ids.includes(id)) ids.push(id);
    if (quantidades[id] === undefined) {
      quantidades[id] =
        baseCobrancaDe.get(id) === "POR_PESSOA" && numCriancas && numCriancas > 0
          ? numCriancas
          : 1;
    }
  }
  return { ids, quantidades };
}

export const reservaService = {
  async list(filters?: { estado?: string; data?: string; dataInicio?: string; dataFim?: string; pesquisa?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.data) {
      const date = new Date(filters.data);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.data = { gte: date, lt: nextDay };
    } else if (filters?.dataInicio || filters?.dataFim) {
      const range: Record<string, Date> = {};
      if (filters?.dataInicio) range.gte = new Date(filters.dataInicio);
      if (filters?.dataFim) {
        const end = new Date(filters.dataFim);
        end.setDate(end.getDate() + 1);
        range.lt = end;
      }
      where.data = range;
    }
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
          salaLanche: true,
          cliente: true,
          aniversariantes: { include: { aniversariante: true } },
          extras: { include: { extra: true } },
          monitores: { include: { monitor: true } },
          cacifos: true,
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
        cliente: true,
        aniversariantes: { include: { aniversariante: { include: { cliente: true } } } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!reserva) throw new Error("NOT_FOUND");
    return reserva;
  },

  /**
   * Verifica a disponibilidade para uma data/horário/duração,
   * considerando sobreposição temporal com festas activas do dia.
   * Não bloqueia - serve apenas para alertar o utilizador antes de gravar.
   */
  async checkDisponibilidade(params: {
    data: string;
    horario: string;
    duracaoMinutos: number;
    salaLancheId?: string | null;
    excludeId?: string;
  }): Promise<DisponibilidadeResult> {
    if (!params.data) throw new Error("DATA_REQUIRED");
    if (!params.horario) throw new Error("HORARIO_REQUIRED");
    if (!params.duracaoMinutos) throw new Error("DURACAO_REQUIRED");

    const conflitos = await findConflitos(params);
    return { disponivel: conflitos.length === 0, conflitos };
  },

  async create(data: CreateReservaData, user?: SessionUser) {
    // Datas inválidas são erro do cliente (400), não do Prisma (500)
    const dataFesta = parseDataObrigatoria(data.data, "DATA_REQUIRED");
    if (!data.horario) throw new Error("HORARIO_REQUIRED");

    // Verificar dia bloqueado no calendário
    const bloqueado = await excecaoCalendarioService.isBloqueado(dataFesta);
    if (bloqueado) throw new Error("DAY_BLOCKED");

    // Capacidade: um slot (horário exacto) só pode ter uma festa activa POR
    // SALA; sem sala → conservador (conflita com tudo no mesmo horário).
    // Corre ANTES de criar clientes/aniversariantes para não deixar órfãos
    // quando o pedido é rejeitado.
    await verificarSlotOcupado({
      data: dataFesta,
      horario: data.horario,
      salaLancheId: data.salaLancheId,
    });

    let clienteId = data.clienteId;

    // Process aniversariantes if provided
    const aniversarianteIds: string[] = [];
    if (data.aniversariantes && data.aniversariantes.length > 0) {
      for (const anvInput of data.aniversariantes) {
        const dataNascimento = parseDataObrigatoria(anvInput.dataNascimento, "DATA_NASCIMENTO_REQUIRED");

        const anvComEncarregado: AniversarianteInput = {
          ...anvInput,
          encarregadoNome: data.clienteNome ?? anvInput.encarregadoNome ?? "",
          encarregadoEmail: data.clienteEmail ?? anvInput.encarregadoEmail,
          encarregadoTelefone: data.clienteContacto ?? anvInput.encarregadoTelefone,
          encarregadoCodigoPostal: data.clienteCodigoPostal ?? anvInput.encarregadoCodigoPostal,
        };

        // Find or create cliente
        const cId = await findOrCreateCliente(anvComEncarregado);
        if (!clienteId) clienteId = cId;

        // Reutilizar filho já registado (evita duplicados por nome)
        const anvId = await obterOuCriarAniversariante(
          cId,
          anvInput.nome ?? "",
          dataNascimento
        );
        aniversarianteIds.push(anvId);
      }
    }

    if (!clienteId) throw new Error("CLIENTE_REQUIRED");

    // ── Cálculo de preço por criança (com mínimos por aniversariante) ──
    // O menu selecionado DEFINE o preço por criança (o tarifário da data só
    // se aplica "Sem menu"); o menu Basy por defeito coincide com o tarifário,
    // menus mais caros (ex.: Landy) sobrepõem-no.
    let precoCriancaMenu: number | undefined;
    if (data.menuId) {
      const menuExtra = await prisma.extra.findUnique({
        where: { id: data.menuId },
        select: { id: true, categoria: true, precoUnitario: true },
      });
      if (menuExtra && menuExtra.categoria === "MENU") {
        precoCriancaMenu = Number(menuExtra.precoUnitario);
      }
    }
    const numAniversariantes = aniversarianteIds.length;
    const calculo = await configuracaoPrecoService.calcularPrecoFesta(
      dataFesta,
      data.numCriancas || 0,
      numAniversariantes,
      precoCriancaMenu
    );

    // ── Extras obrigatórios do slot: merge no payload (o servidor é a fonte
    // de verdade - o FestaForm também força, mas não é obrigatório passar) ──
    const mergedExtras = await mergeExtrasObrigatorios(
      await extrasObrigatoriosDoSlot(dataFesta, data.horario),
      data.extrasIds,
      data.extrasQuantidades,
      data.numCriancas
    );
    const extrasIdsFinais = mergedExtras?.ids ?? data.extrasIds;
    const extrasQuantidadesFinais = mergedExtras?.quantidades ?? data.extrasQuantidades;

    // ── Cálculo de custo de meias (auto-preencher preço unitário do tarifário) ──
    let meiasPrecoUnit = data.meiasPrecoUnit;
    if (data.meiasQuantidade && meiasPrecoUnit === undefined) {
      meiasPrecoUnit = Number((await configuracaoPrecoService.getConfig()).precoMeias);
    }

    // ── Ledger de pagamentos (fonte única do recebido); [] = limpar ──
    const listaPagamentos: PagamentoInput[] =
      data.pagamentos !== undefined ? normalizarPagamentos(data.pagamentos) ?? [] : [];

    const created = await prisma.reserva.create({
      data: {
        data: dataFesta,
        horario: data.horario,
        duracaoMinutos: data.duracaoMinutos,
        clienteId,
        numCriancas: data.numCriancas || 0,
        precoCriancaAplicado: calculo.precoCrianca,
        minimoCriancas: calculo.minimoCriancas,
        notas: data.notas,
        tema: data.tema,
        previsaoCriancas: data.previsaoCriancas,
        numAdultos: data.numAdultos ?? 0,
        cor: data.cor,
        bolo: data.bolo,
        boloTema: data.boloTema,
        boloQuantidade: normalizarBoloQuantidade(data.bolo, data.boloQuantidade),
        numCriancasConfirmadas: data.numCriancasConfirmadas,
        notasCacifos: data.notasCacifos,
        notasLanche: data.notasLanche,
        horaLanche: data.horaLanche,
        salaLancheId: data.salaLancheId,
        observacoesGerais: data.observacoesGerais,
        observacoesLesoes: data.observacoesLesoes,
        observacoesBrindes: data.observacoesBrindes,
        outrosExtras: data.outrosExtras,
        valorTotal: data.valorTotal,
        // Estado `pago` derivado do ledger (soma >= total acordado)
        pago: data.pago ?? (data.valorTotal != null ? somaPagamentos(listaPagamentos) >= data.valorTotal - EPS : false),
        caucao: (data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA") ?? "NAO_PAGA",
        valorCaucao: data.valorCaucao,
        metodoCaucao: data.metodoCaucao as MetodoPagamento | undefined,
        descontoPercentagem: data.descontoPercentagem,
        descontoMotivo: data.descontoMotivo,
        meiasQuantidade: data.meiasQuantidade,
        meiasPrecoUnit,
        // Caução já paga na criação → nasce directamente CONFIRMADA
        estado: data.caucao === "PAGA" ? "CONFIRMADO" : "RESERVA",
        extras: extrasIdsFinais
          ? {
              create: extrasIdsFinais.map((extraId) => ({
                extraId,
                quantidade: quantidadeDeExtra(extrasQuantidadesFinais, extraId),
                textoPersonalizado: data.extrasTexto?.[extraId],
              })),
            }
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
        pagamentos: listaPagamentos.length > 0
          ? {
              create: listaPagamentos.map((p) => ({
                valor: p.valor,
                metodo: p.metodo,
                referencia: p.referencia ?? null,
                nota: p.nota ?? null,
              })),
            }
          : undefined,
      },
      include: {
        salaLanche: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
      },
    });

    await syncMenuFromExtra(created.id, data.menuId);

    // ── Pré-reserva de cacifos: reserva automaticamente N cacifos para o dia
    // da festa (N = confirmadas ?? previstas, igual ao top-up do iniciar()),
    // com nome por preencher. A equipa de cacifos depois só preenche no dia.
    const alvoCacifos =
      created.numCriancasConfirmadas || created.numCriancas || created.previsaoCriancas || 0;
    if (alvoCacifos > 0) {
      await cacifoService.preReservarCacifos(created.id, alvoCacifos);
    }

    // ── Email de confirmação ao cliente (fire-and-forget: um falha de email
    // NUNCA falha a criação da reserva). Condições: opt-in da marcação +
    // optOut global do cliente + email conhecido.
    if (data.enviarEmail !== false && created.cliente?.optOut !== true && created.cliente?.email) {
      void enfileirarEmailConfirmacaoReserva(created.id).catch((err: unknown) => {
        logger.error("Falha ao enfileirar email de confirmação da reserva", {
          reservaId: created.id,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }

    // ── Acertos iniciais (tab "Acertos" do form na criação): gravados DEPOIS
    // da reserva existir (tabela AjustePagamento, write-through no valorTotal
    // com auditoria do autor). Depois dos pagamentos para o estado `pago`
    // re-derivar contra o total final. Um acerto inválido falha a criação
    // (payload inválido é erro do cliente).
    if (data.ajustes?.length) {
      for (const ajuste of data.ajustes) {
        await ajustePagamentoService.create(
          {
            tipo: ajuste.tipo,
            valor: ajuste.valor,
            motivo: ajuste.motivo,
            metodoPagamento: ajuste.metodoPagamento as MetodoPagamento | undefined,
            reservaId: created.id,
          },
          user
        );
      }
      // Total mudou (write-through) - devolver a reserva fresca
      return this.getById(created.id);
    }

    return created;
  },

  async update(id: string, data: UpdateReservaData) {
    const reserva = await this.getById(id);
    if (reserva.estado === "EM_CURSO") throw new Error("CANNOT_MODIFY_IN_PROGRESS");

    // Process new aniversariantes if provided
    const aniversarianteIds: string[] = [];
    if (data.aniversariantes && data.aniversariantes.length > 0) {
      for (const anvInput of data.aniversariantes) {
        const dataNascimento = parseDataObrigatoria(anvInput.dataNascimento, "DATA_NASCIMENTO_REQUIRED");

        const anvComEncarregado: AniversarianteInput = {
          ...anvInput,
          encarregadoNome: data.clienteNome ?? anvInput.encarregadoNome ?? "",
          encarregadoEmail: data.clienteEmail ?? anvInput.encarregadoEmail,
          encarregadoTelefone: data.clienteContacto ?? anvInput.encarregadoTelefone,
          encarregadoCodigoPostal: data.clienteCodigoPostal ?? anvInput.encarregadoCodigoPostal,
        };
        const cId = await findOrCreateCliente(anvComEncarregado);
        // Reutilizar filho já registado (evita duplicados em cada gravação)
        const anvId = await obterOuCriarAniversariante(
          cId,
          anvInput.nome ?? "",
          dataNascimento
        );
        aniversarianteIds.push(anvId);
      }
    }

    // Verificar dia bloqueado se a data foi alterada
    if (data.data) {
      const dataFesta = parseDataObrigatoria(data.data, "DATA_REQUIRED");
      const bloqueado = await excecaoCalendarioService.isBloqueado(dataFesta);
      if (bloqueado) throw new Error("DAY_BLOCKED");
    }

    if (data.data || data.horario || data.salaLancheId !== undefined) {
      // Capacidade: um horário só pode ter uma festa activa POR SALA.
      await verificarSlotOcupado({
        data: data.data ?? reserva.data,
        horario: data.horario ?? reserva.horario,
        salaLancheId: data.salaLancheId ?? reserva.salaLancheId,
        excludeId: id,
      });
    }

    // ── Ledger de pagamentos (replace-all); undefined = sem alterações ──
    const listaPagamentos: PagamentoInput[] | undefined =
      data.pagamentos !== undefined ? normalizarPagamentos(data.pagamentos) ?? [] : undefined;
    if (listaPagamentos !== undefined) {
      await prisma.pagamento.deleteMany({ where: { reservaId: id } });
    }

    // ── Extras obrigatórios do slot ──
    // Com extrasIds no payload → merge nos arrays. Sem → garantir os extras
    // obrigatórios em falta nos extras JÁ existentes da reserva.
    const dataFestaUpdate = data.data ? parseDataObrigatoria(data.data, "DATA_REQUIRED") : reserva.data;
    const horarioUpdate = data.horario ?? reserva.horario;
    const mergedExtrasUpdate =
      data.extrasIds !== undefined
        ? await mergeExtrasObrigatorios(
            await extrasObrigatoriosDoSlot(dataFestaUpdate, horarioUpdate),
            data.extrasIds,
            data.extrasQuantidades,
            data.numCriancas ?? reserva.numCriancas ?? undefined
          )
        : null;
    const extrasIdsUpdate = mergedExtrasUpdate?.ids ?? data.extrasIds;
    const extrasQuantidadesUpdate = mergedExtrasUpdate?.quantidades ?? data.extrasQuantidades;

    if (extrasIdsUpdate) {
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

    await prisma.reserva.update({
      where: { id },
      data: {
        data: data.data ? new Date(data.data) : undefined,
        horario: data.horario,
        horaLanche: data.horaLanche,
        salaLancheId: data.salaLancheId,
        duracaoMinutos: data.duracaoMinutos,
        clienteId: data.clienteId,
        numCriancas: data.numCriancas,
        notas: data.notas,
        tema: data.tema,
        previsaoCriancas: data.previsaoCriancas,
        ...(data.numAdultos !== undefined && { numAdultos: data.numAdultos }),
        cor: data.cor,
        bolo: data.bolo,
        boloTema: data.boloTema,
        boloQuantidade:
          data.bolo !== undefined
            ? normalizarBoloQuantidade(data.bolo, data.boloQuantidade ?? (reserva.boloQuantidade ?? undefined))
            : data.boloQuantidade,
        numCriancasConfirmadas: data.numCriancasConfirmadas,
        ...(data.numCriancasPresentes !== undefined && { numCriancasPresentes: data.numCriancasPresentes }),
        notasCacifos: data.notasCacifos,
        notasLanche: data.notasLanche,
        observacoesGerais: data.observacoesGerais,
        observacoesLesoes: data.observacoesLesoes,
        observacoesBrindes: data.observacoesBrindes,
        outrosExtras: data.outrosExtras,
        valorTotal: data.valorTotal === undefined ? undefined : data.valorTotal,
        pago: data.pago,
        caucao: data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA" | undefined,
        estado: estadoAposCaucao(reserva.estado as string, data.caucao as string | undefined),
        valorCaucao: data.valorCaucao,
        metodoCaucao: data.metodoCaucao as MetodoPagamento | undefined,
        descontoPercentagem: data.descontoPercentagem,
        descontoMotivo: data.descontoMotivo,
        meiasQuantidade: data.meiasQuantidade,
        meiasPrecoUnit: data.meiasPrecoUnit,
        extras: extrasIdsUpdate
          ? {
              create: extrasIdsUpdate.map((extraId) => ({
                extraId,
                quantidade: quantidadeDeExtra(extrasQuantidadesUpdate, extraId),
                textoPersonalizado: data.extrasTexto?.[extraId],
              })),
            }
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
        pagamentos: listaPagamentos !== undefined && listaPagamentos.length > 0
          ? {
              create: listaPagamentos.map((p) => ({
                valor: p.valor,
                metodo: p.metodo,
                referencia: p.referencia ?? null,
                nota: p.nota ?? null,
              })),
            }
          : undefined,
      },
      include: {
        salaLanche: true,
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
      },
    });

    // Hardening: se o total acordado mudou sem ledger no pedido, o estado
    // `pago` tem de ser re-derivado (mesma classe de bug fechada nos acertos)
    if (data.valorTotal !== undefined && data.pago === undefined) {
      await rederivarPagoReserva(prisma, id);
    }

    // Sem extrasIds no payload: adicionar aos extras existentes os obrigatórios
    // do slot em falta (festa antiga criada antes da regra → ao editar, o
    // servidor garante o extra; quantidade = crianças se POR_PESSOA).
    if (data.extrasIds === undefined) {
      const obrig = await extrasObrigatoriosDoSlot(dataFestaUpdate, horarioUpdate);
      if (obrig.length > 0) {
        const existentes = await prisma.reservaExtra.findMany({
          where: { reservaId: id },
          select: { extraId: true },
        });
        const emFalta = obrig.filter((x) => !existentes.some((e) => e.extraId === x));
        if (emFalta.length > 0) {
          const extrasInfo = await prisma.extra.findMany({
            where: { id: { in: emFalta } },
            select: { id: true, baseCobranca: true },
          });
          await prisma.reservaExtra.createMany({
            data: emFalta.map((extraId) => ({
              reservaId: id,
              extraId,
              quantidade:
                extrasInfo.find((e) => e.id === extraId)?.baseCobranca === "POR_PESSOA" &&
                (data.numCriancas ?? reserva.numCriancas ?? 0) > 0
                  ? (data.numCriancas ?? reserva.numCriancas as number)
                  : 1,
            })),
          });
        }
      }
    }

    if (data.menuId !== undefined) {
      await syncMenuFromExtra(id, data.menuId);
    }

    return this.getById(id);
  },

  async updateStatus(id: string, novoEstado: string) {
    const reserva = await this.getById(id);
    const currentEstado = reserva.estado as string;
    const validNext = VALID_TRANSITIONS[currentEstado];
    if (!validNext || !validNext.includes(novoEstado)) {
      throw new Error("INVALID_STATUS");
    }

    // Cancelar liberta os cacifos pré-reservados/ocupados da festa - sem isto
    // ficariam presos em RESERVADO (a FK não limpa o estado).
    if (novoEstado === "CANCELADA") {
      await cacifoService.libertarCacifosDaReserva(id);
    }

    return prisma.reserva.update({
      where: { id },
      data: { estado: novoEstado as "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA" },
    });
  },

  async atualizarPagamento(id: string, data: {
    valorTotal?: number | null;
    /** Ledger de pagamentos - substitui o ledger existente (replace-all). */
    pagamentos?: CriarPagamentoDTO[] | null;
    caucao?: string;
    valorCaucao?: number;
    metodoCaucao?: string;
    descontoPercentagem?: number;
    descontoMotivo?: string;
  }) {
    const reserva = await this.getById(id);
    if (!reserva) throw new Error("NOT_FOUND");

    // ── Resolver o ledger: undefined = sem alterações de pagamento ──
    const lista = data.pagamentos !== undefined ? normalizarPagamentos(data.pagamentos) ?? [] : undefined;

    if (lista === undefined) {
      // Só campos auxiliares (total, caução, desconto).
      // Se o total acordado mudou, re-derivar `pago` (o recebido não mudou).
      if (data.valorTotal === undefined) {
        return prisma.reserva.update({
          where: { id },
          data: {
            caucao: data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA" | undefined,
            estado: estadoAposCaucao(reserva.estado as string, data.caucao as string | undefined),
            valorCaucao: data.valorCaucao,
            metodoCaucao: data.metodoCaucao as MetodoPagamento | undefined,
            descontoPercentagem: data.descontoPercentagem,
            descontoMotivo: data.descontoMotivo,
          },
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.reserva.update({
          where: { id },
          data: {
            valorTotal: data.valorTotal,
            caucao: data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA" | undefined,
            estado: estadoAposCaucao(reserva.estado as string, data.caucao as string | undefined),
            valorCaucao: data.valorCaucao,
            metodoCaucao: data.metodoCaucao as MetodoPagamento | undefined,
            descontoPercentagem: data.descontoPercentagem,
            descontoMotivo: data.descontoMotivo,
          },
        });
        await rederivarPagoReserva(tx, id);
      });
      return this.getById(id);
    }

    // Replace-all do ledger; o estado `pago` é derivado (soma >= total)
    await prisma.$transaction(async (tx) => {
      await tx.reserva.update({
        where: { id },
        data: {
          valorTotal: data.valorTotal === undefined ? undefined : data.valorTotal,
          caucao: data.caucao as "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA" | undefined,
          estado: estadoAposCaucao(reserva.estado as string, data.caucao as string | undefined),
          valorCaucao: data.valorCaucao,
          metodoCaucao: data.metodoCaucao as MetodoPagamento | undefined,
          descontoPercentagem: data.descontoPercentagem,
          descontoMotivo: data.descontoMotivo,
        },
      });
      await sincronizarPagamentosReserva(tx, id, lista);
    });

    return this.getById(id);
  },

  async delete(id: string) {
    const reserva = await this.getById(id);
    if (!reserva) throw new Error("NOT_FOUND");

    // Libertar cacifos ANTES de apagar: a FK (SetNull) só limpa o reservaId,
    // o estado RESERVADO ficaria órfão para sempre.
    await cacifoService.libertarCacifosDaReserva(id);

    await prisma.reservaAniversariante.deleteMany({ where: { reservaId: id } });
    await prisma.reservaExtra.deleteMany({ where: { reservaId: id } });
    await prisma.reservaMonitor.deleteMany({ where: { reservaId: id } });
    await prisma.reservaEtapa.deleteMany({ where: { reservaId: id } });
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

    const atualizada = await prisma.reserva.update({
      where: { id },
      data: {
        estado: "EM_CURSO",
        inicioEm,
        fimPrevisto,
        etapas: etapasData,
      },
      include: {
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
      },
    });

    const alvoCacifos =
      atualizada.numCriancasConfirmadas || atualizada.numCriancas || atualizada.previsaoCriancas || 0;
    if (alvoCacifos > 0 && atualizada.cacifos.length < alvoCacifos) {
      await cacifoService.preReservarCacifos(id, alvoCacifos - atualizada.cacifos.length);
    }

    return this.getById(id);
  },

  async finalizar(id: string, options?: { custoExcessoManual?: number; numCriancasPresentes?: number | null }) {
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

    // ── Custo das meias (compra obrigatória) ──
    const custoMeias =
      (reserva.meiasQuantidade ?? 0) * Number(reserva.meiasPrecoUnit ?? 0);

    // Total acordado (valorTotal) + excesso + meias
    const custoTotalFinal =
      Number(reserva.valorTotal ?? 0) + custoExcesso + custoMeias;

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

    // Release all cacifos (preservando histórico de ocupação)
    await cacifoService.libertarCacifosDaReserva(id);

    let metodoExcesso: MetodoPagamento = "DINHEIRO";
    if (custoExcesso > 0) {
      const primeiro = await prisma.pagamento.findFirst({
        where: { reservaId: id },
        orderBy: { createdAt: "asc" },
        select: { metodo: true },
      });
      if (primeiro) metodoExcesso = primeiro.metodo;
    }

    return prisma.$transaction(async (tx) => {
      if (custoExcesso > 0) {
        await tx.pagamento.create({
          data: {
            valor: Math.round(custoExcesso * 100) / 100,
            metodo: metodoExcesso,
            nota: "Excesso de tempo",
            reservaId: id,
          },
        });
      }
      const atualizada = await tx.reserva.update({
        where: { id },
        data: {
          estado: "CONCLUIDA",
          fimReal,
          cacifosHistorico,
          excessoMinutos,
          custoExcesso,
          custoTotalFinal,
          ...(options?.numCriancasPresentes !== undefined && {
            numCriancasPresentes: options.numCriancasPresentes,
          }),
        },
        include: {
          cliente: true,
          aniversariantes: { include: { aniversariante: true } },
          monitores: { include: { monitor: true } },
          cacifos: true,
          etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
          pagamentos: { orderBy: { createdAt: "asc" } },
        },
      });
      if (custoExcesso > 0) {
        // O recebido mudou → re-derivar o estado `pago`
        await rederivarPagoReserva(tx, id);
      }
      return atualizada;
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
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        cacifos: true,
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
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
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        extras: { include: { extra: true } },
        monitores: { include: { monitor: true } },
        menu: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        pagamentos: { orderBy: { createdAt: "asc" } },
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

  /**
   * Alterna o estado de conclusão de um extra da reserva
   * (entregue/prestado no dia da festa - check na tabela de festas).
   */
  async toggleReservaExtra(reservaExtraId: string) {
    const reservaExtra = await prisma.reservaExtra.findUnique({
      where: { id: reservaExtraId },
    });
    if (!reservaExtra) throw new Error("EXTRA_NOT_FOUND");

    return prisma.reservaExtra.update({
      where: { id: reservaExtraId },
      data: { concluido: !reservaExtra.concluido },
      include: { extra: true },
    });
  },

  /**
   * Actualiza o estado dos cacifos ao nível da festa.
   * - chamado: marca que a festa foi chamada
   * - concluido: liberta TODOS os cacifos da reserva (preservando histórico)
   */
  async actualizarEstadoCacifos(
    id: string,
    options: { chamado?: boolean; concluido?: boolean }
  ) {
    const reserva = await this.getById(id);

    // Se concluido está a passar a true, libertar cacifos
    if (options.concluido === true && !reserva.cacifosConcluido) {
      await cacifoService.libertarCacifosDaReserva(id);
    }

    return prisma.reserva.update({
      where: { id },
      data: {
        ...(options.chamado !== undefined ? { cacifosChamado: options.chamado } : {}),
        ...(options.concluido !== undefined ? { cacifosConcluido: options.concluido } : {}),
      },
      include: {
        cliente: true,
        aniversariantes: { include: { aniversariante: true } },
        cacifos: true,
      },
    });
  },
};