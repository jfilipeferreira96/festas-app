"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locaisApi } from "@/lib/api/locais";
import type { CreateLocalInput, UpdateLocalInput } from "@/lib/api/locais";

export function useLocais() {
  return useQuery({
    queryKey: ["locais"],
    queryFn: locaisApi.list,
  });
}

export function useLocaisAtivos() {
  return useQuery({
    queryKey: ["locais", "active"],
    queryFn: locaisApi.listActive,
  });
}

export function useCreateLocal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocalInput) => locaisApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais"] });
    },
  });
}

export function useUpdateLocal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocalInput }) =>
      locaisApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais"] });
    },
  });
}

export function useDeleteLocal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locaisApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais"] });
    },
  });
}
