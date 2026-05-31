// ===================================
// Aniversariante — Types for birthday child management
// ===================================

export interface Aniversariante {
  id: string;
  nome: string;
  dataNascimento?: string;
  observacoes?: string;
  clienteId: string;
  createdAt: string;
  updatedAt: string;
}