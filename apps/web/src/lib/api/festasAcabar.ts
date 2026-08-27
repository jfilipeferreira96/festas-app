import { api } from "@/lib/api/utils";
import type { EstadoLanche } from "@saas/shared-types";

export interface FestaAcabarExtra {
  id: string;
  nome: string;
  quantidade: number;
  concluido: boolean;
}

export interface FestaAcabar {
  id: string;
  nomeFesta: string;
  cor?: string;
  idadeAniversariante?: number | null;
  numCriancas: number;
  inicioEm: string | null;
  fimPrevisto: string | null;
  localNome: string;
  pago: boolean;
  valorPago: number | null;
  extras: FestaAcabarExtra[];
  notasCacifos?: string;
  observacoesCacifo?: string;
  observacoesBrindes: string;
  observacoesBrindesPais: string;
  observacoesLesoes: string;
}

export interface EntradaAcabar {
  id: string;
  criancasNomes: string;
  numCriancas: number;
  encarregadoNome: string;
  inicioEm: string;
  fimPrevisto: string;
  duracaoMinutos: number;
  pago: boolean;
  temLanche: boolean;
  estadoLanche: EstadoLanche;
  horaLanche?: string;
  observacoes?: string;
  observacoesLesoes?: string;
}

export const festasAcabarApi = {
  getAll: () => api("/api/festas-acabar", { method: "GET" }),

  getEntradas: () => api("/api/festas-acabar/entradas", { method: "GET" }),

  atualizar: (
    reservaId: string,
    data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string }
  ) =>
    api(`/api/festas-acabar/${reservaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),

  /** Confirmação do lanche de uma entrada livre (balcão). */
  atualizarLancheEntrada: (entradaLivreId: string, estadoLanche: EstadoLanche) =>
    api(`/api/festas-acabar/entrada/${entradaLivreId}/lanche`, {
      method: "PATCH",
      body: JSON.stringify({ estadoLanche }),
      headers: { "Content-Type": "application/json" },
    }),

  /** Finaliza (conclui) uma festa em curso. Reusa o endpoint de reservas. */
  finalizar: (reservaId: string) =>
    api(`/api/reservas/${reservaId}/finalizar`, { method: "POST" }),
};
