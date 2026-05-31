import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientesApi } from "@/lib/api/clientes";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: () => clientesApi.list(),
  });
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: ["clientes", id],
    queryFn: () => clientesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof clientesApi.update>[1] }) =>
      clientesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useSearchClientes(query: string) {
  return useQuery({
    queryKey: ["clientes", "search", query],
    queryFn: () => clientesApi.search(query),
    enabled: query.length > 0,
  });
}
