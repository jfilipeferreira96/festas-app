import { api } from "./utils";
import type { LancheDoDia } from "@saas/shared-types";

export interface AtualizarNotasInput {
  notasLanche?: string;
  itensLanche?: unknown;
}

export const lancheApi = {
  getLanchesDoDia: (data?: string) =>
    api<LancheDoDia[]>(data ? `/api/lanche?data=${data}` : "/api/lanche"),
  getAlergias: (data?: string) =>
    api<{ reservaId: string; nomeFesta: string; notasLanche: string }[]>(
      data ? `/api/lanche?alergias=true&data=${data}` : "/api/lanche?alergias=true"
    ),
  getLancheByReservaId: (reservaId: string) =>
    api<LancheDoDia>(`/api/lanche/${reservaId}`),
  atualizarNotas: (reservaId: string, data: AtualizarNotasInput) =>
    api(`/api/lanche/${reservaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
