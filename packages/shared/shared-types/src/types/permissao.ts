// ===================================
// Permissão - RBAC hardcoded (sem modelo na BD)
// ===================================
// As permissões são definidas em apps/web/src/lib/permissoes.ts
// (matriz fixa por FuncaoUtilizador). Apenas tipos partilhados aqui.

import type { FuncaoUtilizador } from "./utilizador";

export type Modulo =
  | "reservas"
  | "cacifos"
  | "menus"
  | "lanche"
  | "relatorios"
  | "divulgacoes"
  | "configuracoes";

export type NivelAcesso = "sem_acesso" | "leitura" | "escrita" | "administracao";

/** Matriz papel → módulo → nível de acesso. */
export type MatrizPermissoes = Partial<Record<FuncaoUtilizador, Partial<Record<Modulo, NivelAcesso>>>>;

/** Entrada legível por papel+módulo (para UI/listagens, se necessário). */
export interface Permissao {
  funcao: FuncaoUtilizador;
  modulo: Modulo;
  nivelAcesso: NivelAcesso;
}
