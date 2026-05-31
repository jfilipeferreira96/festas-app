// ===================================
// Participante — Types for party participants (children)
// ===================================

export interface Participante {
  id: string;
  nome: string;
  presente: boolean;
  cacifoId?: string;
  reservaId: string;
  cacifoNumero?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CriarParticipanteDTO {
  nome: string;
  reservaId: string;
}