"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservasApi } from "@/lib/api/reservas";
import type { CreateReservaData, UpdateReservaData, EstadoReserva, DisponibilidadeResult } from "@/lib/api/reservas";

export function useReservas(filtros?: { estado?: EstadoReserva; data?: string; dataInicio?: string; dataFim?: string; localId?: string; page?: number; pageSize?: number }) {
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
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
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
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
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
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
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
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
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
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
    },
  });
}

export function useFinalizarReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, custoExcesso }: { id: string; custoExcesso?: number }) =>
      reservasApi.finalizar(id, custoExcesso),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["slots-horario", "dia"] });
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

/** Actualiza o estado dos cacifos ao nível da festa (Chamar/Concluído). */
export function useActualizarEstadoCacifos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; chamado?: boolean; concluido?: boolean }) =>
      reservasApi.actualizarEstadoCacifos(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useReservasConcluidas(data?: string) {
  return useQuery({
    queryKey: ["reservas", "concluidas", data],
    queryFn: () => reservasApi.getConcluidas(data),
  });
}

/**
 * Verifica a disponibilidade de uma sala (sobreposição temporal).
 * Só executa quando data, horário, duração e sala estão preenchidos.
 * Aviso apenas — não bloqueia a submissão.
 */
export function useCheckDisponibilidade(params: {
  data?: string;
  horario?: string;
  duracaoMinutos?: number;
  localId?: string;
  excludeId?: string;
}) {
  const enabled = !!(params.data && params.horario && params.duracaoMinutos && params.localId);
  return useQuery<DisponibilidadeResult>({
    queryKey: ["reservas", "disponibilidade", params],
    queryFn: () =>
      reservasApi.checkDisponibilidade({
        data: params.data!,
        horario: params.horario!,
        duracaoMinutos: params.duracaoMinutos!,
        localId: params.localId!,
        excludeId: params.excludeId,
      }),
    enabled,
  });
}
