// ===================================
// Cacifo - Types for locker management
// ===================================

export type EstadoCacifo = "LIVRE" | "OCUPADO" | "RESERVADO";

export interface Cacifo {
  id: string;
  numero: number;
  nome?: string;
  estado: EstadoCacifo;
  notas?: string;
  criancas?: string;
  configuracaoId: string;
  reservaId?: string;
  participanteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguracaoCacifo {
  id: string;
  totalCacifos: number;
  createdAt: string;
  updatedAt: string;
  cacifos?: Cacifo[];
}

export interface UpdateConfiguracaoCacifoDTO {
  totalCacifos: number;
  nomes?: Record<number, string>;
}