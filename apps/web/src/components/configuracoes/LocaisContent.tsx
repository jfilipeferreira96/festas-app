"use client";

import React, { useState, useCallback } from "react";
import { MapPin, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useLocais, useCreateLocal, useUpdateLocal, useDeleteLocal } from "@/hooks/use-locais";
import type { Local } from "@/lib/api/locais";
import type { StatusType } from "@/components/ui";

// --- Zod Schema ---
const localSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  capacidade: z.number().min(1, "Mínimo 1").max(500, "Máximo 500"),
  activo: z.boolean(),
});

type LocalFormData = z.infer<typeof localSchema>;

// --- Table Columns ---
const columns: Column<Local>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, l) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent-teal-100 flex items-center justify-center">
          <MapPin size={14} className="text-accent-teal-600" />
        </div>
        <span className="text-sm font-medium text-text-primary">{l.nome}</span>
      </div>
    ),
  },
  {
    key: "capacidade",
    label: "Capacidade",
    sortable: true,
    render: (value) => (
      <span className="text-sm text-text-secondary">{value} crianças</span>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    sortable: true,
    render: (_value, l) => (
      <StatusBadge status={l.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
        {l.activo ? "Activo" : "Inactivo"}
      </StatusBadge>
    ),
  },
];

export default function LocaisContent() {
  const { data: locais, isLoading } = useLocais();
  const createLocal = useCreateLocal();
  const updateLocal = useUpdateLocal();
  const deleteLocal = useDeleteLocal();

  const [showForm, setShowForm] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocalFormData>({
    resolver: zodResolver(localSchema),
    defaultValues: {
      nome: "",
      capacidade: 20,
      activo: true,
    },
  });

  const activo = watch("activo");

  const handleCreate = useCallback(() => {
    setEditingLocal(null);
    reset({ nome: "", capacidade: 20, activo: true });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (local: Local) => {
      setEditingLocal(local);
      reset({
        nome: local.nome,
        capacidade: local.capacidade,
        activo: local.activo,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: LocalFormData) => {
      if (editingLocal) {
        await updateLocal.mutateAsync({
          id: editingLocal.id,
          data: { nome: data.nome, capacidade: data.capacidade, activo: data.activo },
        });
      } else {
        await createLocal.mutateAsync({
          nome: data.nome,
          capacidade: data.capacidade,
          activo: data.activo,
        });
      }
      setShowForm(false);
    },
    [editingLocal, createLocal, updateLocal]
  );

  return (
    <div>
      <PageHeader
        title="Locais"
        subtitle="Gestão de salas e espaços"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Local
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<Local>
          data={locais || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar locais..."
          searchableFields={["nome"]}
          itemLabel="locais"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          emptyState={{
            title: "Nenhum local encontrado",
            description: "Comece por criar o primeiro local.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Local
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
              {editingLocal ? "Editar Local" : "Novo Local"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Ex: Sala Azul"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Capacidade (crianças)</label>
                <InputField
                  type="number"
                  {...register("capacidade", { valueAsNumber: true })}
                  min={1}
                  max={500}
                  error={!!errors.capacidade}
                  hint={errors.capacidade?.message}
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