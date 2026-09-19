import { api } from "./utils";

/** Item da vista consolidada de cauções (GET /api/caucoes). */
export interface CaucaoItem {
  id: string;
  data: string;
  horario: string;
  estado: string;
  caucao: string;
  valorCaucao: number | null;
  metodoCaucao: string | null;
  valorTotal: number | null;
  pago: boolean;
  cliente: { id: string; nome: string; telefone: string };
  local: { id: string; nome: string } | null;
  aniversariantes: { aniversariante: { id: string; nome: string } }[];
}

export interface CaucoesFiltros {
  estadoCaucao?: string;
  dataInicio?: string;
  dataFim?: string;
  pesquisa?: string;
}

export const caucoesApi = {
  list: (filtros?: CaucoesFiltros) => {
    const params = new URLSearchParams();
    if (filtros?.estadoCaucao) params.set("estadoCaucao", filtros.estadoCaucao);
    if (filtros?.dataInicio) params.set("dataInicio", filtros.dataInicio);
    if (filtros?.dataFim) params.set("dataFim", filtros.dataFim);
    if (filtros?.pesquisa) params.set("pesquisa", filtros.pesquisa);
    const query = params.toString();
    return api<CaucaoItem[]>(`/api/caucoes${query ? `?${query}` : ""}`);
  },
};
