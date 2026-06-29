import { api } from "./utils";
import type { SlotHorario, CriarSlotHorarioDTO } from "@saas/shared-types";

export type { SlotHorario };

export type CreateSlotInput = CriarSlotHorarioDTO;
export type UpdateSlotInput = Partial<CriarSlotHorarioDTO>;

/** Festa resumida num slot do dia. */
export interface FestaSlotInfo {
  id: string;
  nome: string;
  cor: string | null;
  numCriancas: number;
  estado: string;
  localNome: string | null;
}

/** Festa com horário custom (não corresponde a nenhum slot) */
export interface FestaSemSlot extends FestaSlotInfo {
  horario: string;
  duracaoMinutos: number;
}

/** Slot do dia combinado com festa (se houver). */
export interface SlotDia {
  slotId: string;
  horaInicio: string;
  duracaoMin: number;
  ordem: number;
  ocupado: boolean;
  festa: FestaSlotInfo | null;
}

/** Resposta do endpoint /api/slots-horario/dia */
export interface SlotsDiaResponse {
  data: string;
  slots: SlotDia[];
  festasSemSlot: FestaSemSlot[];
  coresUsadas: string[];
}

export const slotsHorarioApi = {
  list: () => api<SlotHorario[]>("/api/slots-horario"),
  listAll: () => api<SlotHorario[]>("/api/slots-horario?all=true"),
  getDia: (data: string) =>
    api<SlotsDiaResponse>(`/api/slots-horario/dia?data=${encodeURIComponent(data)}`),
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
