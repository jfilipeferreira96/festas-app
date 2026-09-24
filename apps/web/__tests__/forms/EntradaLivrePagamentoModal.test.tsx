// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within, fireEvent, waitFor, cleanup } from "@testing-library/react";

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

vi.mock("@/lib/api/entradaLivre", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/entradaLivre")>();
  return {
    ...actual,
    entradaLivreApi: { ...actual.entradaLivreApi, atualizarPagamento: vi.fn() },
  };
});

// Talão: window/print fora de âmbito nos testes
vi.mock("@/utils/print-talao", () => ({ imprimirTalaoEntrada: vi.fn() }));

import EntradaLivrePagamentoModal from "@/components/entradas-livres/EntradaLivrePagamentoModal";
import { entradaLivreApi } from "@/lib/api/entradaLivre";
import { useToast } from "@/hooks/use-toast";
import { renderWithQuery, escolherOpcaoSelect } from "../helpers/render-form";
import { entradaPagamentoFixture } from "../helpers/form-fixtures";

const toast = useToast() as unknown as { success: ReturnType<typeof vi.fn> };
const onClose = vi.fn();

async function montarModal() {
  vi.mocked(entradaLivreApi.atualizarPagamento).mockResolvedValue(entradaPagamentoFixture);
  renderWithQuery(<EntradaLivrePagamentoModal entrada={entradaPagamentoFixture} onClose={onClose} />);
  await screen.findByText("Total a pagar (€)");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("EntradaLivrePagamentoModal", () => {
  it("estado inicial: total 20 €, recebido 10 €, falta 10 €; sugerido inclui +5 € de excesso", async () => {
    await montarModal();

    expect(screen.getByText("Por pagar")).toBeInTheDocument();
    expect(screen.getByText(/Falta liquidar 10,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/10,00\s€ de 20,00\s€/)).toBeInTheDocument();
    // Sugerido = custo 20 € + excesso 5 €
    expect(screen.getByText(/Excesso de tempo/)).toBeInTheDocument();
    expect(screen.getByText(/Sugerido/)).toBeInTheDocument();
  });

  it("total editável e 'Usar sugerido' (25 €) actualizam a falta", async () => {
    const user = userEvent.setup();
    await montarModal();

    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "30" } });
    expect(screen.getByText(/Falta liquidar 20,00\s€/)).toBeInTheDocument();

    await user.click(screen.getByText("Usar sugerido"));
    expect(screen.getByDisplayValue("25.00")).toBeInTheDocument();
    expect(screen.getByText(/Falta liquidar 15,00\s€/)).toBeInTheDocument();
  });

  it("pagamento que liquida muda o badge para 'Pago'", async () => {
    const user = userEvent.setup();
    await montarModal();

    await escolherOpcaoSelect(user, screen.getByText("Método *"), "Multibanco");
    // valor pré-preenchido com o que falta (10,00 = 20 - 10 já pago)
    expect(screen.getByDisplayValue("10.00")).toBeInTheDocument();
    await user.click(screen.getByTitle("Adicionar pagamento"));

    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getAllByText("Liquidado").length).toBeGreaterThanOrEqual(2);
    // Ledger: soma (10 + 10) cobre o total acordado (20)
    expect(screen.getByText(/20,00\s€ de 20,00\s€/)).toBeInTheDocument();
  });

  it("guardar: custoTotalFinal + replace-all do ledger", async () => {
    const user = userEvent.setup();
    await montarModal();

    await user.click(screen.getByText("Usar sugerido"));
    await escolherOpcaoSelect(user, screen.getByText("Método *"), "Multibanco");
    await user.click(screen.getByTitle("Adicionar pagamento"));
    await user.click(within(document.body).getByRole("button", { name: "Guardar Pagamento" }));

    await waitFor(() => expect(vi.mocked(entradaLivreApi.atualizarPagamento)).toHaveBeenCalledTimes(1));
    const chamada = vi.mocked(entradaLivreApi.atualizarPagamento).mock.calls[0]!;
    expect(chamada[0]).toBe(entradaPagamentoFixture.id);
    expect(chamada[1]!.custoTotalFinal).toBe(25);
    expect(chamada[1]!.pagamentos).toEqual([
      { valor: 10, metodo: "MBWAY", nota: undefined },
      { valor: 15, metodo: "MULTIBANCO", nota: undefined },
    ]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pagamento atualizado com sucesso."));
    expect(onClose).toHaveBeenCalled();
  });
});
