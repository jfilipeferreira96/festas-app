// ===================================
// Utilizador — Types for user management
// ===================================

export type FuncaoUtilizador = "ADMINISTRADOR" | "GESTOR" | "RECECAO" | "MARKETING";

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
