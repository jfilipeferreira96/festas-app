// ===================================
// Menu — Types for menu management (simplified)
// ===================================

export type CategoriaItem = "MENU" | "EXTRA";

export interface Menu {
  id: string;
  nome: string;
  preco: number;
  notas?: string;
  // Notas de lanche/alergias (visível à conta LANCHE)
  notasLanche?: string;
  // Itens do lanche (estruturado, opcional)
  itensLanche?: unknown;
  reservaId: string;
  createdAt: string;
  updatedAt: string;
}

