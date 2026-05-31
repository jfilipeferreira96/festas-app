import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { monitoresApi } from "@/lib/api/monitores";

export function useMonitores() {
  return useQuery({
    queryKey: ["monitores"],
    queryFn: () => monitoresApi.list(),
  });
}

export function useMonitor(id: string) {
  return useQuery({
    queryKey: ["monitores", id],
    queryFn: () => monitoresApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: monitoresApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
    },
  });
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof monitoresApi.update>[1] }) =>
      monitoresApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: monitoresApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitores"] });
    },
  });
}
