import { describe, it, expect } from "vitest";
import {
  PERMISSOES,
  FUNCOES,
  getNivel,
  hasAccess,
  canRead,
  canWrite,
  isModuleAdmin,
  isAdmin,
  getPermissoesPorFuncao,
  MODULOS,
} from "@/lib/permissoes";
import type { Modulo, NivelAcesso } from "@/lib/permissoes";

describe("RBAC — Matriz hardcoded", () => {
  describe("FUNCOES", () => {
    it("deve conter apenas ADMINISTRADOR, LANCHE, CACIFOS", () => {
      expect(FUNCOES).toEqual(["ADMINISTRADOR", "LANCHE", "CACIFOS"]);
    });
  });

  describe("PERMISSOES — ADMINISTRADOR", () => {
    it("deve ter administracao em todos os módulos", () => {
      for (const mod of MODULOS) {
        expect(PERMISSOES.ADMINISTRADOR[mod]).toBe("administracao");
      }
    });
  });

  describe("PERMISSOES — LANCHE", () => {
    it("deve ter escrita no módulo lanche", () => {
      expect(PERMISSOES.LANCHE.lanche).toBe("escrita");
    });

    it("deve ter leitura no módulo menus", () => {
      expect(PERMISSOES.LANCHE.menus).toBe("leitura");
    });

    it("NÃO deve ter acesso a cacifos", () => {
      expect(PERMISSOES.LANCHE.cacifos).toBeUndefined();
    });

    it("NÃO deve ter acesso a reservas", () => {
      expect(PERMISSOES.LANCHE.reservas).toBeUndefined();
    });

    it("NÃO deve ter acesso a configuracoes", () => {
      expect(PERMISSOES.LANCHE.configuracoes).toBeUndefined();
    });
  });

  describe("PERMISSOES — CACIFOS", () => {
    it("deve ter escrita no módulo cacifos", () => {
      expect(PERMISSOES.CACIFOS.cacifos).toBe("escrita");
    });

    it("NÃO deve ter acesso a reservas", () => {
      expect(PERMISSOES.CACIFOS.reservas).toBeUndefined();
    });

    it("NÃO deve ter acesso a lanche", () => {
      expect(PERMISSOES.CACIFOS.lanche).toBeUndefined();
    });
  });

  describe("getNivel()", () => {
    it("deve retornar o nível configurado", () => {
      expect(getNivel("LANCHE", "lanche")).toBe("escrita");
      expect(getNivel("CACIFOS", "cacifos")).toBe("escrita");
      expect(getNivel("ADMINISTRADOR", "reservas")).toBe("administracao");
    });

    it("deve retornar sem_acesso para módulos não atribuídos", () => {
      expect(getNivel("LANCHE", "cacifos")).toBe("sem_acesso");
      expect(getNivel("CACIFOS", "reservas")).toBe("sem_acesso");
    });

    it("deve retornar sem_acesso para função nula/indefinida", () => {
      expect(getNivel(null, "reservas")).toBe("sem_acesso");
      expect(getNivel(undefined, "cacifos")).toBe("sem_acesso");
    });
  });

  describe("hasAccess()", () => {
    it("deve conceder acesso a LANCHE em lanche com minLevel leitura", () => {
      expect(hasAccess("LANCHE", "lanche", "leitura")).toBe(true);
    });

    it("deve conceder acesso a LANCHE em lanche com minLevel escrita", () => {
      expect(hasAccess("LANCHE", "lanche", "escrita")).toBe(true);
    });

    it("NÃO deve conceder admin a LANCHE em lanche (só escrita)", () => {
      expect(hasAccess("LANCHE", "lanche", "administracao")).toBe(false);
    });

    it("deve negar acesso a LANCHE em cacifos", () => {
      expect(hasAccess("LANCHE", "cacifos", "leitura")).toBe(false);
    });

    it("deve conceder leitura a LANCHE em menus mas negar escrita", () => {
      expect(hasAccess("LANCHE", "menus", "leitura")).toBe(true);
      expect(hasAccess("LANCHE", "menus", "escrita")).toBe(false);
    });

    it("deve conceder admin completo a ADMINISTRADOR em qualquer módulo", () => {
      for (const mod of MODULOS) {
        expect(hasAccess("ADMINISTRADOR", mod, "administracao")).toBe(true);
      }
    });
  });

  describe("Helpers canRead / canWrite / isModuleAdmin", () => {
    it("canRead: LANCHE pode ler lanche, não cacifos", () => {
      expect(canRead("LANCHE", "lanche")).toBe(true);
      expect(canRead("LANCHE", "cacifos")).toBe(false);
    });

    it("canWrite: LANCHE pode escrever lanche, não menus (só leitura)", () => {
      expect(canWrite("LANCHE", "lanche")).toBe(true);
      expect(canWrite("LANCHE", "menus")).toBe(false);
    });

    it("canWrite: CACIFOS pode escrever cacifos, não lanche", () => {
      expect(canWrite("CACIFOS", "cacifos")).toBe(true);
      expect(canWrite("CACIFOS", "lanche")).toBe(false);
    });

    it("isModuleAdmin: só ADMINISTRADOR", () => {
      expect(isModuleAdmin("ADMINISTRADOR", "reservas")).toBe(true);
      expect(isModuleAdmin("LANCHE", "lanche")).toBe(false);
      expect(isModuleAdmin("CACIFOS", "cacifos")).toBe(false);
    });
  });

  describe("isAdmin()", () => {
    it("deve retornar true apenas para ADMINISTRADOR", () => {
      expect(isAdmin("ADMINISTRADOR")).toBe(true);
      expect(isAdmin("LANCHE")).toBe(false);
      expect(isAdmin("CACIFOS")).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe("getPermissoesPorFuncao()", () => {
    it("deve retornar o mapa completo para LANCHE", () => {
      const map = getPermissoesPorFuncao("LANCHE");
      expect(map.lanche).toBe("escrita");
      expect(map.menus).toBe("leitura");
      expect(Object.keys(map)).toHaveLength(2);
    });

    it("deve retornar objeto vazio para função nula", () => {
      expect(getPermissoesPorFuncao(null)).toEqual({});
      expect(getPermissoesPorFuncao(undefined)).toEqual({});
    });
  });

  describe("Isolamento entre papéis", () => {
    it("LANCHE e CACIFOS não partilham nenhum módulo", () => {
      const lancheMap = getPermissoesPorFuncao("LANCHE");
      const cacifosMap = getPermissoesPorFuncao("CACIFOS");
      const lancheMods = Object.keys(lancheMap) as Modulo[];
      const cacifosMods = Object.keys(cacifosMap) as Modulo[];
      const intersection = lancheMods.filter((m) => cacifosMods.includes(m));
      expect(intersection).toHaveLength(0);
    });
  });
});
