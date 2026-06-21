import { api } from "@/lib/api/utils";

export interface AtualizarNotasInput {
  notasLanche?: string;
  itensLanche?: unknown;
  observacoesLesoes?: string;
}

export const lancheApi = {
  getLanchesDoDia: (data?: string) => {
    const url = data ? `/api/lanche?data=${encodeURIComponent(data)}` : "/api/lanche";
    return api(url, { method: "GET" });
  },

  getAlergias: (data?: string) => {
    const params = new URLSearchParams({ alergias: "true" });
    if (data) params.set("data", data);
    return api(`/api/lanche?${params.toString()}`, { method: "GET" });
  },

  atualizarNotas: (reservaId: string, data: AtualizarNotasInput) =>
    api(`/api/lanche/${reservaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),

  atualizarEstado: (reservaId: string, estado: string) =>
    api(`/api/lanche/${reservaId}`, {
      method: "PUT",
      body: JSON.stringify({ estadoLanche: estado }),
      headers: { "Content-Type": "application/json" },
    }),

  atualizarEstadoEntrada: (entradaLivreId: string, estado: string) =>
    api(`/api/lanche/entrada/${entradaLivreId}`, {
      method: "PATCH",
      body: JSON.stringify({ estadoLanche: estado }),
      headers: { "Content-Type": "application/json" },
    }),
};
