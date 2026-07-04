// ===================================
// Sala de Lanche — espaços dedicados ao lanche das festas
// ===================================

export interface SalaLanche {
  id: string;
  nome: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriarSalaLancheDTO {
  nome: string;
  activo?: boolean;
}
