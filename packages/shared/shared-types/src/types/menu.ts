// ===================================
// Menu — Types for menu management (simplified)
// ===================================

export type CategoriaItem = "MENU" | "EXTRA";

export interface Menu {
  id: string;
  nome: string;
  preco: number;
  notas?: string;
  reservaId: string;
  createdAt: string;
  updatedAt: string;
}