// ===================================
// Extra — Types for extras management
// ===================================

import type { CategoriaItem } from "./menu";

export interface Extra {
  id: string;
  nome: string;
  descricao?: string;
  precoUnitario: number;
  icone?: string;
  categoria: CategoriaItem;
  subcategoria?: string;
  requerTexto: boolean;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraLocal {
  id: string;
  extraId: string;
  localId: string;
}
