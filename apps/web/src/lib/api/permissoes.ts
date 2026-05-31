import { api } from "./utils";
import type { Permissao, PermissaoInput } from "@saas/shared-types";

// Re-export shared types
export type { Permissao, PermissaoInput };

// --- Constants ---
export const MODULOS = [
  "reservas",
  "cacifos",
  "menus",
  "relatorios",
  "divulgacoes",
  "configuracoes",
] as const;

export type Modulo = (typeof MODULOS)[number];

export const NIVEIS_ACESSO = [
  { value: "sem_acesso", label: "Sem acesso" },
  { value: "leitura", label: "Leitura" },
  { value: "escrita", label: "Escrita" },
  { value: "administracao", label: "Administração" },
];

export const MODULO_LABELS: Record<string, string> = {
  reservas: "Festas",
  cacifos: "Cacifos",
  menus: "Menus",
  relatorios: "Relatórios",
  divulgacoes: "Marketing",
  configuracoes: "Configurações",
};

export const FUNCAO_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  RECECAO: "Receção",
  MARKETING: "Marketing",
};

export const FUNCOES: string[] = ["ADMINISTRADOR", "GESTOR", "RECECAO", "MARKETING"];

// --- My Permissions response ---
export interface MinhasPermissoesResponse {
  funcao: string;
  permissoes: Record<string, string>;
}

// --- API ---
export const permissoesApi = {
  minhas: () => api<MinhasPermissoesResponse>("/api/permissoes/minhas"),

  list: () => api<Permissao[]>("/api/permissoes"),

  getByFuncao: (funcao: string) => api<Permissao[]>(`/api/permissoes/${funcao}`),

  update: (data: PermissaoInput) =>
    api<Permissao>("/api/permissoes", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  bulkUpdate: (permissoes: PermissaoInput[]) =>
    api<{ message: string; data: Permissao[] }>("/api/permissoes/bulk", {
      method: "PUT",
      body: JSON.stringify({ permissoes }),
    }),

  restaurarDefaults: () =>
    api<{ message: string; data: Permissao[] }>("/api/permissoes/restaurar-defaults", {
      method: "POST",
    }),
};