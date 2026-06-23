// ===================================
// Utilizador — Types for user management
// ===================================

export type FuncaoUtilizador = "ADMINISTRADOR" | "LANCHE" | "CACIFOS" | "MONITOR" | "FESTAS_ACABAR" | "STAFF" | "RECECAO";

export interface Utilizador {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  funcao: FuncaoUtilizador;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
