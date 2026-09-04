// ===================================
// Monitor - Types for monitor management
// ===================================

export interface Monitor {
  id: string;
  nome: string;
  contacto: string;
  activo: boolean;
  userId?: string;
  fotoUrl?: string | null;
  // Valor que recebe por hora (para cálculo de vencimento)
  valorHora?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CriarMonitorDTO {
  nome: string;
  contacto: string;
  activo?: boolean;
  valorHora?: number | null;
}

export interface AtualizarMonitorDTO {
  nome?: string;
  contacto?: string;
  activo?: boolean;
  valorHora?: number | null;
}

// Resultado do cálculo de horas trabalhadas + vencimento de um monitor num período
export interface HorasMonitorResult {
  monitorId: string;
  monitorNome: string;
  totalMinutos: number;
  totalHoras: number;
  valorHora: number;
  valorTotal: number;
  alocacoes: number;
}
