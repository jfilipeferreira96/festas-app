import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData, TEST_IDS } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
}));

/**
 * SIMULAÇÃO de envio: mock de @/lib/email. O sendEmail falha/sucede
 * consoante o cenário, para testar a fila (EnvioEmail) sem rede.
 */
const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email", () => ({
  isEmailConfigurado: () => true,
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  escapeHtmlEmail: (t: unknown) => String(t ?? ""),
  emailShell: (_titulo: string, conteudo: string) => `<html>${conteudo}</html>`,
}));

import {
  enfileirarEmailConfirmacaoReserva,
  reprocessarFilaEmails,
  contarEmailsPorEnviar,
} from "@/services/email.service";

describe("Email Service - fila de envio (FASE 9)", () => {
  beforeAll(async () => {
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    await cleanTestData();
  });

  beforeEach(() => {
    sendEmailMock.mockReset();
  });

  it("deve enfileirar e marcar ENVIADO quando o envio sucede", async () => {
    sendEmailMock.mockResolvedValueOnce(undefined);

    await enfileirarEmailConfirmacaoReserva(TEST_IDS.RESERVA_CONFIRMADA);

    const item = await testPrisma.envioEmail.findFirst({
      where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA },
      orderBy: { createdAt: "desc" },
    });
    expect(item).not.toBeNull();
    expect(item!.estado).toBe("ENVIADO");
    expect(item!.tentativas).toBe(1);
    expect(item!.para).toBeTruthy();
    // O conteúdo inclui o resumo da festa
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const chamada = sendEmailMock.mock.calls[0][0] as { html: string; to: string };
    expect(chamada.html).toContain("Aniversariante");
    expect(chamada.to).toBe(item!.para);
  });

  it("deve marcar FALHADO quando o envio falha e permitir retry (simulação)", async () => {
    // 1ª tentativa falha
    sendEmailMock.mockRejectedValueOnce(new Error("Mailjet 503"));

    await enfileirarEmailConfirmacaoReserva(TEST_IDS.RESERVA_CONFIRMADA);

    const falhado = await testPrisma.envioEmail.findFirst({
      where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA, estado: "FALHADO" },
      orderBy: { createdAt: "desc" },
    });
    expect(falhado).not.toBeNull();
    expect(falhado!.tentativas).toBe(1);
    expect(falhado!.ultimoErro).toContain("503");

    // Ainda está por enviar
    expect(await contarEmailsPorEnviar()).toBeGreaterThan(0);

    // 2ª tentativa sucede no reprocessamento
    sendEmailMock.mockResolvedValueOnce(undefined);
    const enviados = await reprocessarFilaEmails();
    expect(enviados).toBeGreaterThanOrEqual(1);

    const aposRetry = await testPrisma.envioEmail.findUnique({ where: { id: falhado!.id } });
    expect(aposRetry!.estado).toBe("ENVIADO");
  });

  it("deve incluir dados de pagamento no email quando a caução não está paga", async () => {
    sendEmailMock.mockResolvedValueOnce(undefined);

    await enfileirarEmailConfirmacaoReserva(TEST_IDS.RESERVA_CONFIRMADA);

    const chamada = sendEmailMock.mock.calls.at(-1)![0] as { html: string };
    // RESERVA_CONFIRMADA tem caução não paga (default) → bloco de falta de caução
    expect(chamada.html).toContain("Falta pagar a caução");
  });

  it("deve respeitar o limite de tentativas (não reprocessa após MAX)", async () => {
    sendEmailMock.mockRejectedValue(new Error("Mailjet 500"));

    await enfileirarEmailConfirmacaoReserva(TEST_IDS.RESERVA_CONFIRMADA);

    // Forçar tentativas ao máximo
    const item = await testPrisma.envioEmail.findFirst({
      where: { reservaId: TEST_IDS.RESERVA_CONFIRMADA, estado: "FALHADO" },
      orderBy: { createdAt: "desc" },
    });
    await testPrisma.envioEmail.update({
      where: { id: item!.id },
      data: { tentativas: 3 },
    });

    const enviados = await reprocessarFilaEmails();
    // Nenhum item com tentativas >= 3 é reprocessado
    const confirmacao = await testPrisma.envioEmail.findUnique({ where: { id: item!.id } });
    expect(confirmacao!.tentativas).toBe(3);
    expect(confirmacao!.estado).toBe("FALHADO");
    expect(enviados).toBeGreaterThanOrEqual(0);
  });
});
