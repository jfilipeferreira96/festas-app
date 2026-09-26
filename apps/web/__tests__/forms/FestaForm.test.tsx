// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor, cleanup } from "@testing-library/react";

// ── Toast (espiões; o useToast devolve sempre o mesmo objecto) ──
vi.mock("@/hooks/use-toast", () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    handleApiError: vi.fn(),
  };
  return { useToast: () => mockToast };
});

// ── Auth: utilizador ADMINISTRADOR (sem provider real) ──
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ user: { id: "user-1", funcao: "ADMINISTRADOR" } }),
}));

// ── flatpickr não corre em jsdom: stub do DatePicker ──
vi.mock("@/components/form/date-picker", () => ({
  __esModule: true,
  default: function DatePickerStub({
    id,
    placeholder,
    onChange,
  }: {
    id: string;
    placeholder?: string;
    defaultDate?: unknown;
    minDate?: unknown;
    maxDate?: unknown;
    onChange?: (dates: Date[]) => void;
  }) {
    return (
      <input
        data-testid={`date-picker-${id}`}
        placeholder={placeholder}
        onChange={(e) => {
          const d = new Date(e.target.value);
          if (!Number.isNaN(d.getTime())) onChange?.([d]);
        }}
      />
    );
  },
}));
// ── Pesquisa de clientes fora de âmbito ──
vi.mock("@/components/common/ClienteSearchModal", () => ({ __esModule: true, default: () => null }));

// ── API clients com fixtures (hooks TanStack reais por cima) ──
vi.mock("@/lib/api/reservas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reservas")>();
  return {
    ...actual,
    reservasApi: {
      ...actual.reservasApi,
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      atualizarPagamento: vi.fn(),
      checkDisponibilidade: vi.fn(),
    },
  };
});
vi.mock("@/lib/api/slotsHorario", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/slotsHorario")>();
  return { ...actual, slotsHorarioApi: { ...actual.slotsHorarioApi, list: vi.fn(), getDia: vi.fn() } };
});
vi.mock("@/lib/api/extras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/extras")>();
  return { ...actual, extrasApi: { ...actual.extrasApi, list: vi.fn() } };
});
vi.mock("@/lib/api/precos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/precos")>();
  return { ...actual, precosApi: { ...actual.precosApi, getConfig: vi.fn(), updateConfig: vi.fn() } };
});
vi.mock("@/lib/api/salasLanche", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/salasLanche")>();
  return { ...actual, salasLancheApi: { ...actual.salasLancheApi, list: vi.fn() } };
});

import FestaForm from "@/components/festas/form/FestaForm";
import { reservasApi } from "@/lib/api/reservas";
import { slotsHorarioApi } from "@/lib/api/slotsHorario";
import { extrasApi } from "@/lib/api/extras";
import { precosApi } from "@/lib/api/precos";
import { salasLancheApi } from "@/lib/api/salasLanche";
import { useToast } from "@/hooks/use-toast";
import {
  renderWithQuery,
  escolherOpcaoSelect,
} from "../helpers/render-form";
import * as fx from "../helpers/form-fixtures";

const toast = useToast() as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const onClose = vi.fn();

/** Configura os mocks com as fixtures e renderiza o form (modo criação). */
async function montarForm(opts?: {
  data?: string;
  ocuparSlotIds?: string[];
  conflitos?: typeof fx.conflitoFixture[];
}) {
  const data = opts?.data ?? fx.DATA_FDS;
  vi.mocked(slotsHorarioApi.list).mockImplementation(async (dia?: string) =>
    fx.slotsParaData(dia ?? data)
  );
  vi.mocked(slotsHorarioApi.getDia).mockResolvedValue(
    fx.slotsDiaFixture(data, { ocuparSlotIds: opts?.ocuparSlotIds })
  );
  vi.mocked(extrasApi.list).mockResolvedValue(fx.extrasFixture);
  vi.mocked(precosApi.getConfig).mockResolvedValue(fx.configPrecoFixture);
  vi.mocked(salasLancheApi.list).mockResolvedValue(fx.salasLancheFixture);
  vi.mocked(reservasApi.checkDisponibilidade).mockResolvedValue(
    opts?.conflitos
      ? { disponivel: false, conflitos: opts.conflitos }
      : { disponivel: true, conflitos: [] }
  );
  vi.mocked(reservasApi.create).mockResolvedValue(fx.reservaEdicaoFixture);

  renderWithQuery(<FestaForm onClose={onClose} initialValues={{ data }} />);
  await screen.findByText("Seleccionar slot");
}

function abrirSelectSlot() {
  return screen.getByText("Seleccionar slot");
}

function chipSuplemento() {
  // "+3,00 €" só existe no chip (o título da secção "Almoço / Jantar" é outro elemento)
  return screen.getByText("+3,00 €").closest("button")!;
}

/** Valor da linha "Total" da decomposição de pagamento (span a seguir ao label). */
function valorLinhaTotal(): string {
  return (screen.getByText("Total", { exact: true }).nextElementSibling?.textContent ?? "").replace(
    /\u00a0/g,
    " "
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("FestaForm", () => {
  it("1. slot 11:00 FDS com extras obrigatórios: badge 'obrigatório' + cadeado e não desmarca", async () => {
    const user = userEvent.setup();
    await montarForm();

    await escolherOpcaoSelect(user, abrirSelectSlot(), "11:00–13:15 · Sala A");

    // Chip do suplemento: seleccionado, com badge e cadeado, desabilitado
    await waitFor(() => expect(chipSuplemento()).toBeDisabled());
    expect(within(chipSuplemento()).getByText("obrigatório")).toBeInTheDocument();
    expect(within(chipSuplemento()).getByText("+3,00 €")).toBeInTheDocument();
    expect(chipSuplemento().querySelector(".lucide-lock")).not.toBeNull();

    // Stepper mostra a cobrança pelo total de crianças (quantidade sincronizada)
    expect(await screen.findByText("3,00 € × 10 crianças")).toBeInTheDocument();

    // Clicar NÃO desmarca (exigido pelo slot)
    await user.click(chipSuplemento());
    expect(chipSuplemento()).toBeDisabled();
    expect(screen.getByText("obrigatório")).toBeInTheDocument();
  });

  it("2. trocar de slot (11:00 → 09:15) remove o suplemento obrigatório anterior", async () => {
    const user = userEvent.setup();
    await montarForm();

    await escolherOpcaoSelect(user, abrirSelectSlot(), "11:00–13:15 · Sala A");
    await waitFor(() => expect(chipSuplemento()).toBeDisabled());

    await escolherOpcaoSelect(user, screen.getByText("11:00–13:15 · Sala A"), "09:15–11:30 · Sala A");

    // O suplemento deixa de estar seleccionado: sem badge, sem stepper, clicável
    await waitFor(() => expect(screen.queryByText("obrigatório")).not.toBeInTheDocument());
    expect(screen.queryByText("3,00 € × 10 crianças")).not.toBeInTheDocument();
    expect(chipSuplemento()).not.toBeDisabled();
  });

  it("3. menu Landy define o preço/criança (16,50 €) e avisa que é só de FDS", async () => {
    const user = userEvent.setup();
    await montarForm({ data: fx.DATA_SEMANA });

    // Efeito auto-selecciona o menu de semana (Basy, 15 €)
    await screen.findByText("Menu Basy");
    expect(screen.getByText(/Tarifário \(10 crianças × 15,00/)).toBeInTheDocument();

    await escolherOpcaoSelect(user, screen.getByText("Menu Basy"), "Menu Landy");

    // Aviso FDS + secção de pagamento com o preço do menu por criança
    expect(await screen.findByText("Este menu é apenas para fins-de-semana/feriados.")).toBeInTheDocument();
    expect(screen.getByText(/Tarifário \(10 crianças × 16,50/)).toBeInTheDocument();
    await waitFor(() => expect(valorLinhaTotal()).toBe("165,00 €"));
  });

  it("4. suplemento seleccionado: stepper '3,00 € × 10 crianças' e total inclui 30 €", async () => {
    const user = userEvent.setup();
    await montarForm({ data: fx.DATA_SEMANA });

    // Menu Basy auto-seleccionado: tarifário 15 € × 10 = 150 €
    await screen.findByText(/Tarifário \(10 crianças × 15,00/);

    await user.click(chipSuplemento());

    // Stepper com quantidade sincronizada ao total de crianças
    expect(await screen.findByText("3,00 € × 10 crianças")).toBeInTheDocument();
    expect(screen.getByText(/Extras \(bolos, diversão, suplementos\)/)).toBeInTheDocument();
    // Total = 150 (tarifário) + 30 (extras) = 180 €
    await waitFor(() => expect(valorLinhaTotal()).toBe("180,00 €"));
  });

  it("5. slot ocupado: opção '· ocupado' desabilitada por (hora, sala); par na outra sala activo", async () => {
    const user = userEvent.setup();
    await montarForm({ ocuparSlotIds: [fx.slotFds1100SalaA.id] });

    await user.click(abrirSelectSlot());

    const opcaoOcupada = within(document.body)
      .getByText("11:00–13:15 · Sala A · ocupado")
      .closest("button")!;
    expect(opcaoOcupada).toBeDisabled();

    // Clicar na ocupada não selecciona nada
    await user.click(opcaoOcupada);
    expect(screen.getByText("Seleccionar slot")).toBeInTheDocument();

    // O par 11:00 na Sala B está activo e selecciona
    await user.click(within(document.body).getByText("11:00–13:15 · Sala B"));
    await waitFor(() => expect(screen.getByText("11:00–13:15 · Sala B")).toBeInTheDocument());
  });

  it("6. aviso de sobreposição aparece com conflitos no /disponibilidade", async () => {
    const user = userEvent.setup();
    await montarForm({ conflitos: [fx.conflitoFixture] });

    await escolherOpcaoSelect(user, abrirSelectSlot(), "11:00–13:15 · Sala A");

    expect(await screen.findByText(/este horário sobrepõe-se a outra festa/)).toBeInTheDocument();
    expect(screen.getByText(/Miguel às 11:00/)).toBeInTheDocument();
  });

  it("7. submissão: createReserva recebe o payload com o extra obrigatório incluído", async () => {
    const user = userEvent.setup();
    await montarForm();

    await user.type(screen.getByPlaceholderText("Nome da criança"), "Miguel");
    await user.type(screen.getByPlaceholderText("Nome do responsável"), "Ana Silva");
    await user.type(screen.getByPlaceholderText("Telefone"), "912345678");
    await user.type(screen.getByPlaceholderText("Email"), "ana@teste.pt");

    await escolherOpcaoSelect(user, abrirSelectSlot(), "11:00–13:15 · Sala A");
    await waitFor(() => expect(chipSuplemento()).toBeDisabled());

    await user.click(screen.getByRole("button", { name: "Criar Reserva" }));

    await waitFor(() => expect(vi.mocked(reservasApi.create)).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(reservasApi.create).mock.calls[0]![0]!;
    expect(payload.extrasIds).toContain(fx.extraAlmocoJantar.id);
    expect(payload.aniversariantes![0]!.nome).toBe("Miguel");
    expect(payload.clienteNome).toBe("Ana Silva");
    expect(payload.horario).toBe("11:00");
    expect(payload.duracaoMinutos).toBe(135);
    expect(payload.salaLancheId).toBe("sala-a");
    expect(payload.numCriancas).toBe(10);
    expect(payload.extrasQuantidades![fx.extraAlmocoJantar.id]).toBe(10);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Festa criada com sucesso."));
    expect(onClose).toHaveBeenCalled();
  });

  it("submissão inválida: sem aniversariante → toast com mensagens e sem chamada à API", async () => {
    const user = userEvent.setup();
    await montarForm();

    await user.type(screen.getByPlaceholderText("Nome do responsável"), "Ana Silva");
    await user.type(screen.getByPlaceholderText("Telefone"), "912345678");
    await user.type(screen.getByPlaceholderText("Email"), "ana@teste.pt");
    await escolherOpcaoSelect(user, abrirSelectSlot(), "11:00–13:15 · Sala A");

    await user.click(screen.getByRole("button", { name: "Criar Reserva" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Não foi possível guardar")));
    expect(vi.mocked(reservasApi.create)).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Espelho do use case UC-F1: com a base unificada (confirmadas ?? previsão,
  // mínimo aplicado), 15 confirmadas × 15 € = 225 € = valor acordado → sem aviso.
  // Com acordo divergente (200 €) o aviso dispara com o calculado (225 €).
  describe("edição: 20 planeadas → 15 confirmadas", () => {
    it("acordo = tarifário das confirmadas → sem aviso", async () => {
      vi.mocked(slotsHorarioApi.list).mockImplementation(async (dia?: string) =>
        fx.slotsParaData(dia ?? fx.DATA_SEMANA)
      );
      vi.mocked(slotsHorarioApi.getDia).mockResolvedValue(fx.slotsDiaFixture(fx.DATA_SEMANA));
      vi.mocked(extrasApi.list).mockResolvedValue(fx.extrasFixture);
      vi.mocked(precosApi.getConfig).mockResolvedValue(fx.configPrecoFixture);
      vi.mocked(salasLancheApi.list).mockResolvedValue(fx.salasLancheFixture);
      vi.mocked(reservasApi.checkDisponibilidade).mockResolvedValue({ disponivel: true, conflitos: [] });

      const reservaEspelho = {
        ...fx.reservaEdicaoFixture,
        id: "reserva-espelho-2015",
        data: `${fx.DATA_SEMANA}T00:00:00.000Z`,
        horario: "11:00",
        numCriancas: 20,
        previsaoCriancas: 20,
        numCriancasConfirmadas: 15,
        precoCriancaAplicado: 15,
        minimoCriancas: 10,
        valorTotal: 225,
        extras: [],
        pagamentos: [fx.pagamentoFixture("pg-espelho", 225, "MBWAY")],
      } as unknown as typeof fx.reservaEdicaoFixture;
      vi.mocked(reservasApi.getById).mockResolvedValue(reservaEspelho);

      renderWithQuery(<FestaForm reserva={reservaEspelho} onClose={onClose} />);

      await waitFor(() => expect(screen.getByText(/Pagamentos/)).toBeInTheDocument());
      expect(screen.queryByText(/difere do total acordado/)).not.toBeInTheDocument();
    });

    it("acordo divergente → avisa com o tarifário atual (≈225 € vs 200 €)", async () => {
      vi.mocked(slotsHorarioApi.list).mockImplementation(async (dia?: string) =>
        fx.slotsParaData(dia ?? fx.DATA_SEMANA)
      );
      vi.mocked(slotsHorarioApi.getDia).mockResolvedValue(fx.slotsDiaFixture(fx.DATA_SEMANA));
      vi.mocked(extrasApi.list).mockResolvedValue(fx.extrasFixture);
      vi.mocked(precosApi.getConfig).mockResolvedValue(fx.configPrecoFixture);
      vi.mocked(salasLancheApi.list).mockResolvedValue(fx.salasLancheFixture);
      vi.mocked(reservasApi.checkDisponibilidade).mockResolvedValue({ disponivel: true, conflitos: [] });

      const reservaEspelho = {
        ...fx.reservaEdicaoFixture,
        id: "reserva-espelho-2015",
        data: `${fx.DATA_SEMANA}T00:00:00.000Z`,
        horario: "11:00",
        numCriancas: 20,
        previsaoCriancas: 20,
        numCriancasConfirmadas: 15,
        precoCriancaAplicado: 15,
        minimoCriancas: 10,
        valorTotal: 200,
        extras: [],
        pagamentos: [fx.pagamentoFixture("pg-espelho", 200, "MBWAY")],
      } as unknown as typeof fx.reservaEdicaoFixture;
      vi.mocked(reservasApi.getById).mockResolvedValue(reservaEspelho);

      renderWithQuery(<FestaForm reserva={reservaEspelho} onClose={onClose} />);

      expect(await screen.findByText(/difere do total acordado/)).toBeInTheDocument();
      expect(screen.getByText(/225,00\s€ \(15 crianças × 15,00/)).toBeInTheDocument();
    });
  });
});
