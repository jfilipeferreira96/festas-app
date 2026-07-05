"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  excecoesCalendarioApi,
  type CreateExcecaoInput,
  type UpdateExcecaoInput,
} from "@/lib/api/excecoesCalendario";

export function useExcecoesCalendario() {
  return useQuery({
    queryKey: ["excecoes-calendario"],
    queryFn: excecoesCalendarioApi.list,
  });
}

export function useCreateExcecaoCalendario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExcecaoInput) => excecoesCalendarioApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excecoes-calendario"] });
    },
  });
}

export function useUpdateExcecaoCalendario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExcecaoInput }) =>
      excecoesCalendarioApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excecoes-calendario"] });
    },
  });
}

export function useDeleteExcecaoCalendario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excecoesCalendarioApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excecoes-calendario"] });
    },
  });
}

export function useImportarFeriados() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ano: number) => excecoesCalendarioApi.importarFeriados(ano),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excecoes-calendario"] });
    },
  });
}
