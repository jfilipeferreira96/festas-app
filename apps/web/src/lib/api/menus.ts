import { api } from "./utils";
import type { Menu } from "@saas/shared-types";

// Re-export the shared type for use in components
export type { Menu };

export interface CreateMenuData {
  reservaId: string;
  nome: string;
  preco: number;
  notas?: string;
}

// API calls
export const menusApi = {
  getByReservaId: (reservaId: string) =>
    api<Menu>(`/api/menus/${reservaId}`),

  create: (data: CreateMenuData) =>
    api<{ message: string; data: Menu }>("/api/menus", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (reservaId: string, data: Partial<CreateMenuData>) =>
    api<{ message: string; data: Menu }>(`/api/menus/${reservaId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};