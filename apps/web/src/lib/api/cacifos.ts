import { api } from "./utils";
import type { EstadoCacifo } from "@saas/shared-types";

export type { EstadoCacifo };

export interface Cacifo {
  id: string;
  numero: number;
  nome?: string | null;
  estado: EstadoCacifo;
  notas?: string;
  criancas?: string;
  reservaId?: string;
  reserva?: {
    id: string;
    cliente: { id: string; nome: string } | null;
    local: { id: string; nome: string } | null;
    notasCacifos?: string | null;
    aniversariantes?: { aniversariante: { nome: string } }[];
  };
}

export const cacifosApi = {
  list: (filtros?: { estado?: EstadoCacifo; reservaId?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.reservaId) params.set("reservaId", filtros.reservaId);
    const query = params.toString();
    return api<Cacifo[]>(`/api/cacifos${query ? `?${query}` : ""}`);
  },

  getDisponiveis: () => api<Cacifo[]>("/api/cacifos/disponiveis"),

  getById: (id: string) => api<Cacifo>(`/api/cacifos/${id}`),

  marcarOcupado: (id: string, reservaId: string, dados?: { notas?: string; criancas?: string }) =>
    api<Cacifo>(`/api/cacifos/${id}/ocupado`, {
      method: "PATCH",
      body: JSON.stringify({ reservaId, ...dados }),
    }),

  libertar: (id: string) =>
    api<Cacifo>(`/api/cacifos/${id}/libertar`, {
      method: "PATCH",
    }),

  marcarReservado: (id: string, reservaId: string, dados?: { notas?: string; criancas?: string }) =>
    api<Cacifo>(`/api/cacifos/${id}/reservado`, {
      method: "PATCH",
      body: JSON.stringify({ reservaId, ...dados }),
    }),

  actualizar: (id: string, dados: { notas?: string; criancas?: string }) =>
    api<Cacifo>(`/api/cacifos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dados),
    }),

  atribuir: (reservaId: string, cacifos: { id: string; notas?: string; criancas?: string }[]) =>
    api<Cacifo[]>("/api/cacifos/atribuir", {
      method: "POST",
      body: JSON.stringify({ reservaId, cacifos }),
    }),

  getContadores: () =>
    api<{ livres: number; ocupados: number; reservados: number; total: number }>("/api/cacifos/contadores"),

  getEsquecidos: () => api<Cacifo[]>("/api/cacifos/esquecidos"),

  adicionarAReserva: (reservaId: string, cacifoId?: string) =>
    api<Cacifo>("/api/cacifos/adicionar-a-reserva", {
      method: "POST",
      body: JSON.stringify({ reservaId, cacifoId }),
    }),

  trocar: (reservaId: string, cacifoAtualId: string, novoCacifoId: string) =>
    api<Cacifo>("/api/cacifos/trocar", {
      method: "POST",
      body: JSON.stringify({ reservaId, cacifoAtualId, novoCacifoId }),
    }),

  realocar: (reservaId: string) =>
    api<{ trocados: number; total: number }>("/api/cacifos/realocar", {
      method: "POST",
      body: JSON.stringify({ reservaId }),
    }),

  /** Pré-reserva N cacifos para uma festa (materialização no dia). */
  preReservar: (reservaId: string, quantidade: number) =>
    api<{ reservados: Cacifo[]; indisponiveis: number }>("/api/cacifos/pre-reservar", {
      method: "POST",
      body: JSON.stringify({ reservaId, quantidade }),
    }),
};