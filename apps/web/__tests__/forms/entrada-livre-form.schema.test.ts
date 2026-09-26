import { describe, it, expect } from "vitest";
import {
  buildEntradaLivreDefaults,
  buildEntradaPayload,
  dataNascimentoDeIdade,
  DATA_NASCIMENTO_DEFAULT,
  type EntradaLivreFormData,
} from "@/components/entradas-livres/form/entrada-livre-form.schema";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

/** Form válido mínimo (1 criança, sem lanche/meias/extras). */
function formValido(overrides?: Partial<EntradaLivreFormData>): EntradaLivreFormData {
  return {
    criancas: [{ nome: "  João  ", dataNascimento: "2020-01-01", querLanche: true }],
    encarregadoNome: "Pedro Costa",
    encarregadoTelefone: "913456789",
    encarregadoEmail: "pedro@teste.pt",
    encarregadoCodigoPostal: "",
    adicionarCliente: true,
    encarregadosAdicionais: [],
    duracaoMinutos: 60,
    custoTotal: 6,
    pagamentos: undefined,
    ajustes: [],
    pago: undefined,
    cacifoId: "",
    observacoes: "",
    observacoesLesoes: "",
    temLanche: false,
    horaLanche: "",
    numAdultos: 0,
    meiasQuantidade: 0,
    extrasIds: [],
    extrasQuantidades: {},
    ...overrides,
  };
}

const hoje = new Date();
const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
  hoje.getDate()
).padStart(2, "0")}`;

describe("dataNascimentoDeIdade", () => {
  it("aproxima 01-01 do ano calculado", () => {
    const ano = new Date().getFullYear();
    expect(dataNascimentoDeIdade(6)).toBe(`${ano - 6}-01-01`);
  });
  it("idade inválida/ausente → default", () => {
    expect(dataNascimentoDeIdade(null)).toBe(DATA_NASCIMENTO_DEFAULT);
    expect(dataNascimentoDeIdade(undefined)).toBe(DATA_NASCIMENTO_DEFAULT);
    expect(dataNascimentoDeIdade(Number.NaN)).toBe(DATA_NASCIMENTO_DEFAULT);
    expect(dataNascimentoDeIdade(-2)).toBe(DATA_NASCIMENTO_DEFAULT);
  });
});

describe("buildEntradaPayload", () => {
  it("criação: mapeia crianças com idade calculada a partir da data de nascimento", () => {
    const payload = buildEntradaPayload(formValido(), { isEdit: false });
    expect(payload.criancas).toEqual([{ nome: "João", idade: expect.any(Number), querLanche: true }]);
    expect(payload.criancas[0]!.idade).toBeGreaterThanOrEqual(6);
    expect(payload.encarregadoNome).toBe("Pedro Costa");
    expect(payload.encarregadoTelefone).toBe("913456789");
    expect(payload.encarregadoEmail).toBe("pedro@teste.pt");
    expect(payload.duracaoMinutos).toBe(60);
    expect(payload.custoTotal).toBe(6);
    expect(payload.cacifoId).toBeNull();
    expect(payload.meiasQuantidade).toBeUndefined();
    expect(payload.horaLanche).toBeUndefined();
    expect(payload.temLanche).toBe(false);
    expect(payload.extrasIds).toEqual([]);
  });

  it("criação: pago derivado do ledger quando a soma cobre o total (tolerância de cêntimos)", () => {
    const coberto = buildEntradaPayload(
      formValido({
        custoTotal: 10,
        pagamentos: [
          { id: "p1", valor: 4, metodo: "MBWAY", createdAt: "2026-09-23T09:00:00.000Z" },
          { id: "p2", valor: 6, metodo: "DINHEIRO", createdAt: "2026-09-23T09:05:00.000Z" },
        ],
      }),
      { isEdit: false }
    );
    expect(coberto.pago).toBe(true);

    const porPagar = buildEntradaPayload(
      formValido({ custoTotal: 10, pagamentos: [{ id: "p1", valor: 5, metodo: "MBWAY", createdAt: "x" }] }),
      { isEdit: false }
    );
    expect(porPagar.pago).toBe(false);
  });

  it("criação: sem custoTotal e sem flag → pago false; flag explícita vence", () => {
    expect(buildEntradaPayload(formValido({ custoTotal: undefined }), { isEdit: false }).pago).toBe(false);
    expect(buildEntradaPayload(formValido({ pago: true, custoTotal: undefined }), { isEdit: false }).pago).toBe(true);
  });

  it("criação: meias e extras seguem no payload (quantidades por extra, omissão 1)", () => {
    const payload = buildEntradaPayload(
      formValido({ meiasQuantidade: 2, extrasIds: ["extra-pinturas"], extrasQuantidades: {} }),
      { isEdit: false }
    );
    expect(payload.meiasQuantidade).toBe(2);
    expect(payload.extrasQuantidades).toEqual({ "extra-pinturas": 1 });
  });

  it("criação: lanche com hora, observações com encarregados adicionais", () => {
    const payload = buildEntradaPayload(
      formValido({
        temLanche: true,
        horaLanche: "11:30",
        observacoes: "Sem nozes",
        encarregadosAdicionais: [
          { nome: "Maria Mãe", contacto: "912222222", email: "maria@teste.pt", codigoPostal: "4100-000" },
        ],
      }),
      { isEdit: false }
    );
    expect(payload.temLanche).toBe(true);
    expect(payload.horaLanche).toBe("11:30");
    expect(payload.observacoes).toBe(
      "Sem nozes\n\nEncarregado 2: Maria Mãe · 912222222 · maria@teste.pt · 4100-000"
    );
  });

  it("criação: ajustes iniciais seguem no payload", () => {
    const payload = buildEntradaPayload(
      formValido({ ajustes: [{ tipo: "DESCONTO", valor: 2, motivo: "Cliente frequente" }] }),
      { isEdit: false }
    );
    expect(payload.ajustes).toEqual([{ tipo: "DESCONTO", valor: 2, motivo: "Cliente frequente" }]);
  });

  it("edição: ledger/pago/ajustes/horaLanche vazia não são alterados (undefined/null)", () => {
    const payload = buildEntradaPayload(
      formValido({
        pagamentos: [{ id: "p1", valor: 10, metodo: "MBWAY", createdAt: "x" }],
        ajustes: [{ tipo: "ACRESCIMO", valor: 3, motivo: "x" }],
        pago: true,
        horaLanche: "",
      }),
      { isEdit: true }
    );
    expect(payload.pagamentos).toBeUndefined();
    expect(payload.ajustes).toBeUndefined();
    expect(payload.pago).toBeUndefined();
    expect(payload.horaLanche).toBeNull();
  });
});

describe("buildEntradaLivreDefaults", () => {
  it("edição: mapeia entrada completa (crianças, lanche, meias, extras, ledger)", () => {
    const entrada = {
      id: "e1",
      criancas: [
        { nome: "João", idade: 6, querLanche: true },
        { nome: "Maria", idade: 4 },
      ],
      encarregadoNome: "Pedro Costa",
      encarregadoTelefone: "913456789",
      encarregadoEmail: "pedro@teste.pt",
      duracaoMinutos: 120,
      custoTotal: 25,
      pagamentos: [{ id: "p1", valor: 10, metodo: "MBWAY", nota: null, createdAt: "2026-09-23T09:00:00.000Z" }],
      pago: false,
      cacifoId: "cac-1",
      observacoes: "Balcão",
      observacoesLesoes: "Nenhuma",
      temLanche: true,
      horaLanche: "11:00",
      numAdultos: 1,
      meiasQuantidade: 2,
      extras: [{ id: "ee-1", extraId: "extra-pinturas", quantidade: 2, extra: { id: "extra-pinturas", nome: "Pinturas", precoUnitario: 2.5 } }],
    } as unknown as EntradaLivre;

    const defaults = buildEntradaLivreDefaults(entrada);
    const ano = new Date().getFullYear();
    expect(defaults.criancas).toEqual([
      { nome: "João", dataNascimento: `${ano - 6}-01-01`, querLanche: true },
      { nome: "Maria", dataNascimento: `${ano - 4}-01-01`, querLanche: true },
    ]);
    expect(defaults.encarregadoNome).toBe("Pedro Costa");
    expect(defaults.duracaoMinutos).toBe(120);
    expect(defaults.custoTotal).toBe(25);
    expect(defaults.pagamentos).toHaveLength(1);
    expect(defaults.temLanche).toBe(true);
    expect(defaults.horaLanche).toBe("11:00");
    expect(defaults.numAdultos).toBe(1);
    expect(defaults.meiasQuantidade).toBe(2);
    expect(defaults.extrasIds).toEqual(["extra-pinturas"]);
    expect(defaults.extrasQuantidades).toEqual({ "extra-pinturas": 2 });
  });

  it("criação: 1 criança vazia com default de nascimento e lanche activo", () => {
    const defaults = buildEntradaLivreDefaults(null);
    expect(defaults.criancas).toEqual([
      { nome: "", dataNascimento: DATA_NASCIMENTO_DEFAULT, querLanche: true },
    ]);
    expect(defaults.duracaoMinutos).toBe(60);
    expect(defaults.meiasQuantidade).toBe(0);
    expect(defaults.numAdultos).toBe(0);
    expect(defaults.extrasIds).toEqual([]);
    expect(defaults.custoTotal).toBeUndefined();
  });
});
