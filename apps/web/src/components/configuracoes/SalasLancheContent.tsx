"use client";

import React, { useState, useCallback } from "react";
import { UtensilsCrossed, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import {
  useSalasLancheAll,
  useCreateSalaLanche,
  useUpdateSalaLanche,
  useDeleteSalaLanche,
} from "@/hooks/use-salas-lanche";
import type { SalaLanche } from "@/lib/api/salasLanche";
import type { StatusType } from "@/components/ui";

// --- Zod Schema ---
const salaLancheSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  activo: z.boolean(),
});

type SalaLancheFormData = z.infer<typeof salaLancheSchema>;

// --- Table Columns ---
const columns: Column<SalaLanche>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, s) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent-orange-100 flex items-center justify-center">
          <UtensilsCrossed size={14} className="text-accent-orange-600" />
        </div>
        <span className="text-sm font-medium text-text-primary">{s.nome}</span>
      </div>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    sortable: true,
    render: (_value, s) => (
      <StatusBadge status={s.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
        {s.activo ? "Activo" : "Inactivo"}
      </StatusBadge>
    ),
  },
];

export default function SalasLancheContent() {
  const { data: salas, isLoading } = useSalasLancheAll();
  const createSala = useCreateSalaLanche();
  const updateSala = useUpdateSalaLanche();
  const deleteSala = useDeleteSalaLanche();

  const [showForm, setShowForm] = useState(false);
  const [editingSala, setEditingSala] = useState<SalaLanche | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SalaLancheFormData>({
    resolver: zodResolver(salaLancheSchema),
    defaultValues: {
      nome: "",
      activo: true,
    },
  });

  const activo = watch("activo");

  const handleCreate = useCallback(() => {
    setEditingSala(null);
    reset({ nome: "", activo: true });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (sala: SalaLanche) => {
      setEditingSala(sala);
      reset({
        nome: sala.nome,
        activo: sala.activo,
      });
      setShowForm(true);
    },
    [reset]
  );

  const handleDelete = useCallback(
    async (sala: SalaLanche) => {
      await deleteSala.mutateAsync(sala.id);
    },
    [deleteSala]
  );

  const onSubmit = useCallback(
    async (data: SalaLancheFormData) => {
      if (editingSala) {
        await updateSala.mutateAsync({
          id: editingSala.id,
          data: { nome: data.nome, activo: data.activo },
        });
      } else {
        await createSala.mutateAsync({
          nome: data.nome,
          activo: data.activo,
        });
      }
      setShowForm(false);
    },
    [editingSala, createSala, updateSala]
  );

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Salas de Lanche</h2>
          <p className="text-sm text-text-secondary">Espaços dedicados ao lanche das festas</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Nova Sala
        </Button>
      </div>

      <div>
        <DataTable<SalaLanche>
          data={salas || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar salas de lanche..."
          searchableFields={["nome"]}
          itemLabel="salas"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhuma sala de lanche encontrada",
            description: "Comece por criar a primeira sala de lanche.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Nova Sala
              </Button>
            ),
          }}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingSala ? "Editar Sala de Lanche" : "Nova Sala de Lanche"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Ex: Sala 1"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Estado</label>
                <Switch
                  checked={activo}
                  onChange={(checked: boolean) => setValue("activo", checked)}
                  label={activo ? "Activo" : "Inactivo"}
                />
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
