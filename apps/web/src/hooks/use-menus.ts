import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menusApi } from "@/lib/api/menus";

export function useMenuByReserva(reservaId: string) {
  return useQuery({
    queryKey: ["menus", "reserva", reservaId],
    queryFn: () => menusApi.getByReservaId(reservaId),
    enabled: !!reservaId,
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menusApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, data }: { reservaId: string; data: Parameters<typeof menusApi.update>[1] }) =>
      menusApi.update(reservaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
  });
}

