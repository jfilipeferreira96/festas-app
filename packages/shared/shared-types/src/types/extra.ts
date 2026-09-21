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
  /** Ponte com Reserva.bolo (cozinha): NOSSO_1KG | NOSSO_2KG | BOLO_ARTISTICO. */
  boloTipo?: string | null;
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
