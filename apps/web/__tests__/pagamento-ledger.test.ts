import { describe, it, expect } from "vitest";
import {
  comCaucaoNoLedger,
  faltaPagar,
  totalPago,
  type PagamentoLedgerItem,
} from "@/lib/pagamento-ledger";

/**
 * Helper puro do ledger com a caução: a caução paga é um valor já recebido
 * e tem de descontar a falta (queixa do cliente, 25/09/2026).
 */

const pg = (overrides: Partial<PagamentoLedgerItem> = {}): PagamentoLedgerItem => ({
  id: "pg-1",
  valor: 100,
  metodo: "DINHEIRO",
  nota: null,
  createdAt: "2026-09-25T10:00:00.000Z",
  ...overrides,
});

describe("comCaucaoNoLedger", () => {
  it("sintetiza linha fixa 'Caução' quando PAGA com valor e sem linha no ledger", () => {
    const ledger = comCaucaoNoLedger(
      [],
      { estado: "PAGA", valor: 50, metodo: "MBWAY" },
      "2026-09-25T10:00:00.000Z"
    );
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      id: "caucao-fixa",
      valor: 50,
      metodo: "MBWAY",
      nota: "Caução",
      fixa: true,
    });
  });

  it("não duplica quando já existe linha 'Caução' no ledger", () => {
    const base = [pg({ nota: "Caução", valor: 50, fixa: true })];
    const ledger = comCaucaoNoLedger(
      base,
      { estado: "PAGA", valor: 50, metodo: "MBWAY" },
      "2026-09-25T10:00:00.000Z"
    );
    expect(ledger).toBe(base);
    expect(ledger.filter((p) => p.nota === "Caução")).toHaveLength(1);
  });

  it("NAO_PAGA, PAGA_NO_DIA e valor 0 não alteram o ledger", () => {
    for (const caucao of [
      { estado: "NAO_PAGA", valor: 50, metodo: "MBWAY" },
      { estado: "PAGA_NO_DIA", valor: 50, metodo: "MBWAY" },
      { estado: "PAGA", valor: 0, metodo: "MBWAY" },
      { estado: "PAGA", valor: null, metodo: "MBWAY" },
    ]) {
      expect(comCaucaoNoLedger([], caucao, "x")).toEqual([]);
    }
  });

  it("método 'NONE' (pseudo-opção da UI) cai para DINHEIRO", () => {
    const ledger = comCaucaoNoLedger([], { estado: "PAGA", valor: 40, metodo: "NONE" }, "x");
    expect(ledger[0]!.metodo).toBe("DINHEIRO");
  });

  it("preserva os pagamentos existentes e acrescenta a caução no fim", () => {
    const base = [pg({ id: "pg-2", valor: 30, metodo: "MULTIBANCO" })];
    const ledger = comCaucaoNoLedger(base, { estado: "PAGA", valor: 50, metodo: "MBWAY" }, "x");
    expect(ledger.map((p) => p.id)).toEqual(["pg-2", "caucao-fixa"]);
  });
});

describe("falta com a caução sintetizada", () => {
  it("caução paga desconta a falta: 200 total, caução 50 → falta 150", () => {
    const ledger = comCaucaoNoLedger([], { estado: "PAGA", valor: 50, metodo: "MBWAY" }, "x");
    expect(totalPago(ledger)).toBe(50);
    expect(faltaPagar(200, ledger)).toBe(150);
  });

  it("com o restante pago, a festa fica liquidada", () => {
    const ledger = comCaucaoNoLedger(
      [pg({ valor: 150 })],
      { estado: "PAGA", valor: 50, metodo: "MBWAY" },
      "x"
    );
    expect(faltaPagar(200, ledger)).toBe(0);
  });
});
