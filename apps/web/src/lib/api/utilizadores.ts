import type { Utilizador, FuncaoUtilizador } from "@saas/shared-types";

const API_URL = ""; // Single-app: API served same-origin via Next.js Route Handlers

interface CreateUtilizadorData {
  name: string;
  email: string;
  password: string;
  funcao: FuncaoUtilizador;
}

interface UpdateFuncaoData {
  funcao: FuncaoUtilizador;
}

interface UpdateActivoData {
  activo: boolean;
}

export async function listarUtilizadores(): Promise<Utilizador[]> {
  const response = await fetch(`${API_URL}/api/utilizadores`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao listar utilizadores");
  }

  return response.json();
}

export async function obterUtilizador(id: string): Promise<Utilizador> {
  const response = await fetch(`${API_URL}/api/utilizadores/${id}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao obter utilizador");
  }

  return response.json();
}

export async function criarUtilizador(data: CreateUtilizadorData): Promise<Utilizador> {
  const response = await fetch(`${API_URL}/api/utilizadores`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar utilizador");
  }

  return response.json();
}

export async function atualizarFuncao(id: string, data: UpdateFuncaoData): Promise<Utilizador> {
  const response = await fetch(`${API_URL}/api/utilizadores/${id}/funcao`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar função");
  }

  return response.json();
}

export async function atualizarActivo(id: string, data: UpdateActivoData): Promise<Utilizador> {
  const response = await fetch(`${API_URL}/api/utilizadores/${id}/activo`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar estado");
  }

  return response.json();
}

export async function eliminarUtilizador(id: string): Promise<{ message: string; utilizador: Utilizador }> {
  const response = await fetch(`${API_URL}/api/utilizadores/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao eliminar utilizador");
  }

  return response.json();
}