"use client";

import { useQuery } from "@tanstack/react-query";
import { fechoCaixaApi } from "@/lib/api/fecho-caixa";

/** Fecho de caixa de um dia (AAAA-MM-DD). */
export function useFechoCaixa(data: string) {
  return useQuery({
    queryKey: ["fecho-caixa", data],
    queryFn: () => fechoCaixaApi.get(data),
    enabled: !!data,
  });
}
