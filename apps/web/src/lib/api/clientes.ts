import { api } from "./utils";

export interface Cliente {
  id: string;
  nome: string;
  contribuinte: string | null;
  email: string | null;
  telefone: string;
  codigoPostal: string | null;
  observacao: string | null;
  optOut: boolean;
  createdAt: string;
  updatedAt: string;
  aniversariantes?: Array<{
    id: string;
    nome: string;
    dataNascimento: string;
    clienteId: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreateClienteData {
  nome: string;
  contribuinte?: string;
  email: string;
  telefone: string;
  codigoPostal?: string;
  observacao?: string;
  aniversariantes?: Array<{
    nome: string;
    dataNascimento: string;
  }>;
}

export interface UpdateClienteData {
  nome?: string;
  contribuinte?: string;
  email?: string;
  telefone?: string;
  codigoPostal?: string;
  observacao?: string;
  optOut?: boolean;
}

export interface ClienteListResponse {
  items: Cliente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const clientesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return api<ClienteListResponse>(`/api/clientes${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string) => api<Cliente>(`/api/clientes/${id}`),
  create: (data: CreateClienteData) =>
    api<Cliente>("/api/clientes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateClienteData) =>
    api<Cliente>(`/api/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ message: string }>(`/api/clientes/${id}`, {
      method: "DELETE",
    }),
  search: (query: string) => api<Cliente[]>(`/api/clientes/search?q=${encodeURIComponent(query)}`),
};