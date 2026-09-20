import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsletterApi, type SincronizarResult } from "@/lib/api/newsletter";

export function useSegmentosNewsletter() {
  return useQuery({
    queryKey: ["newsletter", "segmentos"],
    queryFn: newsletterApi.listSegmentos,
  });
}

export function useSincronizarAniversariantes() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; data: SincronizarResult }>({
    mutationFn: newsletterApi.sincronizarAniversariantes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter", "segmentos"] });
    },
  });
}
