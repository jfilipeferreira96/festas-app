// ===================================
// Local - Types for room/space management
// ===================================

export interface Local {
  id: string;
  nome: string;
  activo: boolean;
  /** Sala de refeições/lanche - a "sala" atribuída às festas (plano diário). */
  isSalaLanche: boolean;
  createdAt: string;
  updatedAt: string;
}
