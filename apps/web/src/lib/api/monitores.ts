import { api } from "./utils";
import type { Monitor as MonitorBase } from "@saas/shared-types";

// API response type (base + relations from API)
export interface Monitor extends MonitorBase {}

export interface CreateMonitorData {
  nome: string;
  contacto: string;
  activo?: boolean;
}

// API calls
export const monitoresApi = {
  list: () => api<Monitor[]>("/api/monitores"),
  getById: (id: string) => api<Monitor>(`/api/monitores/${id}`),
  create: (data: CreateMonitorData) =>
    api<Monitor>("/api/monitores", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CreateMonitorData>) =>
    api<Monitor>(`/api/monitores/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/monitores/${id}`, {
      method: "DELETE",
    }),
};
