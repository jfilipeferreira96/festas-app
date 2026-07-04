"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  salasLancheApi,
  type CreateSalaLancheInput,
  type UpdateSalaLancheInput,
} from "@/lib/api/salasLanche";

export function useSalasLanche() {
  return useQuery({
    queryKey: ["salas-lanche"],
    queryFn: salasLancheApi.list,
  });
}

export function useSalasLancheAll() {
  return useQuery({
    queryKey: ["salas-lanche", "all"],
    queryFn: salasLancheApi.listAll,
  });
}

export function useCreateSalaLanche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalaLancheInput) => salasLancheApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas-lanche"] });
    },
  });
}

export function useUpdateSalaLanche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalaLancheInput }) =>
      salasLancheApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas-lanche"] });
    },
  });
}

export function useDeleteSalaLanche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salasLancheApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salas-lanche"] });
    },
  });
}
