// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, cleanup } from "@testing-library/react";

// ── Toast ──
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

// ── API clients com fixtures ──
vi.mock("@/lib/api/entradaLivre", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/entradaLivre")>();
  return {
    ...actual,
    entradaLivreApi: {
      ...actual.entradaLivreApi,
      list: vi.fn(),
      getById: vi.fn(),
      criar: vi.fn(),
      atualizar: vi.fn(),
      atualizarPagamento: vi.fn(),
    },
  };
});
vi.mock("@/lib/api/cacifos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/cacifos")>();
  return { ...actual, cacifosApi: { ...actual.cacifosApi, list: vi.fn() } };
});
vi.mock("@/lib/api/extras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/extras")>();
  return { ...actual, extrasApi: { ...actual.extrasApi, list: vi.fn() } };
});
vi.mock("@/lib/api/precos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/precos")>();
  return { ...actual, precosApi: { ...actual.precosApi, getConfig: vi.fn(), updateConfig: vi.fn() } };
});

import EntradaLivreForm from "@/components/entradas-livres/form/EntradaLivreForm";
import { entradaLivreApi } from "@/lib/api/entradaLivre";
import { cacifosApi } from "@/lib/api/cacifos";
import { extrasApi } from "@/lib/api/extras";
import { precosApi } from "@/lib/api/precos";
import { useToast } from "@/hooks/use-toast";
import { renderWithQuery, escolherOpcaoSelect } from "../helpers/render-form";
import { extraPinturas, extrasFixture, configPrecoFixture } from "../helpers/form-fixtures";

const toast = useToast() as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const onClose = vi.fn();

async function montarForm() {
  vi.mocked(entradaLivreApi.criar).mockResolvedValue({ id: "entrada-nova-1" } as never);
  vi.mocked(cacifosApi.list).mockResolvedValue([
    { id: "cac-1", numero: 1, estado: "LIVRE" },
    { id: "cac-2", numero: 2, estado: "LIVRE" },
  ] as never);
  vi.mocked(extrasApi.list).mockResolvedValue(extrasFixture);
  vi.mocked(precosApi.getConfig).mockResolvedValue(configPrecoFixture);

  renderWithQuery(<EntradaLivreForm onClose={onClose} />);
  // o select de duração traz sempre valor: "1 hora" é o âncora de render
  await screen.findByText("1 hora");
}

/** Valor da linha "Total" do breakdown de pagamento. */
function valorLinhaTotal(): string {
  return (screen.getByText("Total", { exact: true }).nextElementSibling?.textContent ?? "").replace(
    /\u00a0/g,
    " "
  );
}

/** Valor mostrado no cartão "Valor por pessoa" (custo do tempo por pessoa). */
function valorPorPessoa(): string {
  return (screen.getByText("Valor por pessoa").parentElement?.textContent ?? "").replace(/\u00a0/g, " ");
}

function cartao(nome: string | RegExp) {
  return screen.getByRole("button", { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("EntradaLivreForm", () => {
  it("total inicial = entrada 1h (6,00 €) para 1 criança", async () => {
    await montarForm();
    expect(valorPorPessoa()).toContain("6,00 €");
    await waitFor(() => expect(valorLinhaTotal()).toBe("6,00 €"));
    expect(screen.getByText(/Tempo \(1 hora × 1p\)/)).toBeInTheDocument();
  });

  it("escalão de hora: 2h → 10,00 € e 3h → 15,00 € por pessoa", async () => {
    const user = userEvent.setup();
    await montarForm();

    await escolherOpcaoSelect(user, screen.getByText("1 hora"), "2 horas");
    await waitFor(() => expect(valorPorPessoa()).toContain("10,00 €"));

    await escolherOpcaoSelect(user, screen.getByText("2 horas"), "3 horas");
    await waitFor(() => expect(valorPorPessoa()).toContain("15,00 €"));
  });

  it("meias: activar o cartão adiciona 1 par (1,50 €) ao total", async () => {
    const user = userEvent.setup();
    await montarForm();

    const meias = cartao(/Meias/);
    expect(meias).toHaveAttribute("aria-pressed", "false");
    await user.click(meias);

    expect(meias).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Meias \(1 par\)/)).toBeInTheDocument();
    await waitFor(() => expect(valorLinhaTotal()).toBe("7,50 €"));
  });

  it("multi-crianças: adicionar e remover linhas de criança", async () => {
    const user = userEvent.setup();
    await montarForm();

    await user.click(screen.getByRole("button", { name: /Adicionar criança/ }));
    expect(screen.getByPlaceholderText("Nome da criança 2")).toBeInTheDocument();

    // 2 crianças → o total do tempo dobra (6 € × 2)
    await waitFor(() => expect(valorLinhaTotal()).toBe("12,00 €"));
    expect(screen.getByText(/Tempo \(1 hora × 2p\)/)).toBeInTheDocument();

    // Remover a 2ª linha (botão de lixeira da linha)
    const lixeiras = document.querySelectorAll(".lucide-trash2");
    await user.click(lixeiras[lixeiras.length - 1]!);
    expect(screen.queryByPlaceholderText("Nome da criança 2")).not.toBeInTheDocument();
    await waitFor(() => expect(valorLinhaTotal()).toBe("6,00 €"));
  });

  it("total = entrada + lanche + adulto + extras (6 + 3 + 6 + 5 = 20,00 €)", async () => {
    const user = userEvent.setup();
    await montarForm();

    await user.click(cartao(/Lanche/));
    await user.click(cartao(/Adulto/));

    // Extras: abrir o colapsável e escolher Pinturas Faciais (2,50 € × 2 pessoas)
    await user.click(screen.getByText("Mostrar").closest("button")!);
    await user.click(screen.getByText(extraPinturas.nome).closest("button")!);

    expect(screen.getByText(/Tempo \(1 hora × 2p\)/)).toBeInTheDocument();
    expect(screen.getByText(/Lanche \(1 criança\)/)).toBeInTheDocument();
    expect(screen.getByText(/Extras: 5,00/)).toBeInTheDocument();
    await waitFor(() => expect(valorLinhaTotal()).toBe("20,00 €"));
  });

  it("submissão: payload com crianças, lanche, adulto, meias e extras", async () => {
    const user = userEvent.setup();
    await montarForm();

    await user.type(screen.getByPlaceholderText("Nome da criança 1"), "João");
    await user.type(screen.getByPlaceholderText("Nome do responsável"), "Pedro Costa");
    await user.type(screen.getByPlaceholderText("Telefone"), "913456789");

    await user.click(cartao(/Lanche/));
    await user.click(cartao(/Adulto/));
    await user.click(cartao(/Meias/));
    await user.click(screen.getByText("Mostrar").closest("button")!);
    await user.click(screen.getByText(extraPinturas.nome).closest("button")!);

    await user.click(screen.getByRole("button", { name: "Criar Entrada" }));

    await waitFor(() => expect(vi.mocked(entradaLivreApi.criar)).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(entradaLivreApi.criar).mock.calls[0]![0]!;
    expect(payload.criancas[0]!.nome).toBe("João");
    expect(payload.criancas[0]!.idade).toBeGreaterThan(0);
    expect(payload.criancas[0]!.querLanche).toBe(true);
    expect(payload.encarregadoNome).toBe("Pedro Costa");
    expect(payload.temLanche).toBe(true);
    expect(payload.numAdultos).toBe(1);
    expect(payload.meiasQuantidade).toBe(1);
    expect(payload.extrasIds).toContain(extraPinturas.id);
    expect(payload.custoTotal).toBe(21.5); // 12 tempo + 3 lanche + 5 extras + 1,5 meias
    expect(payload.pago).toBe(false); // ledger vazio, total > 0

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Entrada livre criada com sucesso."));
    expect(onClose).toHaveBeenCalled();
  });
});
