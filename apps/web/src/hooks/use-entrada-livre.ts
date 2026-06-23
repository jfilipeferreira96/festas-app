"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entradaLivreApi, type CriarEntradaLivreDTO } from "@/lib/api/entradaLivre";

// ── Queries ───────────────────────────────────────

export function useEntradasLivres(
  filtros?: { estado?: string; localId?: string; data?: string; dataInicio?: string; dataFim?: string; dataConclusao?: string; pesquisa?: string },
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: ["entradas-livres", filtros],
    queryFn: () => entradaLivreApi.list(filtros),
    ...options,
  });
}

export function useEntradaLivre(id: string) {
  return useQuery({
    queryKey: ["entradas-livres", id],
    queryFn: () => entradaLivreApi.getById(id),
    enabled: !!id,
  });
}

export function useEntradasLivresContadores() {
  return useQuery({
    queryKey: ["entradas-livres", "contadores"],
    queryFn: () => entradaLivreApi.getContadores(),
    refetchInterval: 30000,
  });
}

export function useEntradasLivresAtivas() {
  return useQuery({
    queryKey: ["entradas-livres", "ativas"],
    queryFn: () => entradaLivreApi.list({ estado: "ATIVA" }),
    refetchInterval: 30000,
  });
}

export function useEntradasLivresConcluidasHoje() {
  const hoje = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["entradas-livres", "concluidas", hoje],
    queryFn: () => entradaLivreApi.list({ estado: "CONCLUIDA", dataConclusao: hoje }),
  });
}

// ── Mutations ─────────────────────────────────────

export function useCriarEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarEntradaLivreDTO) => entradaLivreApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}

export function useConcluirEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, custoExcesso }: { id: string; custoExcesso?: number }) =>
      entradaLivreApi.concluir(id, custoExcesso),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}

export function useCancelarEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entradaLivreApi.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}

export function useAtualizarPagamentoEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { pago?: boolean; pagoExcesso?: boolean; metodoPagamento?: string } }) =>
      entradaLivreApi.atualizarPagamento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}

export function useEliminarEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entradaLivreApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}

export function useAtualizarEntradaLivre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: import("@/lib/api/entradaLivre").AtualizarEntradaLivreDTO }) =>
      entradaLivreApi.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
    },
  });
}