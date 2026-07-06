import { api } from "./utils";
import type { AlocacaoMonitor as AlocacaoMonitorBase } from "@saas/shared-types";

// API response type (base + relations incluídas pela API)
export type AlocacaoMonitor = AlocacaoMonitorBase;

export interface ResumoMensalMonitor {
  monitorId: string;
  monitorNome: string;
  valorHora: number;
  dias: number;
  horas: number;
  custoTotal: number;
}

export interface HorasDiaDetalhe {
  data: string; // "yyyy-MM-dd"
  horas: number;
  locais: string[];
}

export interface HorasMonitorResult {
  monitorId: string;
  monitorNome: string;
  totalMinutos: number;
  totalHoras: number;
  valorHora: number;
  valorTotal: number;
  alocacoes: number;
  detalhes: HorasDiaDetalhe[];
}

export interface AlocacaoFiltros {
  data?: string; // "yyyy-MM-dd"
  dataInicio?: string;
  dataFim?: string;
  monitorId?: string;
  localId?: string;
}

export interface CriarAlocacaoData {
  data: string;
  horaInicio: number;
  horaFim: number;
  monitorId: string;
  localId: string;
  observacoes?: string;
}

export interface AtualizarAlocacaoData {
  data?: string;
  horaInicio?: number;
  horaFim?: number;
  monitorId?: string;
  localId?: string;
  observacoes?: string | null;
}

export const alocacaoMonitorApi = {
  list: (filtros?: AlocacaoFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.data) params.set("data", filtros.data);
    if (filtros?.dataInicio) params.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) params.set("dataFim", filtros.dataFim);
    if (filtros?.monitorId) params.set("monitorId", filtros.monitorId);
    if (filtros?.localId) params.set("localId", filtros.localId);
    const query = params.toString();
    return api<AlocacaoMonitor[]>(`/api/alocacoes-monitor${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api<AlocacaoMonitor>(`/api/alocacoes-monitor/${id}`),

  create: (data: CriarAlocacaoData) =>
    api<AlocacaoMonitor>("/api/alocacoes-monitor", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: AtualizarAlocacaoData) =>
    api<AlocacaoMonitor>(`/api/alocacoes-monitor/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api<{ message: string }>(`/api/alocacoes-monitor/${id}`, {
      method: "DELETE",
    }),

  calcularHoras: (monitorId: string, dataInicio?: string, dataFim?: string) => {
    const params = new URLSearchParams({ monitorId });
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    return api<HorasMonitorResult>(`/api/alocacoes-monitor/horas?${params.toString()}`);
  },

  resumoMensal: (mes: string) => {
    const params = new URLSearchParams({ mes });
    return api<ResumoMensalMonitor[]>(`/api/alocacoes-monitor/resumo-mensal?${params.toString()}`);
  },
};

// ── Helpers de conversão entre "HH:MM" e minutos desde meia-noite ──

/** "14:30" -> 870 */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 870 -> "14:30" */
export function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Formata um intervalo de minutos para leitura: "14:00 – 18:00" */
export function formatarIntervalo(horaInicio: number, horaFim: number): string {
  return `${minutosParaHora(horaInicio)} – ${minutosParaHora(horaFim)}`;
}
