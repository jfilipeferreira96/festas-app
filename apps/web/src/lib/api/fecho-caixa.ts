import { api } from "./utils";

export type MetodoFecho = "DINHEIRO" | "MULTIBANCO" | "TRANSFERENCIA" | "MBWAY" | "CARTAO" | "OUTRO";

export interface FechoCaixaAjuste {
  id: string;
  tipo: "ACRESCIMO" | "DESCONTO" | "REDEFINICAO";
  modo: "TOTAL" | "POR_CRIANCA" | null;
  valor: number;
  precoPorCabeca: number | null;
  motivo: string;
  metodoPagamento: string | null;
  reservaId: string | null;
  entradaLivreId: string | null;
  criadoPor: { id: string; name: string } | null;
  createdAt: string;
}

export interface FechoCaixa {
  data: string;
  porMetodo: Record<MetodoFecho, number>;
  numerario: number;
  eletronico: number;
  total: number;
  detalhe: {
    festas: number;
    entradasLivres: number;
    outros: number;
  };
  ajustes: FechoCaixaAjuste[];
  ajustesLiquido: number;
}

export const fechoCaixaApi = {
  get: (data: string) => api<FechoCaixa>(`/api/fecho-caixa?data=${encodeURIComponent(data)}`),
};
