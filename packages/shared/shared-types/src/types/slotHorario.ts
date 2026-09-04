// ===================================
// Slot de Horário - horários predefinidos para festas
// ===================================

export interface SlotHorario {
  id: string;
  horaInicio: string; // HH:MM
  duracaoMin: number; // default 135 (2h15m)
  activo: boolean;
  ordem: number;
  // ── Defaults aplicados ao criar uma festa neste slot ──
  corDefault?: string | null; // Cor sugerida (ex: "#0095C8")
  horaLancheDefault?: string | null; // HH:MM - hora sugerida do lanche
  salaLancheId?: string | null; // FK opcional para Local (isSalaLanche)
  salaLancheNome?: string | null; // Nome da sala de lanche (denormalizado para UI)
  createdAt: string;
  updatedAt: string;
}

export interface CriarSlotHorarioDTO {
  horaInicio: string;
  duracaoMin?: number;
  activo?: boolean;
  ordem?: number;
  corDefault?: string | null;
  horaLancheDefault?: string | null;
  salaLancheId?: string | null;
}
