import { api } from "./utils";

export interface AjustePagamento {
  id: string;
  tipo: "ACRESCIMO" | "DESCONTO" | "REDEFINICAO";
  valor: number;
  motivo: string;
  metodoPagamento?: string | null;
  /** Para REDEFINICAO: "TOTAL" | "POR_CRIANCA" */
  modo?: "TOTAL" | "POR_CRIANCA" | null;
  /** Para REDEFINICAO POR_CRIANCA: preço unitário aplicado */
  precoPorCabeca?: number | null;
  reservaId?: string | null;
  entradaLivreId?: string | null;
  criadoPorId?: string | null;
  criadoPor?: { id: string; name: string } | null;
  createdAt: string;
}

export interface CriarAjusteDTO {
  tipo: "ACRESCIMO" | "DESCONTO";
  valor: number;
  motivo: string;
  metodoPagamento?: string;
  reservaId?: string;
  entradaLivreId?: string;
}

export interface RedefinirPrecoDTO {
  modo: "TOTAL" | "POR_CRIANCA";
  /** Novo total absoluto (modo TOTAL) */
  valor?: number;
  /** Preço por criança (modo POR_CRIANCA) */
  precoPorCabeca?: number;
  motivo: string;
  reservaId?: string;
  entradaLivreId?: string;
}

export const ajustePagamentoApi = {
  list: (filtros: { reservaId?: string; entradaLivreId?: string }) => {
    const params = new URLSearchParams();
    if (filtros.reservaId) params.set("reservaId", filtros.reservaId);
    if (filtros.entradaLivreId) params.set("entradaLivreId", filtros.entradaLivreId);
    const query = params.toString();
    return api<AjustePagamento[]>(`/api/ajustes-pagamento${query ? `?${query}` : ""}`);
  },

  criar: (data: CriarAjusteDTO) =>
    api<AjustePagamento>("/api/ajustes-pagamento", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  redefinir: (data: RedefinirPrecoDTO) =>
    api<AjustePagamento>("/api/ajustes-pagamento/redefinir", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  eliminar: (id: string) =>
    api<{ message: string }>(`/api/ajustes-pagamento/${id}`, { method: "DELETE" }),
};
