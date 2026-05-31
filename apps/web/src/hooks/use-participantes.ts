"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { participantesApi, type AdicionarParticipantePayload, type ParticipanteAPI } from "@/lib/api/participantes";

export function useParticipantes(reservaId: string | undefined) {
  return useQuery({
    queryKey: ["participantes", reservaId],
    queryFn: () => participantesApi.listar(reservaId!),
    enabled: !!reservaId,
  });
}

export function useAdicionarParticipante(reservaId: string) {
  const qc = useQueryClient();
  const queryKey = ["participantes", reservaId];

  return useMutation({
    mutationFn: (payload: AdicionarParticipantePayload) =>
      participantesApi.adicionar(reservaId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useConfirmarPresenca(reservaId: string) {
  const qc = useQueryClient();
  const queryKey = ["participantes", reservaId];

  return useMutation({
    mutationFn: ({ participanteId, presenca }: { participanteId: string; presenca: boolean }) =>
      participantesApi.confirmarPresenca(participanteId, presenca),
    // Optimistic update: atualiza a cache imediatamente sem refetch
    onMutate: async ({ participanteId, presenca }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ParticipanteAPI[]>(queryKey);

      if (previous) {
        qc.setQueryData<ParticipanteAPI[]>(
          queryKey,
          previous.map((p) =>
            p.id === participanteId ? { ...p, presente: presenca } : p
          )
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      // Refetch silencioso para garantir consistência (sem invalidar — o optimistic já dá UX imediata)
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useMarcarTodosPresenca(reservaId: string) {
  const qc = useQueryClient();
  const queryKey = ["participantes", reservaId];

  return useMutation({
    mutationFn: (presenca: boolean) =>
      participantesApi.marcarTodos(reservaId, presenca),
    // Optimistic update
    onMutate: async (presenca) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ParticipanteAPI[]>(queryKey);

      if (previous) {
        qc.setQueryData<ParticipanteAPI[]>(
          queryKey,
          previous.map((p) => ({ ...p, presente: presenca }))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      // Substituir cache com dados reais do servidor
      if (data?.data) {
        qc.setQueryData(queryKey, data.data);
      }
    },
  });
}

export function useRemoverParticipante(reservaId: string) {
  const qc = useQueryClient();
  const queryKey = ["participantes", reservaId];

  return useMutation({
    mutationFn: (participanteId: string) => participantesApi.remover(participanteId),
    // Optimistic update: remove da lista imediatamente
    onMutate: async (participanteId) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ParticipanteAPI[]>(queryKey);

      if (previous) {
        qc.setQueryData<ParticipanteAPI[]>(
          queryKey,
          previous.filter((p) => p.id !== participanteId)
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}