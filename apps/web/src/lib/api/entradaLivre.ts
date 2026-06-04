import { api } from "./utils";

export interface Crianca {
  nome: string;
  idade?: number;
}

export interface EntradaLivreExtraItem {
  id: string;
  entradaLivreId: string;
  extraId: string;
  quantidade: number;
  textoPersonalizado?: string;
  extra: { id: string; nome: string; precoUnitario: number };
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
  localId: string;
  local?: { id: string; nome: string };
  estado: "ATIVA" | "CONCLUIDA" | "CANCELADA";
  metodoPagamento?: string;
  pago: boolean;
  pagoExcesso: boolean;
  cacifoId?: string;
  cacifo?: { id: string; numero: number; nome?: string };
  observacoes?: string;
  observacoesLesoes?: string;
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
  localId: string;
  metodoPagamento?: string;
  pago?: boolean;
  cacifoId?: string;
  extrasIds?: string[];
  observacoes?: string;
  observacoesLesoes?: string;
}

export interface AtualizarEntradaLivreDTO {
  criancas?: Crianca[];
  encarregadoNome?: string;
  encarregadoTelefone?: string;
  encarregadoEmail?: string;
  duracaoMinutos?: number;
  metodoPagamento?: string;
  pago?: boolean;
  cacifoId?: string | null;
  extrasIds?: string[];
  observacoes?: string;
  observacoesLesoes?: string;
}

export interface ConfiguracaoEntradaLivre {
  id: string;
  precoHora: number;
  precoHoraExcesso: number;
  localId: string;
  local?: { id: string; nome: string };
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export const entradaLivreApi = {
  list: (filtros?: { estado?: string; localId?: string; data?: string; dataInicio?: string; dataFim?: string; dataConclusao?: string; pesquisa?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.set("estado", filtros.estado);
    if (filtros?.localId) params.set("localId", filtros.localId);
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

  concluir: (id: string) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}/concluir`, { method: "PATCH" }),

  cancelar: (id: string) =>
    api<EntradaLivre>(`/api/entradas-livres/${id}/cancelar`, { method: "PATCH" }),

  atualizarPagamento: (id: string, data: { pago?: boolean; pagoExcesso?: boolean; metodoPagamento?: string }) =>
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

  // Configuração
  listarConfiguracoes: () =>
    api<ConfiguracaoEntradaLivre[]>("/api/entradas-livres/configuracao"),

  getConfiguracao: (localId: string) =>
    api<ConfiguracaoEntradaLivre>(`/api/entradas-livres/configuracao/local/${localId}`),

  upsertConfiguracao: (data: { localId: string; precoHora: number; precoHoraExcesso: number; activo?: boolean }) =>
    api<ConfiguracaoEntradaLivre>("/api/entradas-livres/configuracao", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};