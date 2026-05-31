import { api } from "./utils";

export interface ConfigCacifoAPI {
  id: string;
  totalCacifos: number;
  cacifos: { id: string; numero: number; nome: string | null; estado: string }[];
}

export interface AtualizarConfigPayload {
  totalCacifos: number;
  nomes?: Record<number, string>;
}

export const configCacifoApi = {
  getConfig: () =>
    api<{ data: ConfigCacifoAPI }>("/api/configuracao-cacifos"),

  atualizarConfig: (payload: AtualizarConfigPayload) =>
    api<{ data: ConfigCacifoAPI; message: string }>(`/api/configuracao-cacifos`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
