"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { festasAcabarApi } from "@/lib/api/festasAcabar";

export function useFestasAcabar() {
  return useQuery({
    queryKey: ["festas-acabar"],
    queryFn: () => festasAcabarApi.getAll(),
  });
}

export function useAtualizarFestaAcabar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservaId,
      data,
    }: {
      reservaId: string;
      data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string };
    }) => festasAcabarApi.atualizar(reservaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festas-acabar"] });
    },
  });
}
