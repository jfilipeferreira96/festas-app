import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarUtilizadores, criarUtilizador, atualizarFuncao, atualizarActivo, eliminarUtilizador } from "@/lib/api/utilizadores";
import type { FuncaoUtilizador } from "@saas/shared-types";

interface CreateUtilizadorData {
  name: string;
  email: string;
  password: string;
  funcao: FuncaoUtilizador;
}

export function useUtilizadores() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["utilizadores"],
    queryFn: listarUtilizadores,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUtilizadorData) => criarUtilizador(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilizadores"] });
    },
  });

  const updateFuncaoMutation = useMutation({
    mutationFn: ({ id, funcao }: { id: string; funcao: FuncaoUtilizador }) =>
      atualizarFuncao(id, { funcao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilizadores"] });
    },
  });

  const updateActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      atualizarActivo(id, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilizadores"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eliminarUtilizador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilizadores"] });
    },
  });

  return {
    utilizadores: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createUtilizador: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    updateFuncao: updateFuncaoMutation.mutateAsync,
    isUpdatingFuncao: updateFuncaoMutation.isPending,
    updateFuncaoError: updateFuncaoMutation.error,
    updateActivo: updateActivoMutation.mutateAsync,
    isUpdatingActivo: updateActivoMutation.isPending,
    updateActivoError: updateActivoMutation.error,
    deleteUtilizador: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}