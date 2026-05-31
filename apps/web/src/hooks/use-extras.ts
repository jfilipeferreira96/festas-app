"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extrasApi } from "@/lib/api/extras";
import type { CreateExtraInput, UpdateExtraInput } from "@/lib/api/extras";

export function useExtras() {
  return useQuery({
    queryKey: ["extras"],
    queryFn: extrasApi.list,
  });
}

export function useExtra(id: string) {
  return useQuery({
    queryKey: ["extras", id],
    queryFn: () => extrasApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExtraInput) => extrasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
    },
  });
}

export function useUpdateExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExtraInput }) =>
      extrasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
    },
  });
}

export function useDeleteExtra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => extrasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
    },
  });
}
