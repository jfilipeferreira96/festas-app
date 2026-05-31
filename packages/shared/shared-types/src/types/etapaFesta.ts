// ===================================
// EtapaFesta — Types for party stages/checklist
// ===================================

export interface EtapaFesta {
  id: string;
  nome: string;
  descricao?: string;
  ordem: number;
  icone?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReservaEtapa {
  id: string;
  reservaId: string;
  etapaId: string;
  concluida: boolean;
  concluidaEm?: string;
  etapa?: EtapaFesta;
}
