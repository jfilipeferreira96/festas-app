import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campanhasApi } from "@/lib/api/campanhas";

export function useCampanhas() {
  return useQuery({
    queryKey: ["campanhas"],
    queryFn: () => campanhasApi.list(),
  });
}

export function useCampanha(id: string) {
  return useQuery({
    queryKey: ["campanhas", id],
    queryFn: () => campanhasApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campanhasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}

export function useEnviarCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campanhasApi.enviar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}

export function useDeleteCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campanhasApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}

export function useUpdateCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof campanhasApi.update>[1] }) =>
      campanhasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}

export function useMetricasCampanha(id: string) {
  return useQuery({
    queryKey: ["campanhas", id, "metricas"],
    queryFn: () => campanhasApi.metricas(id),
    enabled: !!id,
  });
}
