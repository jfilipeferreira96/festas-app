import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

// Email fire-and-forget - nunca no caminho dos testes de rota
vi.mock("@/services/email.service", () => ({
  enfileirarEmailConfirmacaoReserva: vi.fn(async () => undefined),
}));

// Auth simulada: `auth.ok` alterna 401/200 nos testes
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

import { GET, POST } from "@/app/api/reservas/route";
import { PUT } from "@/app/api/reservas/[id]/route";
import { GET as GET_DISPONIBILIDADE } from "@/app/api/reservas/disponibilidade/route";
import { handleError } from "@/app/api/reservas/error-handler";
import { t } from "@/lib/i18n-server";
import { reservaService } from "@/services/reserva.service";

// Dados longínquos dos do seed (evita colisões de slot/capacidade)
const DATA_FIXTURE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0]!;
})();

function payloadValido(overrides?: Record<string, unknown>) {
  return {
    data: DATA_FIXTURE,
    horario: "16:00",
    duracaoMinutos: 120,
    aniversariantes: [
      {
        nome: "Criança Route",
        dataNascimento: "2019-05-10",
        encarregadoNome: "Pai Route",
        encarregadoEmail: "pai-route@teste.pt",
        encarregadoTelefone: "919999901",
      },
    ],
    clienteNome: "Pai Route",
    clienteContacto: "919999901",
    clienteEmail: `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.pt`,
    numCriancas: 10,
    extrasIds: [TEST_IDS.EXTRA_1],
    extrasQuantidades: { [TEST_IDS.EXTRA_1]: 2 },
    ...overrides,
  };
}

function postReservas(body: unknown) {
  return new NextRequest("http://localhost/api/reservas", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function putReserva(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/reservas/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Rotas REST /api/reservas", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
    await testPrisma.$disconnect();
  });

  // ── POST ──────────────────────────────────────────────────────
  describe("POST /api/reservas", () => {
    it("201: cria reserva com extras e pré-reserva cacifos", async () => {
      // 2 cacifos livres para a pré-reserva (alvo = numCriancas 10)
      await testPrisma.cacifo.deleteMany();
      await testPrisma.cacifo.createMany({
        data: [
          { numero: 9901, estado: "LIVRE", configuracaoId: TEST_IDS.CONFIG_CACIFO },
          { numero: 9902, estado: "LIVRE", configuracaoId: TEST_IDS.CONFIG_CACIFO },
        ],
      });

      const res = await POST(postReservas(payloadValido()));
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.estado).toBe("RESERVA");
      expect(body.aniversariantes).toHaveLength(1);
      expect(body.aniversariantes[0].aniversariante.nome).toBe("Criança Route");
      expect(body.extras.map((e: { extraId: string }) => e.extraId)).toContain(TEST_IDS.EXTRA_1);
      // Pré-reserva materializada nos 2 cacifos livres
      expect(body.cacifos).toHaveLength(2);
      expect(body.cacifos[0].estado).toBe("RESERVADO");
      expect(body.cacifos[0].reservaId).toBe(body.id);
    });

    it("400 DATA_REQUIRED quando falta a data", async () => {
      const res = await POST(postReservas(payloadValido({ data: undefined })));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t("reserva.dataRequired"));
    });

    it("409 SLOT_OCCUPIED ao criar no mesmo horário", async () => {
      await POST(postReservas(payloadValido({ horario: "18:00" })));
      // mesma data + mesmo horário (sem sala): rejeitado pelo guard
      const res = await POST(postReservas(payloadValido({ horario: "18:00" })));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t("reserva.slotOccupied"));
    });

    it("409 DAY_BLOCKED em dia bloqueado", async () => {
      const bloqueado = new Date();
      bloqueado.setDate(bloqueado.getDate() + 45); // seed cria BLOQUEADO em +45 dias
      await POST(
        postReservas(payloadValido({ horario: "20:00", data: bloqueado.toISOString().split("T")[0] }))
      ).then(async (res) => {
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(t("reserva.dayBlocked"));
      });
    });

    it("401 sem sessão", async () => {
      auth.ok = false;
      try {
        const res = await POST(postReservas(payloadValido()));
        expect(res.status).toBe(401);
      } finally {
        auth.ok = true;
      }
    });

    it("400 em JSON malformado", async () => {
      const res = await POST(postReservas("{invalid json"));
      expect(res.status).toBe(400);
    });

    it("500 em erro desconhecido do serviço", async () => {
      const spy = vi.spyOn(reservaService, "create").mockRejectedValue(new Error("BOOM"));
      try {
        const res = await POST(postReservas(payloadValido()));
        expect(res.status).toBe(500);
        expect((await res.json()).error).toBe(t("general.serverError"));
      } finally {
        spy.mockRestore();
      }
    });
  });

  // ── PUT [id] ──────────────────────────────────────────────────
  describe("PUT /api/reservas/:id", () => {
    it("200 actualiza a reserva", async () => {
      const criada = await reservaService.create(payloadValido({ horario: "17:00" }));

      const res = await PUT(putReserva(criada.id, { tema: "Piratas", numCriancas: 14 }), {
        params: Promise.resolve({ id: criada.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tema).toBe("Piratas");
      expect(body.numCriancas).toBe(14);
    });

    it("404 NOT_FOUND para id inexistente", async () => {
      const res = await PUT(putReserva("id-que-nao-existe", { tema: "x" }), {
        params: Promise.resolve({ id: "id-que-nao-existe" }),
      });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe(t("reserva.notFound"));
    });

    it("400 CANNOT_MODIFY_IN_PROGRESS em festa EM_CURSO", async () => {
      const res = await PUT(putReserva(TEST_IDS.RESERVA_EM_CURSO, { tema: "x" }), {
        params: Promise.resolve({ id: TEST_IDS.RESERVA_EM_CURSO }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(t("reserva.cannotModifyInProgress"));
    });
  });

  // ── GET disponibilidade ───────────────────────────────────────
  describe("GET /api/reservas/disponibilidade", () => {
    it("campos em falta → disponível sem conflitos (contrato do form)", async () => {
      const res = await GET_DISPONIBILIDADE(
        new NextRequest("http://localhost/api/reservas/disponibilidade?horario=10:00")
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ disponivel: true, conflitos: [] });
    });

    it("conflitos filtrados por sala (guard por hora+sala)", async () => {
      // upsert: o cleanTestData não limpa salaLanche (partilhada entre runs)
      const [salaA, salaB] = await Promise.all([
        testPrisma.salaLanche.upsert({
          where: { id: "sala-route-a" },
          update: { nome: "Sala Route A" },
          create: { id: "sala-route-a", nome: "Sala Route A" },
        }),
        testPrisma.salaLanche.upsert({
          where: { id: "sala-route-b" },
          update: { nome: "Sala Route B" },
          create: { id: "sala-route-b", nome: "Sala Route B" },
        }),
      ]);
      const criada = await reservaService.create(
        payloadValido({ horario: "10:00", duracaoMinutos: 120, salaLancheId: salaA.id })
      );

      // Outra sala no mesmo horário → sem conflito (grelha por pares)
      const outraSala = await GET_DISPONIBILIDADE(
        new NextRequest(
          `http://localhost/api/reservas/disponibilidade?data=${DATA_FIXTURE}&horario=11:00&duracaoMinutos=60&salaLancheId=${salaB.id}`
        )
      );
      expect(await outraSala.json()).toEqual({ disponivel: true, conflitos: [] });

      // Mesma sala → conflito
      const mesmaSala = await GET_DISPONIBILIDADE(
        new NextRequest(
          `http://localhost/api/reservas/disponibilidade?data=${DATA_FIXTURE}&horario=11:00&duracaoMinutos=60&salaLancheId=${salaA.id}`
        )
      );
      const corpoMesma = await mesmaSala.json();
      expect(corpoMesma.disponivel).toBe(false);
      expect(corpoMesma.conflitos[0].id).toBe(criada.id);

      // Sem sala → conservador: há conflito
      const semSala = await GET_DISPONIBILIDADE(
        new NextRequest(
          `http://localhost/api/reservas/disponibilidade?data=${DATA_FIXTURE}&horario=11:00&duracaoMinutos=60`
        )
      );
      expect((await semSala.json()).disponivel).toBe(false);
    });
  });

  // ── Matriz erro → status → i18n (error-handler.ts) ────────────
  describe("matriz de erros do error-handler", () => {
    const casos = [
      ["SLOT_OCCUPIED", 409, "reserva.slotOccupied"],
      ["DAY_BLOCKED", 409, "reserva.dayBlocked"],
      ["CAPACITY_EXCEEDED", 409, "reserva.capacityExceeded"],
      ["NOT_FOUND", 404, "reserva.notFound"],
      ["DATA_REQUIRED", 400, "reserva.dataRequired"],
      ["HORARIO_REQUIRED", 400, "reserva.horarioRequired"],
      ["INVALID_STATUS", 400, "reserva.invalidStatus"],
      ["CANNOT_MODIFY_IN_PROGRESS", 400, "reserva.cannotModifyInProgress"],
      ["MENU_NOT_FOUND", 400, "menu.notFound"],
      ["PAGAMENTO_VALOR_INVALIDO", 400, "pagamento.valorInvalido"],
      ["PAGAMENTO_METODO_OBRIGATORIO", 400, "pagamento.metodoObrigatorio"],
      ["MONITOR_NOT_FOUND", 404, "monitor.notFound"],
    ] as const;

    it.each(casos)("%s → %i com chave %s", async (codigo, status, chave) => {
      const res = handleError(new Error(codigo));
      expect(res.status).toBe(status);
      expect((await res.json()).error).toBe(t(chave));
    });

    it("erro desconhecido → 500", async () => {
      const res = handleError(new Error("BOOM"));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(t("general.serverError"));
    });

    it("erros Prisma traduzidos (P2002 → 409)", async () => {
      const erro = new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      });
      const res = handleError(erro);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe(t("general.registoDuplicado"));
    });
  });
});
