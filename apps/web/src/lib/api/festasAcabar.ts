import { api } from "@/lib/api/utils";

export interface FestaAcabar {
  id: string;
  nomeFesta: string;
  cor?: string;
  numCriancas: number;
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
};
