import { api } from "./utils";
import type { Pagamento, CriarPagamentoDTO } from "@saas/shared-types";

export interface Crianca {
  nome: string;
  idade?: number;
  querLanche?: boolean;
}

export interface EntradaLivreExtraItem {
  id: string;
  entradaLivreId: string;
  extraId: string;
  quantidade: number;
  textoPersonalizado?: string;
  extra: { id: string; nome: string; precoUnitario: number; baseCobranca?: "POR_UNIDADE" | "POR_PESSOA" };
}

export interface EntradaLivre {
  id: string;
  criancas: Crianca[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  custoHora: number;
  custoTotal: number;
  custoExcesso?: number;
  custoTotalFinal?: number;
  inicioEm: string;
  fimPrevisto: string;
  fimReal?: string;
  excessoMinutos: number;
  clienteId?: string;
  cliente?: { id: string; nome: string; email: string | null; telefone: string };
  estado: "ATIVA" | "CONCLUIDA" | "CANCELADA";
  /** Ledger de pagamentos (fonte única do recebido). */
  pagamentos?: Pagamento[];
  pago: boolean;
  pagoExcesso: boolean;
  // Meias
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;
  cacifoId?: string;
  cacifo?: { id: string; numero: number; nome?: string };
  observacoes?: string;
  observacoesLesoes?: string;
  // Lanche
  temLanche?: boolean;
  estadoLanche?: string;
  horaLanche?: string;
  // Adultos (encarregados que acompanham e pagam)
  numAdultos?: number;
  extras: EntradaLivreExtraItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CriarEntradaLivreDTO {
  criancas: Crianca[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  custoTotal?: number;
  pago?: boolean;
  cacifoId?: string | null;
  extrasIds?: string[];
  extrasQuantidades?: Record<string, number>;
  observacoes?: string;
  observacoesLesoes?: string;
  // Lanche
  temLanche?: boolean;
  // Adultos (encarregados que acompanham e pagam)
  numAdultos?: number;
  // Lanche
  horaLanche?: string | null;
  /** Ledger de pagamentos. Se presente, substitui o ledger existente (replace-all). */
  pagamentos?: CriarPagamentoDTO[];
  // Meias
  meiasQuantidade?: number;
}

export interface AtualizarEntradaLivreDTO {
  criancas?: Crianca[];
  encarregadoNome?: string;
  encarregadoTelefone?: string;
  encarregadoEmail?: string;
  duracaoMinutos?: number;
  custoTotal?: number;
  pago?: boolean;
  cacifoId?: string | null;
  horaLanche?: string | null;
  extrasIds?: string[];
  extrasQuantidades?: Record<string, number>;
  observacoes?: string;
  observacoesLesoes?: string;
  // Lanche
  temLanche?: boolean;
  // Adultos
  numAdultos?: number;
  // Meias
  meiasQuantidade?: number;
}

export const entradaLivreApi = {
  list: (filtros?: { estado?: string; data?: string; dataInicio?: string; dataFim?: string; dataConclusao?: string; pesquisa?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.data) params.set("data", filtros.data);
    if (filtros?.dataInicio) params.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) params.set("dataFim", filtros.dataFim);
    if (filtros?.dataConclusao) params.set("dataConclusao", filtros.dataConclusao);
    if (filtros?.pesquisa) params.set("pesquisa", filtros.pesquisa);
    const query = params.toString();
    return api<EntradaLivre[]>(`/api/entradas-livres${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api<EntradaLivre>(`/api/entradas-livres/${id}`),

  criar: (data: CriarEntradaLivreDTO) =>
    api<EntradaLivre>("/api/entradas-livres", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  concluir: (id: string, custoExcesso?: number) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}/concluir`, {
      method: "PATCH",
      body: JSON.stringify(custoExcesso !== undefined ? { custoExcesso } : {}),
    }),

  cancelar: (id: string) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}/cancelar`, { method: "PATCH" }),

  atualizarPagamento: (id: string, data: { pagoExcesso?: boolean; pagamentos?: CriarPagamentoDTO[] | null }) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}/pagamento`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  atualizar: (id: string, data: AtualizarEntradaLivreDTO) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  eliminar: (id: string) =>
    api<{ message: string }>(`/api/entradas-livres/${id}`, { method: "DELETE" }),

  getContadores: () =>
    api<{ ativas: number; concluidasHoje: number; totalHoje: number }>("/api/entradas-livres/contadores"),
};