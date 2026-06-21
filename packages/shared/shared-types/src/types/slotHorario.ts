// ===================================
// Slot de Horário — horários predefinidos para festas
// ===================================

export interface SlotHorario {
  id: string;
  horaInicio: string; // HH:MM
  duracaoMin: number; // default 135 (2h15m)
  activo: boolean;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface CriarSlotHorarioDTO {
  horaInicio: string;
  duracaoMin?: number;
  activo?: boolean;
  ordem?: number;
}
