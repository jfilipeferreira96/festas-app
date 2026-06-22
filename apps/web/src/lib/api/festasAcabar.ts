import { api } from "@/lib/api/utils";

export interface FestaAcabar {
  id: string;
  nomeFesta: string;
  cor?: string;
  idadeAniversariante?: number | null;
  numCriancas: number;
  inicioEm: string | null;
  fimPrevisto: string | null;
  localNome: string;
  observacoesBrindes: string;
  observacoesBrindesPais: string;
  observacoesLesoes: string;
}

export const festasAcabarApi = {
  getAll: () => api("/api/festas-acabar", { method: "GET" }),

  atualizar: (
    reservaId: string,
    data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string }
  ) =>
    api(`/api/festas-acabar/${reservaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),

  /** Finaliza (conclui) uma festa em curso. Reusa o endpoint de reservas. */
  finalizar: (reservaId: string) =>
    api(`/api/reservas/${reservaId}/finalizar`, { method: "POST" }),
};

