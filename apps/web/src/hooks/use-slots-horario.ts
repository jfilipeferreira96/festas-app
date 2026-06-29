"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  slotsHorarioApi,
  type CreateSlotInput,
  type UpdateSlotInput,
} from "@/lib/api/slotsHorario";

export function useSlotsHorario() {
  return useQuery({
    queryKey: ["slots-horario"],
    queryFn: slotsHorarioApi.list,
  });
}

export function useSlotsHorarioAll() {
  return useQuery({
    queryKey: ["slots-horario", "all"],
    queryFn: slotsHorarioApi.listAll,
  });
}

export function useSlotsDia(data: string) {
  return useQuery({
    queryKey: ["slots-horario", "dia", data],
    queryFn: () => slotsHorarioApi.getDia(data),
    enabled: !!data,
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useCreateSlotHorario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSlotInput) => slotsHorarioApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots-horario"] });
    },
  });
}

export function useUpdateSlotHorario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSlotInput }) =>
      slotsHorarioApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots-horario"] });
    },
  });
}

export function useDeleteSlotHorario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => slotsHorarioApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots-horario"] });
    },
  });
}
