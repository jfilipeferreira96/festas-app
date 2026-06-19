import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { precosApi, type ConfiguracaoPreco } from "@/lib/api/precos";

export function useConfigPreco() {
  return useQuery({
    queryKey: ["configPreco"],
    queryFn: () => precosApi.getConfig(),
  });
}

export function useAtualizarConfigPreco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<ConfiguracaoPreco, "id" | "createdAt" | "updatedAt">>) =>
      precosApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configPreco"] });
    },
  });
}
