// ===================================
// NotaDiaria — Notas de manhã/tarde para a vista MONITOR
// ===================================

export interface NotaDiaria {
  id: string;
  data: string;
  notasManha?: string;
  notasTarde?: string;
}

export interface UpsertNotaDiariaDTO {
  data: string;
  notasManha?: string;
  notasTarde?: string;
}
