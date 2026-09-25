// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, cleanup } from "@testing-library/react";

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

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks/use-reservas", () => ({
  useUpdateReserva: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

import TotalCriancasInput from "@/components/cacifos/TotalCriancasInput";
import { renderWithQuery } from "../helpers/render-form";

beforeEach(() => {
  mocks.mutateAsync.mockReset();
  mocks.mutateAsync.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe("TotalCriancasInput", () => {
  it("mostra o alerta 'cacifos vs. crianças' quando difere (sem bloquear)", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <TotalCriancasInput reservaId="r1" numCriancas={20} cacifosCount={12} />
    );

    expect(screen.getByText(/12 cacifos atribuídos vs\. 20 crianças/)).toBeInTheDocument();

    // A pessoa grava o que quiser mesmo com diferença
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "15");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: "r1",
      data: { numCriancas: 15 },
    });
  });

  it("valores iguais mostram 'Coincide com os cacifos' em vez do alerta", () => {
    renderWithQuery(
      <TotalCriancasInput reservaId="r1" numCriancas={12} cacifosCount={12} />
    );

    expect(screen.getByText(/Coincide com os 12 cacifos/)).toBeInTheDocument();
    expect(screen.queryByText(/vs\./)).not.toBeInTheDocument();
  });

  it("sem alterações não há botão Guardar; variante compacta não mostra comparação", () => {
    const { rerender } = renderWithQuery(
      <TotalCriancasInput reservaId="r1" numCriancas={12} cacifosCount={12} />
    );
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();

    rerender(<TotalCriancasInput compact reservaId="r1" numCriancas={12} cacifosCount={5} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(12);
    expect(screen.queryByText(/vs\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/Coincide/)).not.toBeInTheDocument();
  });
});
