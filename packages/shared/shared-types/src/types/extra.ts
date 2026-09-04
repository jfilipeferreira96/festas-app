// ===================================
// Extra - Types for extras management
// ===================================

import type { CategoriaItem } from "./menu";

export type BaseCobranca = "POR_UNIDADE" | "POR_PESSOA";

export interface Extra {
  id: string;
  nome: string;
  descricao?: string;
  precoUnitario: number;
  icone?: string;
  categoria: CategoriaItem;
  subcategoria?: string;
  requerTexto: boolean;
  baseCobranca?: BaseCobranca;
  fimDeSemana?: boolean | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraLocal {
  id: string;
  extraId: string;
  localId: string;
}
