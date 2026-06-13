"use client";

import { useQuery } from "@tanstack/react-query";
import { relatoriosApi } from "@/lib/api/relatorios";

export function useRelatorioFinanceiro(dataInicio: string | null, dataFim: string | null) {
  return useQuery({
    queryKey: ["relatorio", "financeiro", dataInicio, dataFim],
    queryFn: () => {
      if (!dataInicio || !dataFim) {
        throw new Error("Datas são obrigatórias");
      }
      return relatoriosApi.getRelatorioFinanceiro(dataInicio, dataFim);
    },
    enabled: Boolean(dataInicio && dataFim),
  });
}