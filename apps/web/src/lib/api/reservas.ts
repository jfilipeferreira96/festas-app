import { api } from "./utils";
import type { Reserva as ReservaBase, EstadoReserva, ReservaExtra, MetodoPagamento, TipoBolo } from "@saas/shared-types";
import type { Local, Extra, Menu } from "@saas/shared-types";

// Re-export base types
export type { EstadoReserva, ReservaExtra, MetodoPagamento, TipoBolo };

// API response type (base + relations from API)
export interface Reserva extends ReservaBase {
  local: Local;
  // Estado do lanche (NAO_INICIADO | A_DECORRER | TERMINADO) - devolvido pela API
  estadoLanche?: string;
  salaLanche?: { id: string; nome: string } | null;
  cliente: { id: string; nome: string; email?: string; telefone: string; codigoPostal?: string };
  aniversariantes: { id: string; aniversarianteId: string; aniversariante: { id: string; nome: string; dataNascimento?: string | null } }[];
  extras: (ReservaExtra & { extra: Extra })[];
  menu?: { id: string; nome: string; preco: number; notas?: string | null; reservaId: string } | null;
  monitores?: { id: string; monitor: { id: string; nome: string } }[];
  cacifos?: { id: string; numero: number; estado: string; notas?: string | null; criancas?: string | null }[];
  etapas?: { id: string; concluida: boolean; concluidaEm?: string | null; etapa: { id: string; nome: string; ordem: number } }[];
}

// Helper to get first aniversariante name from array
export function getAniversarianteNome(r: Reserva): string {
  return r.aniversariantes?.[0]?.aniversariante?.nome ?? "-";
}

// Helper to get all aniversariante names
export function getAniversarianteNomes(r: Reserva): string {
  return r.aniversariantes?.map(a => a.aniversariante.nome).filter(Boolean).join(", ") || "-";
}

export interface MenuItemInput {
  nome: string;
  categoria: "MENU" | "EXTRA";
  quantidade: number;
  precoUnitario: number;
  icone?: string;
  extraId?: string;
}

export interface CreateReservaData {
  aniversarianteNome: string;
  clienteNome: string;
  clienteContacto: string;
  clienteEmail?: string;
  clienteCodigoPostal?: string;
  adicionarCliente?: boolean;
  idadeAnos: number;
  data: string;
  horario: string;
  horaLanche?: string;
  duracaoMinutos: number;
  localId: string;
  salaLancheId?: string;
  numCriancas?: number;
  previsaoCriancas?: number;
  extrasIds?: string[];
  extrasTexto?: Record<string, string>;
  monitoresIds?: string[];
  etapasIds?: string[];
  notas?: string;
  menuItens?: MenuItemInput[];
  menuId?: string | null;
  aniversariantes?: { nome: string; dataNascimento?: string }[];
  // Festa fields
  tema?: string;
  cor?: string;
  bolo?: TipoBolo;
  boloTema?: string;
  boloQuantidade?: number;
  numCriancasConfirmadas?: number;
  notasCacifos?: string;
  notasLanche?: string;
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;
  // Pagamento (null = limpar o valor no registo; undefined = sem alterações)
  metodoPagamento?: MetodoPagamento | null;
  metodoPagamento2?: MetodoPagamento | null;
  valorPago?: number;
  valorPago2?: number | null;
  meiasQuantidade?: number;
  pago?: boolean;
  referenciaPagamento?: string;
  caucao?: string;
  valorCaucao?: number;
  descontoPercentagem?: number;
  descontoMotivo?: string;
}

export interface UpdateReservaData extends Partial<CreateReservaData> {}

export interface PaginatedReservas {
  items: Reserva[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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

// API calls
export const reservasApi = {
  list: (filtros?: { estado?: EstadoReserva; data?: string; dataInicio?: string; dataFim?: string; localId?: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.data) params.set("data", filtros.data);
    if (filtros?.dataInicio) params.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) params.set("dataFim", filtros.dataFim);
    if (filtros?.localId) params.set("localId", filtros.localId);
    if (filtros?.page) params.set("page", String(filtros.page));
    if (filtros?.pageSize) params.set("pageSize", String(filtros.pageSize));
    const query = params.toString();
    return api<PaginatedReservas>(`/api/reservas${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api<Reserva>(`/api/reservas/${id}`),

  getAtivas: () => api<Reserva[]>("/api/reservas/ativas"),

  getConcluidas: (data?: string) => {
    const params = new URLSearchParams();
    if (data) params.set("data", data);
    const query = params.toString();
    return api<Reserva[]>(`/api/reservas/concluidas${query ? `?${query}` : ""}`);
  },

  checkDisponibilidade: (params: {
    data: string;
    horario: string;
    duracaoMinutos: number;
    localId: string;
    excludeId?: string;
  }) => {
    const qs = new URLSearchParams({
      data: params.data,
      horario: params.horario,
      duracaoMinutos: String(params.duracaoMinutos),
      localId: params.localId,
    });
    if (params.excludeId) qs.set("excludeId", params.excludeId);
    return api<DisponibilidadeResult>(`/api/reservas/disponibilidade?${qs.toString()}`);
  },

  create: (data: CreateReservaData) =>
    api<Reserva>("/api/reservas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateReservaData) =>
    api<Reserva>(`/api/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, estado: EstadoReserva) =>
    api<Reserva>(`/api/reservas/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    }),

  atualizarPagamento: (id: string, data: {
    pago?: boolean;
    metodoPagamento?: MetodoPagamento | null;
    valorPago?: number;
    metodoPagamento2?: MetodoPagamento | null;
    valorPago2?: number | null;
    caucao?: string;
    valorCaucao?: number;
    referenciaPagamento?: string;
    descontoPercentagem?: number;
    descontoMotivo?: string;
  }) =>
    api<Reserva>(`/api/reservas/${id}/pagamento`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api<{ message: string }>(`/api/reservas/${id}`, {
      method: "DELETE",
    }),

  // Runtime actions (previously /festas)
  iniciar: (id: string) =>
    api<Reserva>(`/api/reservas/${id}/iniciar`, {
      method: "POST",
    }),

  finalizar: (id: string, custoExcesso?: number) =>
    api<Reserva>(`/api/reservas/${id}/finalizar`, {
      method: "POST",
      body: JSON.stringify(custoExcesso !== undefined ? { custoExcesso } : {}),
    }),

  alocarMonitor: (id: string, monitorId: string) =>
    api<{ id: string }>(`/api/reservas/${id}/monitores`, {
      method: "POST",
      body: JSON.stringify({ monitorId }),
    }),

  removerMonitor: (id: string, monitorId: string) =>
    api<{ id: string }>(`/api/reservas/${id}/monitores`, {
      method: "DELETE",
      body: JSON.stringify({ monitorId }),
    }),

  toggleEtapa: (id: string, etapaId: string) =>
    api<{ id: string }>(`/api/reservas/${id}/etapas`, {
      method: "PATCH",
      body: JSON.stringify({ etapaId }),
    }),

  removerEtapa: (id: string, etapaId: string) =>
    api<{ id: string }>(`/api/reservas/${id}/etapas/${etapaId}`, {
      method: "DELETE",
    }),

  marcarEtapasConcluidas: (id: string) =>
    api<unknown[]>(`/api/reservas/${id}/etapas/concluir-todas`, {
      method: "POST",
    }),

  actualizarEstadoCacifos: (id: string, body: { chamado?: boolean; concluido?: boolean }) =>
    api<Reserva>(`/api/reservas/${id}/estado-cacifos`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** Alterna o estado de conclusão de um extra da reserva (entregue/prestado). */
  toggleReservaExtra: (reservaExtraId: string) =>
    api<{ id: string; concluido: boolean }>(`/api/reserva-extras/${reservaExtraId}`, {
      method: "PATCH",
    }),
};
