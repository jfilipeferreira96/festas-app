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

vi.mock("@/lib/api/reservas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reservas")>();
  return {
    ...actual,
    reservasApi: { ...actual.reservasApi, atualizarPagamento: vi.fn() },
  };
});

import PagamentoModal from "@/components/festas/PagamentoModal";
import { reservasApi } from "@/lib/api/reservas";
import { useToast } from "@/hooks/use-toast";
import { renderWithQuery, escolherOpcaoSelect } from "../helpers/render-form";
import {
  reservaPagamentoFixture,
  reservaPagamentoCaucaoPagaFixture,
} from "../helpers/form-fixtures";

const toast = useToast() as unknown as { success: ReturnType<typeof vi.fn> };
const onClose = vi.fn();

async function montarModal(reserva = reservaPagamentoFixture) {
  vi.mocked(reservasApi.atualizarPagamento).mockResolvedValue(reserva);
  renderWithQuery(<PagamentoModal reserva={reserva} onClose={onClose} />);
  // A tab inicial é "Caução & Desconto": abrir a tab "Pagamento" (ledger + total)
  fireEvent.click(screen.getByRole("tab", { name: "Pagamento" }));
  // O total é só-leitura (sem input): a caixa acordado é o marco da tab
  await screen.findByText(/Valor acordado da festa/);
}

/** Texto do resumo do rodapé (textContent inclui os spans filhos). */
function textoResumo(): string {
  return (screen.getByText(/A pagar/).textContent ?? "").replace(/\u00a0/g, " ");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("PagamentoModal (festas)", () => {
  it("não tem input de total: o total acordado é só-leitura", async () => {
    await montarModal();

    expect(screen.queryByText("Total a pagar (€)")).not.toBeInTheDocument();
    expect(screen.getByText(/Valor acordado da festa/)).toBeInTheDocument();
  });

  it("mostra total acordado, ledger com soma e estado pago derivado (0,00 € de 148,00 €)", async () => {
    await montarModal();

    expect(screen.getByText("Por pagar")).toBeInTheDocument();
    expect(screen.getByText(/Falta liquidar 148,00\s€/)).toBeInTheDocument();
    // Ledger: soma dos pagamentos sobre o total devido
    expect(screen.getByText(/0,00\s€ de 148,00\s€/)).toBeInTheDocument();
    const resumo = textoResumo();
    expect(resumo).toContain("A pagar 148,00 €");
    expect(resumo).toContain("Recebido 0,00 €");
    expect(resumo).toContain("Falta 148,00 €");
  });

  it("caução paga sem linha no ledger (legado) é sintetizada como fixa e desconta a falta", async () => {
    await montarModal(reservaPagamentoCaucaoPagaFixture);

    // Ledger: linha fixa "Caução" de 50 € (não removível)
    expect(screen.getByTitle(/Caução \(já pago, não removível\)/)).toBeInTheDocument();
    expect(screen.getByText(/· Caução/)).toBeInTheDocument();
    expect(screen.getByText(/\+50,00\s€/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Remover pagamento/)).not.toBeInTheDocument();

    // Falta desconta a caução: 148 − 50 = 98 €
    expect(screen.getByText(/Falta liquidar 98,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/50,00\s€ de 148,00\s€/)).toBeInTheDocument();
    expect(textoResumo()).toContain("Recebido 50,00 €");
    expect(textoResumo()).toContain("Falta 98,00 €");
  });

  it("pagamento que liquida muda o badge para 'Pago' e mostra Liquidado", async () => {
    const user = userEvent.setup();
    await montarModal();

    // Método obrigatório no ledger
    await escolherOpcaoSelect(user, screen.getByText("Método *"), "Dinheiro");
    // O valor vem pré-preenchido com o que falta (148,00)
    expect(screen.getByDisplayValue("148.00")).toBeInTheDocument();
    await user.click(screen.getByTitle("Adicionar pagamento"));

    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getAllByText("Liquidado").length).toBeGreaterThanOrEqual(2);
    expect(textoResumo()).toContain("Recebido 148,00 €");
    // Com o total coberto, o form de adicionar desaparece
    expect(screen.queryByTitle("Adicionar pagamento")).not.toBeInTheDocument();
  });

  it("guardar: replace-all do ledger + toast + fecho", async () => {
    const user = userEvent.setup();
    await montarModal();

    await escolherOpcaoSelect(user, screen.getByText("Método *"), "Dinheiro");
    await user.click(screen.getByTitle("Adicionar pagamento"));
    await user.click(within(document.body).getByRole("button", { name: "Guardar Pagamento" }));

    await waitFor(() => expect(vi.mocked(reservasApi.atualizarPagamento)).toHaveBeenCalledTimes(1));
    const chamada = vi.mocked(reservasApi.atualizarPagamento).mock.calls[0]!;
    expect(chamada[0]).toBe(reservaPagamentoFixture.id);
    expect(chamada[1]!.valorTotal).toBe(148);
    expect(chamada[1]!.pagamentos).toEqual([{ valor: 148, metodo: "DINHEIRO", nota: undefined }]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pagamento atualizado com sucesso."));
    expect(onClose).toHaveBeenCalled();
  });

  it("usar o total sugerido actualiza o total acordado (e a falta)", async () => {
    const user = userEvent.setup();
    await montarModal();

    // Sugerido = 15 € × 10 crianças = 150 € (fixture com precoCriancaAplicado 15)
    await user.click(screen.getByText("Usar sugerido"));

    // Total e falta passam a 150 € (total e ledger ficam em sincronia)
    expect(screen.getByText(/Falta liquidar 150,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/0,00\s€ de 150,00\s€/)).toBeInTheDocument();
    expect(textoResumo()).toContain("A pagar 150,00 €");
  });
});
