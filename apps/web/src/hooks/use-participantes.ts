"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { participantesApi, type AdicionarParticipantePayload } from "@/lib/api/participantes";

export function useParticipantes(reservaId: string | undefined) {
  return useQuery({
    queryKey: ["participantes", reservaId],
    queryFn: () => participantesApi.listar(reservaId!),
    enabled: !!reservaId,
  });
}

export function useAdicionarParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, payload }: { reservaId: string; payload: AdicionarParticipantePayload }) =>
      participantesApi.adicionar(reservaId, payload),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["participantes", vars.reservaId] });
    },
  });
}

export function useConfirmarPresenca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participanteId, presenca }: { participanteId: string; presenca: boolean }) =>
      participantesApi.confirmarPresenca(participanteId, presenca),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantes"] });
    },
  });
}

export function useRemoverParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participanteId: string) => participantesApi.remover(participanteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantes"] });
    },
  });
}