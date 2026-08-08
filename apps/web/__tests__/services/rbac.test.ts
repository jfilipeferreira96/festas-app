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
  getHomeRoute,
  MODULOS,
} from "@/lib/permissoes";
import type { Modulo, NivelAcesso } from "@/lib/permissoes";

describe("RBAC — Matriz hardcoded", () => {
  describe("FUNCOES", () => {
    it("deve conter os 7 papéis: ADMINISTRADOR, LANCHE, CACIFOS, MONITOR, FESTAS_ACABAR, STAFF, RECECAO", () => {
      expect(FUNCOES).toEqual(["ADMINISTRADOR", "LANCHE", "CACIFOS", "MONITOR", "FESTAS_ACABAR", "STAFF", "RECECAO"]);
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

    it("deve ter leitura no módulo reservas", () => {
      expect(PERMISSOES.CACIFOS.reservas).toBe("leitura");
    });

    it("NÃO deve ter acesso a lanche", () => {
      expect(PERMISSOES.CACIFOS.lanche).toBeUndefined();
    });

    it("NÃO deve ter acesso a clientes", () => {
      expect(PERMISSOES.CACIFOS.clientes).toBeUndefined();
    });

    it("NÃO deve ter acesso a configuracoes", () => {
      expect(PERMISSOES.CACIFOS.configuracoes).toBeUndefined();
    });
  });

  describe("PERMISSOES — clientes (módulo)", () => {
    it("ADMINISTRADOR deve ter administracao em clientes", () => {
      expect(PERMISSOES.ADMINISTRADOR.clientes).toBe("administracao");
    });

    it("apenas ADMINISTRADOR e RECECAO devem ter acesso a clientes", () => {
      expect(PERMISSOES.ADMINISTRADOR.clientes).toBe("administracao");
      expect(PERMISSOES.RECECAO.clientes).toBe("leitura");
      expect(PERMISSOES.LANCHE.clientes).toBeUndefined();
      expect(PERMISSOES.CACIFOS.clientes).toBeUndefined();
      expect(PERMISSOES.MONITOR.clientes).toBeUndefined();
      expect(PERMISSOES.FESTAS_ACABAR.clientes).toBeUndefined();
      expect(PERMISSOES.STAFF.clientes).toBeUndefined();
    });
  });

  describe("PERMISSOES — MONITOR", () => {
    it("deve ter leitura no módulo monitores", () => {
      expect(PERMISSOES.MONITOR.monitores).toBe("leitura");
    });

    it("NÃO deve ter acesso a reservas", () => {
      expect(PERMISSOES.MONITOR.reservas).toBeUndefined();
    });

    it("NÃO deve ter escrita em monitores (só leitura)", () => {
      expect(hasAccess("MONITOR", "monitores", "escrita")).toBe(false);
      expect(canRead("MONITOR", "monitores")).toBe(true);
    });

    it("NÃO deve ter acesso a nenhum outro módulo", () => {
      expect(PERMISSOES.MONITOR.lanche).toBeUndefined();
      expect(PERMISSOES.MONITOR.cacifos).toBeUndefined();
      expect(PERMISSOES.MONITOR.festas_acabar).toBeUndefined();
    });
  });

  describe("PERMISSOES — FESTAS_ACABAR", () => {
    it("deve ter escrita no módulo festas_acabar", () => {
      expect(PERMISSOES.FESTAS_ACABAR.festas_acabar).toBe("escrita");
    });

    it("NÃO deve ter acesso a reservas", () => {
      expect(PERMISSOES.FESTAS_ACABAR.reservas).toBeUndefined();
    });

    it("NÃO deve ter admin em festas_acabar (só escrita)", () => {
      expect(hasAccess("FESTAS_ACABAR", "festas_acabar", "administracao")).toBe(false);
      expect(canWrite("FESTAS_ACABAR", "festas_acabar")).toBe(true);
    });

    it("NÃO deve ter acesso a nenhum outro módulo", () => {
      expect(PERMISSOES.FESTAS_ACABAR.lanche).toBeUndefined();
      expect(PERMISSOES.FESTAS_ACABAR.cacifos).toBeUndefined();
      expect(PERMISSOES.FESTAS_ACABAR.monitores).toBeUndefined();
    });
  });

  describe("PERMISSOES — STAFF", () => {
    it("deve ter leitura no módulo reservas", () => {
      expect(PERMISSOES.STAFF.reservas).toBe("leitura");
    });

    it("deve ter escrita no módulo cacifos", () => {
      expect(PERMISSOES.STAFF.cacifos).toBe("escrita");
    });

    it("deve ter leitura no módulo festas_acabar", () => {
      expect(PERMISSOES.STAFF.festas_acabar).toBe("leitura");
    });

    it("NÃO deve ter acesso a lanche", () => {
      expect(PERMISSOES.STAFF.lanche).toBeUndefined();
    });

    it("NÃO deve ter acesso a configuracoes", () => {
      expect(PERMISSOES.STAFF.configuracoes).toBeUndefined();
    });

    it("NÃO deve ter escrita em reservas (só leitura)", () => {
      expect(hasAccess("STAFF", "reservas", "escrita")).toBe(false);
      expect(canRead("STAFF", "reservas")).toBe(true);
    });
  });

  describe("PERMISSOES — RECECAO", () => {
    it("deve ter escrita no módulo reservas", () => {
      expect(PERMISSOES.RECECAO.reservas).toBe("escrita");
    });

    it("deve ter apenas leitura no módulo clientes (não editar — privacidade/rotação de staff)", () => {
      expect(PERMISSOES.RECECAO.clientes).toBe("leitura");
      expect(hasAccess("RECECAO", "clientes", "escrita")).toBe(false);
      expect(canRead("RECECAO", "clientes")).toBe(true);
    });

    it("deve ter leitura no módulo cacifos", () => {
      expect(PERMISSOES.RECECAO.cacifos).toBe("leitura");
    });

    it("NÃO deve ter escrita em cacifos (só leitura)", () => {
      expect(hasAccess("RECECAO", "cacifos", "escrita")).toBe(false);
      expect(canRead("RECECAO", "cacifos")).toBe(true);
    });

    it("NÃO deve ter acesso a lanche", () => {
      expect(PERMISSOES.RECECAO.lanche).toBeUndefined();
    });

    it("NÃO deve ter acesso a configuracoes", () => {
      expect(PERMISSOES.RECECAO.configuracoes).toBeUndefined();
    });

    it("NÃO deve ter acesso a monitores", () => {
      expect(PERMISSOES.RECECAO.monitores).toBeUndefined();
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
      expect(getNivel("CACIFOS", "lanche")).toBe("sem_acesso");
      expect(getNivel("MONITOR", "reservas")).toBe("sem_acesso");
      expect(getNivel("FESTAS_ACABAR", "cacifos")).toBe("sem_acesso");
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
      expect(isAdmin("MONITOR")).toBe(false);
      expect(isAdmin("FESTAS_ACABAR")).toBe(false);
      expect(isAdmin("STAFF")).toBe(false);
      expect(isAdmin("RECECAO")).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe("getHomeRoute()", () => {
    it("ADMINISTRADOR deve ir para /dashboard", () => {
      expect(getHomeRoute("ADMINISTRADOR")).toBe("/dashboard");
    });

    it("LANCHE deve ir para /lanche", () => {
      expect(getHomeRoute("LANCHE")).toBe("/lanche");
    });

    it("CACIFOS deve ir para /cacifos", () => {
      expect(getHomeRoute("CACIFOS")).toBe("/cacifos");
    });

    it("MONITOR deve ir para /monitores", () => {
      expect(getHomeRoute("MONITOR")).toBe("/monitores");
    });

    it("FESTAS_ACABAR deve ir para /festas-acabar", () => {
      expect(getHomeRoute("FESTAS_ACABAR")).toBe("/festas-acabar");
    });

    it("STAFF deve ir para /festas", () => {
      expect(getHomeRoute("STAFF")).toBe("/festas");
    });

    it("RECECAO deve ir para /reservas", () => {
      expect(getHomeRoute("RECECAO")).toBe("/reservas");
    });

    it("função nula/indefinida deve ir para /dashboard", () => {
      expect(getHomeRoute(null)).toBe("/dashboard");
      expect(getHomeRoute(undefined)).toBe("/dashboard");
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

