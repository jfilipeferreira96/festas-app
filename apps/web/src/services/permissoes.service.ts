import prisma from "@festas/db";
import type { FuncaoUtilizador } from "@prisma/client";

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

export const NIVEIS_ACESSO = ["sem_acesso", "leitura", "escrita", "administracao"] as const;
export type NivelAcesso = (typeof NIVEIS_ACESSO)[number];

export const MODULO_LABELS: Record<Modulo, string> = {
  reservas: "Reservas",
  cacifos: "Cacifos",
  menus: "Menus",
  relatorios: "Relatórios",
  divulgacoes: "Marketing",
  configuracoes: "Configurações",
};

export const FUNCAO_LABELS: Record<FuncaoUtilizador, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  RECECAO: "Receção",
  MARKETING: "Marketing",
};

// Default permissions per role
const DEFAULT_PERMISSOES: Record<FuncaoUtilizador, Record<Modulo, NivelAcesso>> = {
  ADMINISTRADOR: {
    reservas: "administracao",
    cacifos: "administracao",
    menus: "administracao",
    relatorios: "administracao",
    divulgacoes: "administracao",
    configuracoes: "administracao",
  },
  GESTOR: {
    reservas: "escrita",
    cacifos: "escrita",
    menus: "escrita",
    relatorios: "leitura",
    divulgacoes: "leitura",
    configuracoes: "leitura",
  },
  RECECAO: {
    reservas: "escrita",
    cacifos: "escrita",
    menus: "leitura",
    relatorios: "sem_acesso",
    divulgacoes: "sem_acesso",
    configuracoes: "sem_acesso",
  },
  MARKETING: {
    reservas: "leitura",
    cacifos: "sem_acesso",
    menus: "sem_acesso",
    relatorios: "leitura",
    divulgacoes: "escrita",
    configuracoes: "sem_acesso",
  },
};

export interface PermissaoInput {
  funcao: FuncaoUtilizador;
  modulo: Modulo;
  nivelAcesso: NivelAcesso;
}

export const permissoesService = {
  /**
   * List all permissions, grouped by funcao and modulo.
   * Seeds default permissions if table is empty.
   */
  async list() {
    let permissoes = await prisma.funcaoPermissao.findMany({
      orderBy: [{ funcao: "asc" }, { modulo: "asc" }],
    });

    // Seed defaults if empty
    if (permissoes.length === 0) {
      await this.seedDefaults();
      permissoes = await prisma.funcaoPermissao.findMany({
        orderBy: [{ funcao: "asc" }, { modulo: "asc" }],
      });
    }

    return permissoes;
  },

  /**
   * Get permissions for a specific role
   */
  async getByFuncao(funcao: FuncaoUtilizador) {
    return prisma.funcaoPermissao.findMany({
      where: { funcao },
      orderBy: { modulo: "asc" },
    });
  },

  /**
   * Update a single permission (funcao + modulo → nivelAcesso)
   */
  async update(data: PermissaoInput) {
    if (!MODULOS.includes(data.modulo)) throw new Error("INVALID_MODULO");
    if (!NIVEIS_ACESSO.includes(data.nivelAcesso)) throw new Error("INVALID_NIVEL");
    if (data.funcao === "ADMINISTRADOR") throw new Error("ADMIN_IMMUTABLE");

    return prisma.funcaoPermissao.upsert({
      where: {
        funcao_modulo: {
          funcao: data.funcao,
          modulo: data.modulo,
        },
      },
      update: { nivelAcesso: data.nivelAcesso },
      create: {
        funcao: data.funcao,
        modulo: data.modulo,
        nivelAcesso: data.nivelAcesso,
      },
    });
  },

  /**
   * Bulk update multiple permissions at once
   */
  async bulkUpdate(permissoes: PermissaoInput[]) {
    const results = await prisma.$transaction(
      permissoes.map((p) =>
        prisma.funcaoPermissao.upsert({
          where: {
            funcao_modulo: {
              funcao: p.funcao,
              modulo: p.modulo,
            },
          },
          update: { nivelAcesso: p.nivelAcesso },
          create: {
            funcao: p.funcao,
            modulo: p.modulo,
            nivelAcesso: p.nivelAcesso,
          },
        })
      )
    );
    return results;
  },

  /**
   * Seed default permissions for all roles and modules
   */
  async seedDefaults() {
    const entries: PermissaoInput[] = [];

    for (const [funcao, modulos] of Object.entries(DEFAULT_PERMISSOES)) {
      for (const [modulo, nivelAcesso] of Object.entries(modulos)) {
        entries.push({
          funcao: funcao as FuncaoUtilizador,
          modulo: modulo as Modulo,
          nivelAcesso,
        });
      }
    }

    return this.bulkUpdate(entries);
  },

  /**
   * Check if a role has access to a specific module with a minimum level
   */
  async hasAccess(funcao: FuncaoUtilizador, modulo: Modulo, minLevel: NivelAcesso = "leitura") {
    const permissao = await prisma.funcaoPermissao.findUnique({
      where: {
        funcao_modulo: { funcao, modulo },
      },
    });

    if (!permissao) return false;

    const levelOrder: NivelAcesso[] = ["sem_acesso", "leitura", "escrita", "administracao"];
    const userLevel = levelOrder.indexOf(permissao.nivelAcesso as NivelAcesso);
    const requiredLevel = levelOrder.indexOf(minLevel);

    return userLevel >= requiredLevel;
  },
};
