import { api } from "./utils";
import type { SalaLanche, CriarSalaLancheDTO } from "@saas/shared-types";

export type { SalaLanche };

export type CreateSalaLancheInput = CriarSalaLancheDTO;
export type UpdateSalaLancheInput = Partial<CriarSalaLancheDTO>;

export const salasLancheApi = {
  list: () => api<SalaLanche[]>("/api/salas-lanche"),
  listAll: () => api<SalaLanche[]>("/api/salas-lanche?all=true"),
  getById: (id: string) => api<SalaLanche>(`/api/salas-lanche/${id}`),
  create: (data: CreateSalaLancheInput) =>
    api<SalaLanche>("/api/salas-lanche", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateSalaLancheInput) =>
    api<SalaLanche>(`/api/salas-lanche/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/salas-lanche/${id}`, {
      method: "DELETE",
    }),
};
