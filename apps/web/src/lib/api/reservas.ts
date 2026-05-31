import { api } from "./utils";
import type { Reserva as ReservaBase, EstadoReserva, ReservaExtra, MetodoPagamento } from "@saas/shared-types";
import type { Local, Extra, Menu } from "@saas/shared-types";

// Re-export base types
export type { EstadoReserva, ReservaExtra, MetodoPagamento };

// API response type (base + relations from API)
export interface Reserva extends ReservaBase {
  local: Local;
  cliente: { id: string; nome: string; email?: string; telefone: string };
  aniversariantes: { id: string; aniversarianteId: string; aniversariante: { id: string; nome: string; dataNascimento?: string | null } }[];
  extras: (ReservaExtra & { extra: Extra })[];
  menu?: { id: string; nome: string; preco: number; notas?: string | null; reservaId: string } | null;
  monitores?: { id: string; monitor: { id: string; nome: string } }[];
  cacifos?: { id: string; numero: number; estado: string; notas?: string | null; criancas?: string | null }[];
  etapas?: { id: string; concluida: boolean; concluidaEm?: string | null; etapa: { id: string; nome: string; ordem: number } }[];
  participantes?: { id: string; nome: string; presente?: boolean; cacifoId?: string | null; cacifo?: { id: string; numero: number } | null }[];
}

// Helper to get first aniversariante name from array
export function getAniversarianteNome(r: Reserva): string {
  return r.aniversariantes?.[0]?.aniversariante?.nome ?? "—";
}

// Helper to get all aniversariante names
export function getAniversarianteNomes(r: Reserva): string {
  return r.aniversariantes?.map(a => a.aniversariante.nome).filter(Boolean).join(", ") || "—";
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
  idadeAnos: number;
  data: string;
  horario: string;
  duracaoMinutos: number;
  localId: string;
  numCriancas?: number;
  extrasIds?: string[];
  monitoresIds?: string[];
  etapasIds?: string[];
  notas?: string;
  menuItens?: MenuItemInput[];
  // Festa fields
  cor?: string;
  // Pagamento
  metodoPagamento?: MetodoPagamento;
  valorPago?: number;
  pago?: boolean;
}

export interface UpdateReservaData extends Partial<CreateReservaData> {}

export interface PaginatedReservas {
  items: Reserva[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API calls
export const reservasApi = {
  list: (filtros?: { estado?: EstadoReserva; data?: string; localId?: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.data) params.set("data", filtros.data);
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

  delete: (id: string) =>
    api<{ message: string }>(`/api/reservas/${id}`, {
      method: "DELETE",
    }),

  // Runtime actions (previously /festas)
  iniciar: (id: string) =>
    api<Reserva>(`/api/reservas/${id}/iniciar`, {
      method: "POST",
    }),

  finalizar: (id: string) =>
    api<Reserva>(`/api/reservas/${id}/finalizar`, {
      method: "POST",
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
};
