import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Helpers de render para os testes de componente (jsdom).
 *
 * Os ficheiros de teste usam `// @vitest-environment jsdom` no topo e montam
 * os vi.mock com as fábricas daqui (stubDatePicker, stubClienteSearchModal).
 */

/** QueryClient de teste: sem retries (evita esperas em erros). */
export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface RenderFormOptions extends Omit<RenderOptions, "wrapper"> {
  /** Função do utilizador simulado no AuthContext (default ADMINISTRADOR). */
  funcao?: string;
}

/**
 * Renderiza `ui` dentro de um QueryClientProvider fresco.
 * O AuthContext é mockado nos ficheiros de teste (useUser → funcao).
 */
export function renderWithQuery(ui: React.ReactElement, options?: RenderFormOptions) {
  const queryClient = criarQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = render(ui, { wrapper: Wrapper, ...options });
  return { ...utils, queryClient };
}

/** Fábrica do mock do módulo `@/components/form/date-picker` (flatpickr não corre em jsdom). */
export function stubDatePicker() {
  function DatePickerStub({
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
  }
  return { __esModule: true, default: DatePickerStub };
}

/** Fábrica do mock do módulo `@/components/common/ClienteSearchModal` (fora de âmbito). */
export function stubClienteSearchModal() {
  return { __esModule: true, default: () => null };
}

/** Objecto toast com espiões - usar DENTRO do vi.mock("@/hooks/use-toast"). */
export function criarToastMock() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    handleApiError: vi.fn(),
  };
}

/** Formata um valor em euros (espelho do formatEuro) para asserções exactas. */
export function euro(valor: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);
}

/**
 * Abre o dropdown do `Select` custom (portal) e escolhe a opção por texto.
 * O Select é um botão + portal com botões de opção.
 */
export async function escolherOpcaoSelect(
  user: { click: (el: Element) => Promise<void> },
  botao: HTMLElement,
  textoOpcao: string | RegExp
) {
  const { within } = await import("@testing-library/react");
  await user.click(botao);
  const dropdown = await within(document.body).findByText(textoOpcao);
  await user.click(dropdown);
}
