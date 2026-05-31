"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { etapasFestaApi } from "@/lib/api/etapasFesta";
import type { CreateEtapaFestaInput, UpdateEtapaFestaInput } from "@/lib/api/etapasFesta";

export function useEtapasFesta() {
  return useQuery({
    queryKey: ["etapas-festa"],
    queryFn: etapasFestaApi.list,
  });
}

export function useEtapaFesta(id: string) {
  return useQuery({
    queryKey: ["etapas-festa", id],
    queryFn: () => etapasFestaApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEtapaFesta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEtapaFestaInput) => etapasFestaApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-festa"] });
    },
  });
}

export function useUpdateEtapaFesta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEtapaFestaInput }) =>
      etapasFestaApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-festa"] });
    },
  });
}

export function useDeleteEtapaFesta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => etapasFestaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-festa"] });
    },
  });
}