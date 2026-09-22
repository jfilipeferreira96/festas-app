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
  horario: string;
  duracaoMinutos: number;
}

/** Festa com horário custom (não corresponde a nenhum slot) */
export interface FestaSemSlot extends FestaSlotInfo {}

/** Slot do dia combinado com festa (se houver). */
export interface SlotDia {
  slotId: string;
  horaInicio: string;
  duracaoMin: number;
  ordem: number;
  ocupado: boolean;
  festa: FestaSlotInfo | null;
  // ── Defaults do slot (para auto-preencher ao criar festa) ──
  corDefault?: string | null;
  horaLancheDefault?: string | null;
  salaLancheId?: string | null;
  salaLancheNome?: string | null;
}

/** Plano do dia (grelha aplicável) - espelha PlanoDia do serviço. */
export interface PlanoDia {
  tipoDia: "SEMANA" | "FIM_DE_SEMANA";
  totalSlots: number;
  inicio: string | null;
  fim: string | null;
}

/** Texto curto do plano do dia para badges (null quando sem slots). */
export function textoPlanoDia(plano: PlanoDia | null | undefined): string | null {
  if (!plano || plano.totalSlots === 0) return null;
  const nome = plano.tipoDia === "SEMANA" ? "Plano de semana" : "Plano de fim-de-semana";
  const janela = plano.inicio && plano.fim ? ` · ${plano.inicio}–${plano.fim}` : "";
  return `${nome} · ${plano.totalSlots} festas/dia${janela}`;
}

/** Resposta do endpoint /api/slots-horario/dia */
export interface SlotsDiaResponse {
  data: string;
  slots: SlotDia[];
  festasSemSlot: FestaSemSlot[];
  coresUsadas: string[];
  plano: PlanoDia;
}

export const slotsHorarioApi = {
  list: (data?: string) =>
    api<SlotHorario[]>(
      `/api/slots-horario${data ? `?data=${encodeURIComponent(data)}` : ""}`
    ),
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
