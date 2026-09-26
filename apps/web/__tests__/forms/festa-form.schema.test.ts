import { describe, it, expect } from "vitest";
import {
  buildFestaDefaults,
  buildFestaPayload,
  calcularEstimativaFesta,
  DATA_NASCIMENTO_DEFAULT,
  type FestaFormData,
} from "@/components/festas/form/festa-form.schema";
import type { Reserva } from "@/lib/api/reservas";
import { extraAlmocoJantar, DATA_FDS, DATA_SEMANA } from "../helpers/form-fixtures";

/** Form válido mínimo para o payload. */
function formValido(overrides?: Partial<FestaFormData>): FestaFormData {
  return {
    aniversariantes: [{ nome: "  Miguel  ", dataNascimento: "2019-09-26" }],
    encarregadoNome: "Ana Silva",
    encarregadoContacto: "912345678",
    encarregadoEmail: "ana@teste.pt",
    encarregadoCodigoPostal: "4000-000",
    adicionarCliente: true,
    enviarEmail: true,
    encarregadosAdicionais: [],
    data: DATA_FDS,
    horario: "11:00",
    horaLanche: "13:00",
    duracaoMinutos: 135,
    salaLancheId: "sala-a",
    cor: "#3b82f6",
    menuId: "",
    bolo: undefined,
    boloTema: "",
    boloQuantidade: undefined,
    previsaoCriancas: 10,
    numAdultos: undefined,
    numCriancasConfirmadas: undefined,
    numCriancasTotal: 10,
    modoConvite: "JUNTO",
    extrasIds: [extraAlmocoJantar.id],
    extrasTexto: { [extraAlmocoJantar.id]: "Sem glúten" },
    extrasQuantidades: { [extraAlmocoJantar.id]: 10 },
    tema: "Heróis",
    monitoresIds: [],
    etapasIds: [],
    notasCacifos: "",
    notasLanche: "",
    observacoesGerais: "Bolo às 16h",
    observacoesLesoes: "",
    observacoesBrindes: "",
    outrosExtras: "",
    totalAPagar: 230,
    pagamentos: [{ id: "pg-1", valor: 100, metodo: "MBWAY", createdAt: "2026-09-20T10:00:00.000Z" }],
    ajustes: [],
    pago: false,
    caucao: "PAGA_NO_DIA",
    valorCaucao: 50,
    metodoCaucao: "MBWAY",
    ...overrides,
  };
}

const optsCriacao = { isEdit: false, reservaTemMenu: false, menuExtrasCarregados: true };
const optsEdicao = (temMenu: boolean, extrasCarregados: boolean) => ({
  isEdit: true,
  reservaTemMenu: temMenu,
  menuExtrasCarregados: extrasCarregados,
});

describe("buildFestaPayload", () => {
  it("criação: mapeia campos base, aniversariantes trim e horário/duração", () => {
    const payload = buildFestaPayload(formValido(), optsCriacao);
    // o campo "flat" mantém o valor bruto; a lista de aniversariantes é trimada
    expect(payload.aniversarianteNome).toBe("  Miguel  ");
    expect(payload.aniversariantes).toEqual([{ nome: "Miguel", dataNascimento: "2019-09-26" }]);
    expect(payload.data).toBe(DATA_FDS);
    expect(payload.horario).toBe("11:00");
    expect(payload.duracaoMinutos).toBe(135);
    expect(payload.salaLancheId).toBe("sala-a");
    expect(payload.horaLanche).toBe("13:00");
    expect(payload.tema).toBe("Heróis");
    expect(payload.notas).toBe("Bolo às 16h");
  });

  it("criação: numCriancas = numCriancasTotal ?? previsaoCriancas", () => {
    expect(buildFestaPayload(formValido(), optsCriacao).numCriancas).toBe(10);
    expect(
      buildFestaPayload(formValido({ numCriancasTotal: undefined }), optsCriacao).numCriancas
    ).toBe(10);
  });

  it("criação: menu vazio ou NONE → menuId undefined; menu escolhido passa", () => {
    expect(buildFestaPayload(formValido(), optsCriacao).menuId).toBeUndefined();
    expect(buildFestaPayload(formValido({ menuId: "NONE" }), optsCriacao).menuId).toBeUndefined();
    expect(buildFestaPayload(formValido({ menuId: "extra-menu-landy" }), optsCriacao).menuId).toBe(
      "extra-menu-landy"
    );
  });

  it("criação: extrasIds/extrasQuantidades/extrasTexto filtrados", () => {
    const payload = buildFestaPayload(formValido(), optsCriacao);
    expect(payload.extrasIds).toEqual([extraAlmocoJantar.id]);
    expect(payload.extrasQuantidades).toEqual({ [extraAlmocoJantar.id]: 10 });
    expect(payload.extrasTexto).toEqual({ [extraAlmocoJantar.id]: "Sem glúten" });
  });

  it("criação: extrasIds vazios → extrasIds/quantidades undefined", () => {
    const payload = buildFestaPayload(formValido({ extrasIds: [], extrasTexto: {} }), optsCriacao);
    expect(payload.extrasIds).toBeUndefined();
    expect(payload.extrasQuantidades).toBeUndefined();
  });

  it("criação: pagamento/caucao seguem no payload (ledger inicial)", () => {
    const payload = buildFestaPayload(formValido(), optsCriacao);
    expect(payload.valorTotal).toBe(230);
    expect(payload.pagamentos).toHaveLength(1);
    expect(payload.pago).toBe(false);
    expect(payload.caucao).toBe("PAGA_NO_DIA");
    expect(payload.valorCaucao).toBe(50);
    expect(payload.metodoCaucao).toBe("MBWAY");
    expect(payload.enviarEmail).toBe(true);
  });

  it("edição: campos de pagamento/caucao/email são undefined (não mexem no ledger)", () => {
    const payload = buildFestaPayload(formValido(), optsEdicao(true, true));
    expect(payload.valorTotal).toBeUndefined();
    expect(payload.pagamentos).toBeUndefined();
    expect(payload.pago).toBeUndefined();
    expect(payload.caucao).toBeUndefined();
    expect(payload.valorCaucao).toBeUndefined();
    expect(payload.metodoCaucao).toBeUndefined();
    expect(payload.ajustes).toBeUndefined();
    expect(payload.enviarEmail).toBeUndefined();
  });

  it("edição: reserva com menu e catálogo NÃO carregado → menuId undefined (mantém)", () => {
    const payload = buildFestaPayload(formValido({ menuId: "extra-menu-landy" }), optsEdicao(true, false));
    expect(payload.menuId).toBeUndefined();
  });

  it("edição: reserva com menu e catálogo carregado → menuId do form (NONE limpa)", () => {
    expect(buildFestaPayload(formValido({ menuId: "extra-menu-landy" }), optsEdicao(true, true)).menuId).toBe(
      "extra-menu-landy"
    );
    // "NONE" é o valor de limpar; "" (sem menu escolhido) não altera
    expect(buildFestaPayload(formValido({ menuId: "NONE" }), optsEdicao(true, true)).menuId).toBeNull();
    expect(buildFestaPayload(formValido({ menuId: "" }), optsEdicao(true, true)).menuId).toBeUndefined();
  });

  it("encarregados adicionais com nome vão para as notas em texto", () => {
    const payload = buildFestaPayload(
      formValido({
        observacoesGerais: "",
        encarregadosAdicionais: [
          { nome: "João Pai", contacto: "911111111", email: "joao@teste.pt", codigoPostal: "" },
          { nome: "  ", contacto: "999", email: "", codigoPostal: "" },
        ],
      }),
      optsCriacao
    );
    expect(payload.notas).toBe("Encarregado 2: João Pai · 911111111 · joao@teste.pt");
  });

  it("extrasQuantidades só para os extras seleccionados (omissão 1)", () => {
    const payload = buildFestaPayload(
      formValido({ extrasQuantidades: {} }),
      optsCriacao
    );
    expect(payload.extrasQuantidades).toEqual({ [extraAlmocoJantar.id]: 1 });
  });
});

describe("buildFestaDefaults", () => {
  it("edição: mapeia reserva completa para o form", () => {
    const reserva = {
      id: "r1",
      data: `${DATA_FDS}T00:00:00.000Z`,
      horario: "11:00",
      horaLanche: "13:00",
      duracaoMinutos: 135,
      salaLancheId: "sala-a",
      cor: "#ef4444",
      cliente: { nome: "Ana Silva", telefone: "912345678", email: "ana@teste.pt", codigoPostal: "4000-000" },
      aniversariantes: [
        {
          id: "ra-1",
          aniversarianteId: "a1",
          aniversariante: { id: "a1", nome: "Miguel", dataNascimento: "2019-09-26T00:00:00.000Z" },
        },
      ],
      extras: [{ id: "re-1", extraId: extraAlmocoJantar.id, quantidade: 12, textoPersonalizado: "Sem glúten", extra: extraAlmocoJantar }],
      monitores: [{ id: "rm-1", monitor: { id: "mon-1", nome: "Tiago" } }],
      etapas: [{ id: "re-1", concluida: false, etapa: { id: "et-1", nome: "Brindes", ordem: 1 } }],
      pagamentos: [{ id: "pg-1", valor: 100, metodo: "MBWAY", nota: null, createdAt: "2026-09-20T10:00:00.000Z" }],
      valorTotal: 250,
      pago: false,
      caucao: "PAGA_NO_DIA",
      valorCaucao: 50,
      metodoCaucao: "MBWAY",
      previsaoCriancas: 12,
      numCriancas: 12,
    } as unknown as Reserva;

    const defaults = buildFestaDefaults(reserva);
    expect(defaults.aniversariantes).toEqual([{ nome: "Miguel", dataNascimento: "2019-09-26" }]);
    expect(defaults.encarregadoNome).toBe("Ana Silva");
    expect(defaults.encarregadoContacto).toBe("912345678");
    expect(defaults.encarregadoEmail).toBe("ana@teste.pt");
    expect(defaults.data).toBe(DATA_FDS);
    expect(defaults.horario).toBe("11:00");
    expect(defaults.horaLanche).toBe("13:00");
    expect(defaults.duracaoMinutos).toBe(135);
    expect(defaults.salaLancheId).toBe("sala-a");
    expect(defaults.extrasIds).toEqual([extraAlmocoJantar.id]);
    expect(defaults.extrasQuantidades).toEqual({ [extraAlmocoJantar.id]: 12 });
    expect(defaults.extrasTexto).toEqual({ [extraAlmocoJantar.id]: "Sem glúten" });
    expect(defaults.monitoresIds).toEqual(["mon-1"]);
    expect(defaults.etapasIds).toEqual(["et-1"]);
    expect(defaults.totalAPagar).toBe(250);
    expect(defaults.pagamentos).toHaveLength(1);
    expect(defaults.caucao).toBe("PAGA_NO_DIA");
    // menuId fica vazio - é preenchido por efeito no componente (match por nome)
    expect(defaults.menuId).toBe("");
  });

  it("edição: dataNascimento em falta cai para o default partilhado", () => {
    const reserva = {
      aniversariantes: [
        { id: "ra-1", aniversarianteId: "a1", aniversariante: { id: "a1", nome: "Miguel", dataNascimento: null } },
      ],
    } as unknown as Reserva;
    const defaults = buildFestaDefaults(reserva);
    expect(defaults.aniversariantes[0]!.dataNascimento).toBe(DATA_NASCIMENTO_DEFAULT);
  });

  it("criação: sem reserva usa initialValues e defaults (duração 120)", () => {
    const defaults = buildFestaDefaults(null, {
      data: DATA_SEMANA,
      horario: "09:15",
      duracaoMinutos: 90,
      horaLanche: "11:00",
      cor: "#22c55e",
      salaLancheId: "sala-b",
    });
    expect(defaults.data).toBe(DATA_SEMANA);
    expect(defaults.horario).toBe("09:15");
    expect(defaults.duracaoMinutos).toBe(90);
    expect(defaults.salaLancheId).toBe("sala-b");
    expect(defaults.previsaoCriancas).toBe(10);
    expect(defaults.aniversariantes).toEqual([{ nome: "", dataNascimento: DATA_NASCIMENTO_DEFAULT }]);
    expect(defaults.extrasIds).toEqual([]);
    expect(defaults.totalAPagar).toBeUndefined();
  });

  it("criação: sem nada → duração 120 e campos vazios", () => {
    const defaults = buildFestaDefaults(null);
    expect(defaults.duracaoMinutos).toBe(120);
    expect(defaults.horario).toBe("");
    expect(defaults.data).toBe("");
  });
});

describe("calcularEstimativaFesta", () => {
  const config = {
    precoCriancaSemana: 15,
    precoCriancaFimSemana: 20,
    precoAdulto: 6,
    minimosCriancasPorAniversariante: [
      { aniversariantes: 1, minimo: 10 },
      { aniversariantes: 2, minimo: 15 },
      { aniversariantes: 3, minimo: 20 },
    ],
  };

  it("sem config ou sem data → estimativa 0", () => {
    expect(calcularEstimativaFesta(null, DATA_SEMANA, 10, 1)).toEqual({
      estimativa: 0,
      precoCrianca: 0,
      criancasFaturadas: 0,
      minimoAplicavel: 0,
      custoAdultos: 0,
    });
    expect(calcularEstimativaFesta(config, undefined, 10, 1).estimativa).toBe(0);
  });

  it("semana: preço 15 × mínimo 10 (previsão abaixo do mínimo)", () => {
    const info = calcularEstimativaFesta(config, DATA_SEMANA, 8, 1);
    expect(info.precoCrianca).toBe(15);
    expect(info.minimoAplicavel).toBe(10);
    expect(info.criancasFaturadas).toBe(10);
    expect(info.estimativa).toBe(150);
  });

  it("FDS: preço 20 aplica-se", () => {
    const info = calcularEstimativaFesta(config, DATA_FDS, 10, 1);
    expect(info.precoCrianca).toBe(20);
    expect(info.estimativa).toBe(200);
  });

  it("mínimo sobe com nº de aniversariantes (2 → mínimo 15)", () => {
    const info = calcularEstimativaFesta(config, DATA_SEMANA, 12, 2);
    expect(info.minimoAplicavel).toBe(15);
    expect(info.criancasFaturadas).toBe(15);
    expect(info.estimativa).toBe(225);
  });

  it("preço do menu (override) sobrepõe o tarifário: Landy 16,50 em dia de semana", () => {
    const info = calcularEstimativaFesta(config, DATA_SEMANA, 10, 1, 0, 16.5);
    expect(info.precoCrianca).toBe(16.5);
    expect(info.estimativa).toBe(165);
  });

  it("override 0/NaN cai para o tarifário", () => {
    expect(calcularEstimativaFesta(config, DATA_SEMANA, 10, 1, 0, 0).precoCrianca).toBe(15);
    expect(calcularEstimativaFesta(config, DATA_SEMANA, 10, 1, 0, Number.NaN).precoCrianca).toBe(15);
  });

  it("adultos: precoAdulto × nº de adultos soma à estimativa", () => {
    const info = calcularEstimativaFesta(config, DATA_SEMANA, 10, 1, 2);
    expect(info.estimativa).toBe(150 + 2 * 6);
  });

  it("previsão ausente → default 10 crianças", () => {
    const info = calcularEstimativaFesta(config, DATA_SEMANA, undefined, 1);
    expect(info.criancasFaturadas).toBe(10);
    expect(info.estimativa).toBe(150);
  });

  it("sem tabela de mínimos → mínimo 10", () => {
    const info = calcularEstimativaFesta({ precoCriancaSemana: 12, precoCriancaFimSemana: 16 }, DATA_SEMANA, 5, 1);
    expect(info.minimoAplicavel).toBe(10);
    expect(info.criancasFaturadas).toBe(10);
    expect(info.estimativa).toBe(120);
  });
});
