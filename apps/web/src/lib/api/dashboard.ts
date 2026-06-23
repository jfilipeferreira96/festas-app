import { api } from "./utils";
import type { EstadoReserva } from "@saas/shared-types";

// Re-export enums
export type { EstadoReserva };

// Dashboard-specific types
export interface DashboardKPIs {
  festasHoje: number;
  aComecar: number;
  aTerminar: number;
  cacifosOcupados: number;
  cacifosReservados: number;
  cacifosTotal: number;
  totalCriancasNoParque: number;
  criancasFestas: number;
  criancasEntradas: number;
  receitasHoje: Record<string, number>;
}

export interface ReservaEmCurso {
  id: string;
  inicioEm: string;
  fimPrevisto: string;
  fimReal?: string;
  estado: EstadoReserva;
  numCriancas: number;
  horario: string;
  duracaoMinutos: number;
  aniversariantes: { aniversariante: { id: string; nome: string } }[];
  cliente: { id: string; nome: string } | null;
  local: { id: string; nome: string } | null;
  monitores: { monitor: { id: string; nome: string } }[];
  cacifos: { id: string; numero: number; estado: string }[];
  etapas: { id: string; concluida: boolean; etapa: { id: string; nome: string } }[];
}

export interface ProximaFesta {
  id: string;
  aniversariantes: { aniversariante: { id: string; nome: string } }[];
  data: string;
  horario: string;
  numCriancas: number;
  estado: EstadoReserva;
  local: { id: string; nome: string } | null;
}

// API calls
export const dashboardApi = {
  getKPIs: () => api<DashboardKPIs>("/api/dashboard/kpis"),

  getFestasEmCurso: () => api<ReservaEmCurso[]>("/api/dashboard/festas-em-curso"),

  getProximasFestas: () => api<ProximaFesta[]>("/api/dashboard/proximas-festas"),

  getAniversarioEmBreve: () => api<ProximaFesta | null>("/api/dashboard/aniversario-em-breve"),
};
