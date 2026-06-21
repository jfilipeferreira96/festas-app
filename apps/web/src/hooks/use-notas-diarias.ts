"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notasDiariasApi } from "@/lib/api/notasDiarias";

export function useNotaDiaria(data: string) {
  return useQuery({
    queryKey: ["nota-diaria", data],
    queryFn: () => notasDiariasApi.getByData(data),
  });
}

export function useUpsertNotaDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { data: string; notasManha?: string; notasTarde?: string }) =>
      notasDiariasApi.upsert(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["nota-diaria", variables.data] });
    },
  });
}
