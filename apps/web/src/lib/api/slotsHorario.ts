import { api } from "./utils";
import type { SlotHorario, CriarSlotHorarioDTO } from "@saas/shared-types";

export type { SlotHorario };

export type CreateSlotInput = CriarSlotHorarioDTO;
export type UpdateSlotInput = Partial<CriarSlotHorarioDTO>;

export const slotsHorarioApi = {
  list: () => api<SlotHorario[]>("/api/slots-horario"),
  listAll: () => api<SlotHorario[]>("/api/slots-horario?all=true"),
  getById: (id: string) => api<SlotHorario>(`/api/slots-horario/${id}`),
  create: (data: CreateSlotInput) =>
    api<SlotHorario>("/api/slots-horario", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateSlotInput) =>
    api<SlotHorario>(`/api/slots-horario/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/slots-horario/${id}`, {
      method: "DELETE",
    }),
};
