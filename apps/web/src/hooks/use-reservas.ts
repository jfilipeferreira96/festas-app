"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservasApi } from "@/lib/api/reservas";
import type { CreateReservaData, UpdateReservaData, EstadoReserva } from "@/lib/api/reservas";

export function useReservas(filtros?: { estado?: EstadoReserva; data?: string; localId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["reservas", filtros],
    queryFn: () => reservasApi.list(filtros),
  });
}

export function useReserva(id: string) {
  return useQuery({
    queryKey: ["reservas", id],
    queryFn: () => reservasApi.getById(id),
    enabled: !!id,
  });
}

export function useReservasAtivas() {
  return useQuery({
    queryKey: ["reservas", "ativas"],
    queryFn: reservasApi.getAtivas,
    refetchInterval: 30000, // Refresh every 30s for real-time
  });
}

export function useCreateReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReservaData) => reservasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReservaData }) =>
      reservasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateReservaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoReserva }) =>
      reservasApi.updateStatus(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Runtime actions (previously in use-festas)
export function useIniciarReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservasApi.iniciar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useFinalizarReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservasApi.finalizar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAlocarMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, monitorId }: { id: string; monitorId: string }) =>
      reservasApi.alocarMonitor(id, monitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useRemoverMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, monitorId }: { id: string; monitorId: string }) =>
      reservasApi.removerMonitor(id, monitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useToggleEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapaId }: { id: string; etapaId: string }) =>
      reservasApi.toggleEtapa(id, etapaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRemoverEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapaId }: { id: string; etapaId: string }) =>
      reservasApi.removerEtapa(id, etapaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarcarEtapasConcluidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservasApi.marcarEtapasConcluidas(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReservasConcluidas(data?: string) {
  return useQuery({
    queryKey: ["reservas", "concluidas", data],
    queryFn: () => reservasApi.getConcluidas(data),
  });
}
