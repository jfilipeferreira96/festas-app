import { api } from "./utils";

export interface ConfiguracaoPreco {
  id: string;
  precoFestaSemana: number;
  precoFestaFimSemana: number;
  precoEntradaHoraSemana: number;
  precoEntradaHoraFimSemana: number;
  createdAt: string;
  updatedAt: string;
}

export const precosApi = {
  async getConfig(): Promise<ConfiguracaoPreco> {
    return api<ConfiguracaoPreco>("/api/configuracoes/precos");
  },

  async updateConfig(data: Partial<Omit<ConfiguracaoPreco, "id" | "createdAt" | "updatedAt">>): Promise<ConfiguracaoPreco> {
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
