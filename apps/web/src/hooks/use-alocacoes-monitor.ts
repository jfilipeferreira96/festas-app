"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  alocacaoMonitorApi,
  type AlocacaoFiltros,
  type CriarAlocacaoData,
  type AtualizarAlocacaoData,
} from "@/lib/api/alocacaoMonitor";

const KEY = "alocacoes-monitor";

// ── Queries ───────────────────────────────────────

/** Alocações de um dia específico */
export function useAlocacoesByDate(data: string) {
  return useQuery({
    queryKey: [KEY, "dia", data],
    queryFn: () => alocacaoMonitorApi.list({ data }),
    enabled: !!data,
  });
}

/** Alocações por intervalo de datas (para o calendário) */
export function useAlocacoesByRange(dataInicio?: string, dataFim?: string) {
  return useQuery({
    queryKey: [KEY, "range", dataInicio, dataFim],
    queryFn: () => alocacaoMonitorApi.list({ dataInicio, dataFim }),
    enabled: !!dataInicio && !!dataFim,
  });
}

/** Alocações com filtros arbitrários */
export function useAlocacoes(filtros?: AlocacaoFiltros) {
  return useQuery({
    queryKey: [KEY, filtros],
    queryFn: () => alocacaoMonitorApi.list(filtros),
  });
}

export function useAlocacao(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => alocacaoMonitorApi.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────

export function useCreateAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarAlocacaoData) => alocacaoMonitorApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useUpdateAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarAlocacaoData }) =>
      alocacaoMonitorApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useDeleteAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alocacaoMonitorApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
}
