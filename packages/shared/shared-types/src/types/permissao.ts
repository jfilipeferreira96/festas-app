// ===================================
// Permissao — Types for RBAC permissions
// ===================================

export interface Permissao {
  id: string;
  funcao: string;
  modulo: string;
  nivelAcesso: string;
}

export interface PermissaoInput {
  funcao: string;
  modulo: string;
  nivelAcesso: string;
}
