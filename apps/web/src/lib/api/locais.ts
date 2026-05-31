import { api } from "./utils";
import type { Local } from "@saas/shared-types";

// Re-export the shared type for use in components
export type { Local };

export type CreateLocalInput = {
  nome: string;
  capacidade: number;
  activo?: boolean;
};

export type UpdateLocalInput = Partial<CreateLocalInput>;

// API calls
export const locaisApi = {
  list: () => api<Local[]>("/api/locais"),
  listActive: () => api<Local[]>("/api/locais?activo=true"),
  getById: (id: string) => api<Local>(`/api/locais/${id}`),
  create: (data: CreateLocalInput) =>
    api<Local>("/api/locais", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateLocalInput) =>
    api<Local>(`/api/locais/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/locais/${id}`, {
      method: "DELETE",
    }),
};
