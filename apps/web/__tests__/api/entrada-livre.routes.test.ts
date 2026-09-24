import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

const auth = vi.hoisted(() => ({ ok: true }));
vi.mock("@/lib/auth-server", async () => {
  const { NextResponse } = await import("next/server");
  return {
    requireAuth: async () =>
      auth.ok
        ? { ok: true, user: { id: "user-route-test", name: "Admin Route", funcao: "ADMINISTRADOR" } }
        : { ok: false, response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) },
    getSession: async () => null,
    checkFuncao: () => null,
    checkModulo: () => null,
  };
});

import { GET, POST } from "@/app/api/entradas-livres/route";
import { PATCH as PATCH_CONCLUIR } from "@/app/api/entradas-livres/[id]/concluir/route";
import { PATCH as PATCH_PAGAMENTO } from "@/app/api/entradas-livres/[id]/pagamento/route";
import { handleError } from "@/lib/error-handler";
import { entradaLivreService } from "@/services/entradaLivre.service";

function postEntradas(body: unknown) {
  return new NextRequest("http://localhost/api/entradas-livres", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function patchConcluir(id: string, body: unknown = {}) {
  return new NextRequest(`http://localhost/api/entradas-livres/${id}/concluir`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function patchPagamento(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/entradas-livres/${id}/pagamento`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function payloadValido(overrides?: Record<string, unknown>) {
  return {
    criancas: [{ nome: "João Route", idade: 7 }],
    encarregadoNome: "Pedro Route",
    encarregadoTelefone: "913456700",
    duracaoMinutos: 60,
    custoTotal: 6,
    pago: false,
    ...overrides,
  };
}

describe("Rotas REST /api/entradas-livres", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  describe("POST /api/entradas-livres", () => {
    it("201: cria entrada activa", async () => {
      const res = await POST(postEntradas(payloadValido()));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.estado).toBe("ATIVA");
      expect(body.encarregadoNome).toBe("Pedro Route");
      expect(body.custoTotal).toBe(6);
      expect(body.pago).toBe(false);
    });

    it("400 PAGAMENTO_OBRIGATORIO sem estado de pagamento explícito", async () => {
      const { pago: _pago, ...semPago } = payloadValido();
      const res = await POST(postEntradas(semPago));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("É obrigatório indicar o estado do pagamento");
    });

    it("400 VALOR_INVALIDO sem crianças", async () => {
      const res = await POST(postEntradas(payloadValido({ criancas: [] })));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Valor inválido.");
    });

    it("401 sem sessão", async () => {
      auth.ok = false;
      try {
        const res = await GET(new NextRequest("http://localhost/api/entradas-livres"));
        expect(res.status).toBe(401);
      } finally {
        auth.ok = true;
      }
    });
  });

  describe("PATCH /api/entradas-livres/:id/concluir", () => {
    it("200 conclui e a 2ª chamada falha 409 NOT_ACTIVE (não idempotente)", async () => {
      const criada = await entradaLivreService.create(payloadValido());

      const primeira = await PATCH_CONCLUIR(patchConcluir(criada.id), {
        params: Promise.resolve({ id: criada.id }),
      });
      expect(primeira.status).toBe(200);
      expect((await primeira.json()).estado).toBe("CONCLUIDA");

      const segunda = await PATCH_CONCLUIR(patchConcluir(criada.id, { custoExcesso: 5 }), {
        params: Promise.resolve({ id: criada.id }),
      });
      expect(segunda.status).toBe(409);
      expect((await segunda.json()).error).toContain("já não está activa");
    });

    it("404 para id inexistente", async () => {
      const res = await PATCH_CONCLUIR(patchConcluir("id-que-nao-existe"), {
        params: Promise.resolve({ id: "id-que-nao-existe" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/entradas-livres/:id/pagamento", () => {
    it("ledger replace-all: substitui pagamentos e re-deriva pago", async () => {
      const criada = await entradaLivreService.create(payloadValido({ custoTotal: 10 }));

      // 1º pagamento: 12 € cobre o total final 12 € → pago true
      const primeira = await PATCH_PAGAMENTO(
        patchPagamento(criada.id, {
          custoTotalFinal: 12,
          pagamentos: [{ valor: 12, metodo: "DINHEIRO", nota: "Balcão" }],
        }),
        { params: Promise.resolve({ id: criada.id }) }
      );
      expect(primeira.status).toBe(200);
      const comPagamento = await primeira.json();
      expect(comPagamento.custoTotalFinal).toBe(12);
      expect(comPagamento.pagamentos).toHaveLength(1);
      expect(comPagamento.pago).toBe(true);

      // 2º pagamento com lista vazia: replace-all limpa o ledger → pago false
      const segunda = await PATCH_PAGAMENTO(
        patchPagamento(criada.id, { pagamentos: [] }),
        { params: Promise.resolve({ id: criada.id }) }
      );
      expect(segunda.status).toBe(200);
      const limpa = await segunda.json();
      expect(limpa.pagamentos).toHaveLength(0);
      expect(limpa.pago).toBe(false);
    });

    it("400 VALOR_INVALIDO com total negativo", async () => {
      const criada = await entradaLivreService.create(payloadValido());
      const res = await PATCH_PAGAMENTO(patchPagamento(criada.id, { custoTotalFinal: -5 }), {
        params: Promise.resolve({ id: criada.id }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Valor inválido.");
    });

    it("404 para id inexistente", async () => {
      const res = await PATCH_PAGAMENTO(patchPagamento("id-que-nao-existe", { pagamentos: [] }), {
        params: Promise.resolve({ id: "id-que-nao-existe" }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ── Matriz de erros do handler genérico (lib/error-handler.ts) ──
  describe("matriz de erros do error-handler", () => {
    const casos = [
      ["NOT_FOUND", 404, "Registo não encontrado."],
      ["VALOR_INVALIDO", 400, "Valor inválido."],
      ["NOT_ACTIVE", 409, "A entrada já não está activa. Actualize a página."],
      ["PAGAMENTO_OBRIGATORIO", 400, "É obrigatório indicar o estado do pagamento."],
      ["PAGAMENTO_METODO_OBRIGATORIO", 400, "Método de pagamento inválido."],
      ["CANNOT_DELETE_ACTIVE", 409, "Não é possível eliminar uma entrada em curso. Conclua ou cancele primeiro."],
      ["CANNOT_MODIFY_IN_PROGRESS", 409, "Não é possível alterar um registo em curso."],
    ] as const;

    it.each(casos)("%s → %i", async (codigo, status, mensagem) => {
      const res = handleError(new Error(codigo));
      expect(res.status).toBe(status);
      expect((await res.json()).error).toBe(mensagem);
    });

    it("erro desconhecido → 500 com a mensagem", async () => {
      const res = handleError(new Error("BOOM"));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe("BOOM");
    });
  });
});
