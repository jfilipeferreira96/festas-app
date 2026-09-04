import { api } from "./utils";
import type { Extra, BaseCobranca } from "@saas/shared-types";

// Re-export the shared type for use in components
export type { Extra, BaseCobranca };

export interface CreateExtraInput {
  nome: string;
  descricao?: string;
  precoUnitario: number;
  icone?: string;
  categoria?: "MENU" | "EXTRA";
  subcategoria?: string;
  requerTexto?: boolean;
  baseCobranca?: BaseCobranca;
  fimDeSemana?: boolean | null;
  locaisIds?: string[];
}

export interface UpdateExtraInput {
  nome?: string;
  descricao?: string;
  precoUnitario?: number;
  icone?: string;
  categoria?: "MENU" | "EXTRA";
  subcategoria?: string;
  requerTexto?: boolean;
  baseCobranca?: BaseCobranca;
  fimDeSemana?: boolean | null;
  locaisIds?: string[];
}

// API calls
export const extrasApi = {
  list: () => api<Extra[]>("/api/extras"),
  getById: (id: string) => api<Extra>(`/api/extras/${id}`),
  create: (data: CreateExtraInput) =>
    api<Extra>("/api/extras", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateExtraInput) =>
    api<Extra>(`/api/extras/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/extras/${id}`, {
      method: "DELETE",
    }),
};
