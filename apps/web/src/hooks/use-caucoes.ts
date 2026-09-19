"use client";

import { useQuery } from "@tanstack/react-query";
import { caucoesApi, type CaucoesFiltros } from "@/lib/api/caucoes";

/** Lista consolidada de cauções (pagas / por pagar) - página /caucoes. */
export function useCaucoes(filtros?: CaucoesFiltros) {
  return useQuery({
    queryKey: ["caucoes", filtros],
    queryFn: () => caucoesApi.list(filtros),
  });
}
