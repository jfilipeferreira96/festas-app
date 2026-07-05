import { api } from "./utils";
import type { ExcecaoCalendario, CriarExcecaoCalendarioDTO } from "@saas/shared-types";

export type { ExcecaoCalendario };

export type CreateExcecaoInput = CriarExcecaoCalendarioDTO;
export type UpdateExcecaoInput = Partial<CriarExcecaoCalendarioDTO>;

export const excecoesCalendarioApi = {
  list: () => api<ExcecaoCalendario[]>("/api/excecoes-calendario"),
  getById: (id: string) => api<ExcecaoCalendario>(`/api/excecoes-calendario/${id}`),
  create: (data: CreateExcecaoInput) =>
    api<ExcecaoCalendario>("/api/excecoes-calendario", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateExcecaoInput) =>
    api<ExcecaoCalendario>(`/api/excecoes-calendario/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/excecoes-calendario/${id}`, {
      method: "DELETE",
    }),
  importarFeriados: (ano: number) =>
    api<{ message: string; data: { criados: number; ignorados: number; total: number } }>(
      "/api/excecoes-calendario/importar-feriados",
      {
        method: "POST",
        body: JSON.stringify({ ano }),
      }
    ),
};
