import type { ConfiguracaoPreco } from "@/lib/api/precos";
import type { Extra } from "@/lib/api/extras";
import type { SlotHorario, SlotsDiaResponse, SlotDia, FestaSlotInfo } from "@/lib/api/slotsHorario";
import type { SalaLanche } from "@/lib/api/salasLanche";
import type { Reserva } from "@/lib/api/reservas";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import type { Pagamento } from "@saas/shared-types";

/**
 * Fixtures partilhadas pelos testes de forms (nível 1 e 2).
 *
 * Modelam o cenário de referência do form de Festas:
 *   - menus Basy (15 €, semana) e Landy (16,50 €, FDS) - o menu DEFINE o preço/criança;
 *   - suplemento "Almoço / Jantar" (3 €, POR_UNIDADE) - quantidade sincronizada
 *     com o total de crianças pelo MenuBoloSection (bug "3 € × 10 mas total 3 €");
 *   - slot 11:00 FDS na Sala A com extrasObrigatorios = [Almoço/Jantar];
 *   - par 11:00 na Sala B (livre quando a A está ocupada).
 */

// ── Datas fixas (quarta-feira e sábado da mesma semana) ──────────
export const DATA_SEMANA = "2026-09-23"; // quarta-feira
export const DATA_FDS = "2026-09-26"; // sábado

// ── Configuração de preços ───────────────────────────────────────
export const configPrecoFixture: ConfiguracaoPreco = {
  id: "config-preco-fixture",
  precoCriancaSemana: 15,
  precoCriancaFimSemana: 20,
  precoEntradaHoraSemana: 10,
  precoEntradaHoraFimSemana: 12,
  precoEntrada1h: 6,
  precoEntrada2h: 10,
  precoEntradaHoraAdicional: 5,
  minimosCriancasPorAniversariante: [
    { aniversariantes: 1, minimo: 10 },
    { aniversariantes: 2, minimo: 15 },
    { aniversariantes: 3, minimo: 20 },
  ],
  precoMeias: 1.5,
  caucaoDefault: 50,
  precoLancheEntrada: 3,
  precoAdulto: 6,
  valorHoraMonitorDefault: null,
  precoExcessoFixo: 5,
  duracaoDefaultFestaMin: 135,
  duracaoExcessoBlocoMin: 30,
  dadosPagamento: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// ── Salas de lanche ──────────────────────────────────────────────
export const salaA: SalaLanche = { id: "sala-a", nome: "Sala A", activo: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
export const salaB: SalaLanche = { id: "sala-b", nome: "Sala B", activo: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
export const salasLancheFixture = [salaA, salaB];

// ── Extras ───────────────────────────────────────────────────────
const extraBase = { requerTexto: false, activo: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

/** Menu de semana - preço/criança 15 € (coincide com o tarifário de semana). */
export const extraMenuBasy: Extra = {
  ...extraBase,
  id: "extra-menu-basy",
  nome: "Menu Basy",
  categoria: "MENU",
  precoUnitario: 15,
  fimDeSemana: false,
};

/** Menu de FDS - 16,50 € > tarifário (20 €/FDS): o menu sobrepõe o tarifário. */
export const extraMenuLandy: Extra = {
  ...extraBase,
  id: "extra-menu-landy",
  nome: "Menu Landy",
  categoria: "MENU",
  precoUnitario: 16.5,
  fimDeSemana: true,
};

/**
 * Suplemento de menu (Almoço/Jantar) - POR_UNIDADE mas cobrado SEMPRE pelo
 * total de crianças (sync do MenuBoloSection); é o extra obrigatório do slot
 * 11:00 FDS da Sala A.
 */
export const extraAlmocoJantar: Extra = {
  ...extraBase,
  id: "extra-menu-almoco-jantar",
  nome: "Almoço / Jantar",
  categoria: "EXTRA",
  precoUnitario: 3,
  baseCobranca: "POR_UNIDADE",
};

/** Extra POR_PESSOA - o stepper mostra "× N pessoas" e a qty segue as crianças. */
export const extraPinturas: Extra = {
  ...extraBase,
  id: "extra-pinturas",
  nome: "Pinturas Faciais",
  categoria: "EXTRA",
  precoUnitario: 2.5,
  baseCobranca: "POR_PESSOA",
};

/** Bolo do catálogo (subcategoria "Bolos") - fatura como extra + deriva Reserva.bolo. */
export const extraBoloArtistico: Extra = {
  ...extraBase,
  id: "extra-bolo-artistico",
  nome: "Bolo Artístico",
  categoria: "EXTRA",
  subcategoria: "Bolos",
  precoUnitario: 25,
  requerTexto: true,
  boloTipo: "BOLO_ARTISTICO",
};

export const extrasFixture: Extra[] = [
  extraMenuBasy,
  extraMenuLandy,
  extraAlmocoJantar,
  extraPinturas,
  extraBoloArtistico,
];

// ── Slots de horário ─────────────────────────────────────────────
const slotBase = { activo: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

/** Slot 11:00 FDS Sala A - COM extras obrigatórios (Almoço/Jantar). */
export const slotFds1100SalaA: SlotHorario = {
  ...slotBase,
  id: "slot-fds-1100-a",
  horaInicio: "11:00",
  duracaoMin: 135,
  ordem: 1,
  fimDeSemana: true,
  corDefault: null,
  horaLancheDefault: "13:00",
  salaLancheId: salaA.id,
  salaLancheNome: salaA.nome,
  extrasObrigatorios: [extraAlmocoJantar.id],
};

/** Par 11:00 FDS Sala B - sem extras obrigatórios (coexiste com a Sala A). */
export const slotFds1100SalaB: SlotHorario = {
  ...slotBase,
  id: "slot-fds-1100-b",
  horaInicio: "11:00",
  duracaoMin: 135,
  ordem: 2,
  fimDeSemana: true,
  corDefault: null,
  horaLancheDefault: "13:00",
  salaLancheId: salaB.id,
  salaLancheNome: salaB.nome,
  extrasObrigatorios: [],
};

/** Slot 09:15 FDS Sala A - sem extras obrigatórios (para trocar de slot). */
export const slotFds0915SalaA: SlotHorario = {
  ...slotBase,
  id: "slot-fds-0915-a",
  horaInicio: "09:15",
  duracaoMin: 135,
  ordem: 3,
  fimDeSemana: true,
  corDefault: null,
  horaLancheDefault: null,
  salaLancheId: salaA.id,
  salaLancheNome: salaA.nome,
  extrasObrigatorios: [],
};

/** Slot 11:00 de SEMANA Sala A (Basy aplica-se; Landy não). */
export const slotSemana1100SalaA: SlotHorario = {
  ...slotBase,
  id: "slot-semana-1100-a",
  horaInicio: "11:00",
  duracaoMin: 135,
  ordem: 1,
  fimDeSemana: false,
  corDefault: null,
  horaLancheDefault: "13:00",
  salaLancheId: salaA.id,
  salaLancheNome: salaA.nome,
  extrasObrigatorios: [],
};

const TODOS_SLOTS = [slotFds1100SalaA, slotFds1100SalaB, slotFds0915SalaA, slotSemana1100SalaA];

/** Slots aplicáveis a uma data (fimDeSemana null = ambos), como devolve a API. */
export function slotsParaData(data: string): SlotHorario[] {
  const dia = new Date(`${data}T00:00:00`).getDay();
  const fds = dia === 0 || dia === 6;
  return TODOS_SLOTS.filter((s) => s.fimDeSemana === null || s.fimDeSemana === fds);
}

function diaTipo(data: string): "SEMANA" | "FIM_DE_SEMANA" {
  const dia = new Date(`${data}T00:00:00`).getDay();
  return dia === 0 || dia === 6 ? "FIM_DE_SEMANA" : "SEMANA";
}

/** Resposta do endpoint /api/slots-horario/dia para uma data. */
export function slotsDiaFixture(
  data: string,
  opts?: { ocuparSlotIds?: string[]; festasSemSlot?: FestaSlotInfo[] }
): SlotsDiaResponse {
  const aplicaveis = slotsParaData(data);
  const slots: SlotDia[] = aplicaveis.map((s) => ({
    slotId: s.id,
    horaInicio: s.horaInicio,
    duracaoMin: s.duracaoMin,
    ordem: s.ordem,
    ocupado: (opts?.ocuparSlotIds ?? []).includes(s.id),
    festa:
      (opts?.ocuparSlotIds ?? []).includes(s.id)
        ? {
            id: `festa-ocup-${s.id}`,
            nome: "Miguel",
            cor: "#f59e0b",
            numCriancas: 12,
            estado: "CONFIRMADO",
            horario: s.horaInicio,
            duracaoMinutos: s.duracaoMin,
          }
        : null,
    corDefault: s.corDefault ?? null,
    horaLancheDefault: s.horaLancheDefault ?? null,
    salaLancheId: s.salaLancheId ?? null,
    salaLancheNome: s.salaLancheNome ?? null,
    extrasObrigatorios: s.extrasObrigatorios ?? [],
  }));
  return {
    data,
    slots,
    festasSemSlot: opts?.festasSemSlot ?? [],
    coresUsadas: [],
    plano: {
      tipoDia: diaTipo(data),
      totalSlots: slots.length,
      inicio: slots[0]?.horaInicio ?? null,
      fim: slots.length > 0 ? `${slots[slots.length - 1]!.horaInicio}–13:15` : null,
    },
  };
}

// ── Reservas ─────────────────────────────────────────────────────
const pagamentoBase = { nota: undefined };

export function pagamentoFixture(id: string, valor: number, metodo: Pagamento["metodo"]): Pagamento {
  return { ...pagamentoBase, id, valor, metodo, createdAt: "2026-09-20T10:00:00.000Z" };
}

/** Reserva para testes de edição do FestaForm (FDS 11:00 Sala A, com suplemento). */
export const reservaEdicaoFixture: Reserva = {
  id: "reserva-edit-1",
  data: `${DATA_FDS}T00:00:00.000Z`,
  horario: "11:00",
  duracaoMinutos: 135,
  salaLanche: { id: salaA.id, nome: salaA.nome },
  salaLancheId: salaA.id,
  cliente: { id: "cliente-1", nome: "Ana Silva", email: "ana@teste.pt", telefone: "912345678", codigoPostal: "4000-000" },
  aniversariantes: [
    {
      id: "ra-1",
      aniversarianteId: "aniv-1",
      aniversariante: { id: "aniv-1", nome: "Miguel", dataNascimento: "2019-09-26T00:00:00.000Z" },
    },
  ],
  extras: [
    { id: "re-1", extraId: extraAlmocoJantar.id, quantidade: 12, extra: extraAlmocoJantar },
  ],
  menu: null,
  monitores: [],
  cacifos: [],
  etapas: [],
  pagamentos: [pagamentoFixture("pg-edit-1", 100, "MBWAY")],
  estado: "RESERVA",
  numCriancas: 12,
  previsaoCriancas: 12,
  numCriancasConfirmadas: null,
  numAdultos: 0,
  valorTotal: 250,
  pago: false,
  caucao: "NAO_PAGA",
  cor: "#3b82f6",
  tema: null,
  bolo: null,
  boloTema: null,
  boloQuantidade: null,
  notas: null,
  notasCacifos: null,
  notasLanche: null,
  observacoesGerais: null,
  observacoesLesoes: null,
  observacoesBrindes: null,
  outrosExtras: null,
  horaLanche: "13:00",
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
} as unknown as Reserva;

/**
 * Reserva para a modal de pagamento: total acordado 148 €, ledger vazio →
 * falta liquidar 148 € ("0,00 € de 148,00 €" no ledger).
 */
export const reservaPagamentoFixture: Reserva = {
  ...reservaEdicaoFixture,
  id: "reserva-pagamento-1",
  valorTotal: 148,
  pagamentos: [],
  precoCriancaAplicado: 15,
  minimoCriancas: 10,
  numCriancasConfirmadas: 10,
  meiasQuantidade: null,
  meiasPrecoUnit: null,
  extras: [],
} as unknown as Reserva;

// ── Entradas livres ──────────────────────────────────────────────
/** Entrada para a modal de pagamento: 20 € acordados + 5 € de excesso, 10 € pagos. */
export const entradaPagamentoFixture: EntradaLivre = {
  id: "entrada-pag-1",
  criancas: [
    { nome: "João", idade: 6, querLanche: true },
    { nome: "Maria", idade: 4, querLanche: false },
  ],
  encarregadoNome: "Pedro Costa",
  encarregadoTelefone: "913456789",
  encarregadoEmail: "pedro@teste.pt",
  duracaoMinutos: 60,
  custoHora: 6,
  custoTotal: 20,
  custoExcesso: 5,
  inicioEm: "2026-09-23T09:00:00.000Z",
  fimPrevisto: "2026-09-23T10:00:00.000Z",
  excessoMinutos: 30,
  estado: "ATIVA",
  pagamentos: [pagamentoFixture("pg-ent-1", 10, "MBWAY")],
  pago: false,
  pagoExcesso: false,
  meiasQuantidade: 2,
  meiasPrecoUnit: 1.5,
  observacoesLesoes: undefined,
  temLanche: false,
  numAdultos: 0,
  extras: [],
  createdAt: "2026-09-23T09:00:00.000Z",
  updatedAt: "2026-09-23T09:00:00.000Z",
};

/** Conflito para o /disponibilidade (aviso de sobreposição no form de Festas). */
export const conflitoFixture = {
  id: "reserva-conflito-1",
  horario: "11:00",
  duracaoMinutos: 135,
  tema: null,
  aniversarianteNome: "Miguel",
  estado: "CONFIRMADO",
};
