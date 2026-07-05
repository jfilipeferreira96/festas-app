import { api } from "./utils";

export interface SegmentoNewsletter {
  id: string;
  nome: string;
  descricao?: string;
  _count?: { contactos: number };
  createdAt: string;
}

export interface SincronizarResult {
  criados: number;
  actualizados: number;
  total: number;
}

export const newsletterApi = {
  listSegmentos: () => api<SegmentoNewsletter[]>("/api/newsletter"),
  sincronizarAniversariantes: () =>
    api<{ message: string; data: SincronizarResult }>("/api/newsletter", {
      method: "POST",
    }),
};
