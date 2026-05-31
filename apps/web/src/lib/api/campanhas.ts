import { api } from "./utils";
import type { Campanha as CampanhaBase, TipoCampanha, EstadoCampanha } from "@saas/shared-types";

// Re-export base types
export type { TipoCampanha, EstadoCampanha };

// API response type (base type is sufficient for campanha)
export type Campanha = CampanhaBase;

export interface CreateCampanhaData {
  tipo: TipoCampanha;
  assunto: string;
  mensagem: string;
  segmentoId?: string;
  agendadaPara?: string;
}

// API calls
export const campanhasApi = {
  list: () => api<Campanha[]>("/api/campanhas"),

  getById: (id: string) => api<Campanha>(`/api/campanhas/${id}`),

  create: (data: CreateCampanhaData) =>
    api<Campanha>("/api/campanhas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateCampanhaData>) =>
    api<Campanha>(`/api/campanhas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  enviar: (id: string) =>
    api<Campanha>(`/api/campanhas/${id}/enviar`, {
      method: "POST",
    }),

  metricas: (id: string) =>
    api<{ totalEnvios: number; taxaAbertura: number }>(
      `/api/campanhas/${id}/metricas`
    ),

  delete: (id: string) =>
    api<{ message: string }>(`/api/campanhas/${id}`, {
      method: "DELETE",
    }),
};
