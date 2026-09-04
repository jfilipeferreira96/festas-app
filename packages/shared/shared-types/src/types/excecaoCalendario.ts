// ===================================
// Exceção de Calendário - feriados e dias bloqueados
// ===================================

export type TipoExcecaoCalendario = "FERIADO" | "BLOQUEADO";

export interface ExcecaoCalendario {
  id: string;
  data: string; // YYYY-MM-DD (date only)
  tipo: TipoExcecaoCalendario;
  nome: string;
  afectaPreco: boolean; // FERIADO → tarifa fim-de-semana
  bloqueiaReserva: boolean; // true → impede criar festas
  recorrenciaAnual: boolean; // feriados fixos anuais
  createdAt: string;
  updatedAt: string;
}

export interface CriarExcecaoCalendarioDTO {
  data: string;
  tipo: TipoExcecaoCalendario;
  nome: string;
  afectaPreco?: boolean;
  bloqueiaReserva?: boolean;
  recorrenciaAnual?: boolean;
}
