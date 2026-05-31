import { api } from "./utils";
import type { EtapaFesta } from "@saas/shared-types";

export type { EtapaFesta };

export interface CreateEtapaFestaInput {
  nome: string;
  descricao?: string;
  ordem?: number;
  icone?: string;
}

export interface UpdateEtapaFestaInput {
  nome?: string;
  descricao?: string;
  ordem?: number;
  icone?: string;
  activo?: boolean;
}

export const etapasFestaApi = {
  list: () => api<EtapaFesta[]>("/api/etapas-festa"),
  getById: (id: string) => api<EtapaFesta>(`/api/etapas-festa/${id}`),
  create: (data: CreateEtapaFestaInput) =>
    api<EtapaFesta>("/api/etapas-festa", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateEtapaFestaInput) =>
    api<EtapaFesta>(`/api/etapas-festa/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/etapas-festa/${id}`, {
      method: "DELETE",
    }),
};