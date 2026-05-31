import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configCacifoApi, type AtualizarConfigPayload } from "@/lib/api/configCacifo";

export function useConfigCacifo() {
  return useQuery({
    queryKey: ["configCacifo"],
    queryFn: () => configCacifoApi.getConfig(),
  });
}

export function useAtualizarConfigCacifo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AtualizarConfigPayload) =>
      configCacifoApi.atualizarConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configCacifo"] });
      queryClient.invalidateQueries({ queryKey: ["cacifos"] });
    },
  });
}
