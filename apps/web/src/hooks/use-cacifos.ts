"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cacifosApi } from "@/lib/api/cacifos";
import type { EstadoCacifo } from "@saas/shared-types";

export function useCacifos(filtros?: { estado?: EstadoCacifo; reservaId?: string }) {
  return useQuery({
    queryKey: ["cacifos", filtros],
    queryFn: () => cacifosApi.list(filtros),
  });
}

export function useCacifo(id: string) {
  return useQuery({
    queryKey: ["cacifos", id],
    queryFn: () => cacifosApi.getById(id),
    enabled: !!id,
  });
}

export function useCacifosDisponiveis() {
  return useQuery({
    queryKey: ["cacifos", "disponiveis"],
    queryFn: cacifosApi.getDisponiveis,
  });
}

export function useCacifoContadores() {
  return useQuery({
    queryKey: ["cacifos", "contadores"],
    queryFn: cacifosApi.getContadores,
  });
}

export function useLibertar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cacifosApi.libertar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarcarOcupado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reservaId, notas, criancas }: { id: string; reservaId: string; notas?: string; criancas?: string }) =>
      cacifosApi.marcarOcupado(id, reservaId, { notas, criancas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useAtribuirCacifos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, cacifos }: { reservaId: string; cacifos: { id: string; notas?: string; criancas?: string }[] }) =>
      cacifosApi.atribuir(reservaId, cacifos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useActualizarCacifo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notas, criancas }: { id: string; notas?: string; criancas?: string }) =>
      cacifosApi.actualizar(id, { notas, criancas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
    },
  });
}

/** Cacifos esquecidos (OCUPADO/RESERVADO com reserva CONCLUIDA/CANCELADA). */
export function useCacifosEsquecidos() {
  return useQuery({
    queryKey: ["cacifos", "esquecidos"],
    queryFn: cacifosApi.getEsquecidos,
  });
}

/** Liberta vários cacifos em sequência (limpeza de esquecidos).
 *  Usa Promise.allSettled para que falhas parciais não descartem sucessos.
 *  Retorna { libertados, falhados } para feedback granular. */
export function useLibertarTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const resultados = await Promise.allSettled(
        ids.map((id) => cacifosApi.libertar(id))
      );
      const libertados = resultados.filter((r) => r.status === "fulfilled").length;
      const falhados = resultados.filter((r) => r.status === "rejected").length;
      return { libertados, falhados };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Adiciona um cacifo a uma reserva (usado no modal de cacifos). */
export function useAdicionarCacifoReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, cacifoId }: { reservaId: string; cacifoId?: string }) =>
      cacifosApi.adicionarAReserva(reservaId, cacifoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}
