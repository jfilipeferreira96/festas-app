import { api } from "./utils";

export interface MinimoConfig {
  aniversariantes: number;
  minimo: number;
}

export interface ConfiguracaoPreco {
  id: string;
  // Preço por criança
  precoCriancaSemana: number;
  precoCriancaFimSemana: number;
  // Preço de entrada livre (por hora)
  precoEntradaHoraSemana: number;
  precoEntradaHoraFimSemana: number;
  // Mínimos de crianças por nº de aniversariantes
  minimosCriancasPorAniversariante?: MinimoConfig[] | null;
  // Meias
  precoMeias: number;
  // Excesso
  precoExcessoFixo: number;
  // Durações
  duracaoDefaultFestaMin: number;
  duracaoExcessoBlocoMin: number;
  createdAt: string;
  updatedAt: string;
}

export const precosApi = {
  async getConfig(): Promise<ConfiguracaoPreco> {
    return api<ConfiguracaoPreco>("/api/configuracoes/precos");
  },

  async updateConfig(
    data: Partial<Omit<ConfiguracaoPreco, "id" | "createdAt" | "updatedAt">>
  ): Promise<ConfiguracaoPreco> {
    const res = await api<{ message: string; data: ConfiguracaoPreco }>(
      "/api/configuracoes/precos",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },
};
