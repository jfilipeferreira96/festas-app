"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ajustePagamentoApi, type CriarAjusteDTO } from "@/lib/api/ajustes-pagamento";

export function useAjustesPagamento(filtros: { reservaId?: string; entradaLivreId?: string }) {
  return useQuery({
    queryKey: ["ajustes-pagamento", filtros],
    queryFn: () => ajustePagamentoApi.list(filtros),
    enabled: !!filtros.reservaId || !!filtros.entradaLivreId,
  });
}

export function useCriarAjustePagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarAjusteDTO) => ajustePagamentoApi.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ajustes-pagamento"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useEliminarAjustePagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ajustePagamentoApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ajustes-pagamento"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["entradas-livres"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
