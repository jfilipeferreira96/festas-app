// ===================================
// AlocacaoMonitor - Escalação de monitores por dia + intervalo horário
// ===================================

export interface AlocacaoMonitor {
  id: string;
  data: string; // ISO date string (o dia)
  horaInicio: number; // minutos desde meia-noite (0–1440). Ex.: 14h = 840
  horaFim: number; // minutos desde meia-noite
  observacoes?: string | null;
  monitorId: string;
  localId: string;
  monitor?: { id: string; nome: string; fotoUrl?: string | null };
  local?: { id: string; nome: string };
  createdAt: string;
  updatedAt: string;
}

export interface CriarAlocacaoMonitorDTO {
  data: string; // "yyyy-MM-dd"
  horaInicio: number;
  horaFim: number;
  monitorId: string;
  localId: string;
  observacoes?: string;
}

export interface AtualizarAlocacaoMonitorDTO {
  data?: string;
  horaInicio?: number;
  horaFim?: number;
  monitorId?: string;
  localId?: string;
  observacoes?: string | null;
}
