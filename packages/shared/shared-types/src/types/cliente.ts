// ===================================
// Cliente — Types for client management
// ===================================

export interface Cliente {
  id: string;
  nome: string;
  contribuinte?: string;
  email?: string;
  telefone: string;
  codigoPostal?: string;
  observacao?: string;
  optOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriarClienteDTO {
  nome: string;
  email: string;
  telefone: string;
  contribuinte?: string;
  codigoPostal?: string;
  observacao?: string;
}

export interface ClienteWithAniversariantes extends Cliente {
  aniversariantes: import("./aniversariante").Aniversariante[];
  _count?: {
    reservas: number;
  };
}