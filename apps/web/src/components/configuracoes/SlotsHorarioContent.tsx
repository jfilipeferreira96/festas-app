"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Clock, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useSlotsHorario, useCreateSlotHorario, useUpdateSlotHorario, useDeleteSlotHorario } from "@/hooks/use-slots-horario";
import type { SlotHorario } from "@saas/shared-types";
import type { StatusType } from "@/components/ui";

// --- Zod Schema ---
const slotSchema = z.object({
  horaInicio: z.string().min(1, "Hora é obrigatória").regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  duracaoMin: z.number().min(15, "Mínimo 15 min").max(480, "Máximo 480 min"),
  activo: z.boolean(),
  ordem: z.number().min(0).max(100),
});

type SlotFormData = z.infer<typeof slotSchema>;

function formatDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function SlotsHorarioContent() {
  const { data: slots, isLoading } = useSlotsHorario();
  const createSlot = useCreateSlotHorario();
  const updateSlot = useUpdateSlotHorario();
  const deleteSlot = useDeleteSlotHorario();

  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotHorario | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; horaInicio: string }>({ isOpen: false, id: "", horaInicio: "" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlotFormData>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      horaInicio: "15:00",
      duracaoMin: 135,
      activo: true,
      ordem: 0,
    },
  });

  const watchedActivo = watch("activo");

  // Ordenar por ordem (campo explícito)
  const sortedSlots = useMemo(
    () => [...(slots ?? [])].sort((a, b) => a.ordem - b.ordem),
    [slots]
  );

  const columns: Column<SlotHorario>[] = useMemo(
    () => [
      // NOTA: a coluna de índice "#" já é desenhada pelo DataTable; não repetir aqui.
      {
        key: "horaInicio",
        label: "Hora de Início",
        sortable: true,
        render: (_value, s) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-teal-100 flex items-center justify-center">
              <Clock size={14} className="text-accent-teal-600" />
            </div>
            <span className="text-sm font-medium text-text-primary">{s.horaInicio}</span>
          </div>
        ),
      },
      {
        key: "duracaoMin",
        label: "Duração",
        sortable: true,
        render: (_value, s) => (
          <span className="text-sm text-text-secondary">{formatDuracao(s.duracaoMin)}</span>
        ),
      },
      {
        key: "activo",
        label: "Estado",
        sortable: true,
        render: (_value, s) => (
          <StatusBadge status={(s.activo ? "ACTIVO" : "INACTIVO") as StatusType}>
            {s.activo ? "Activo" : "Inactivo"}
          </StatusBadge>
        ),
      },
    ],
    []
  );

  const handleCreate = useCallback(() => {
    setEditingSlot(null);
    const nextOrdem = (slots?.length ?? 0);
    reset({ horaInicio: "15:00", duracaoMin: 135, activo: true, ordem: nextOrdem });
    setShowForm(true);
  }, [reset, slots]);

  const handleEdit = useCallback(
    (slot: SlotHorario) => {
      setEditingSlot(slot);
      reset({
        horaInicio: slot.horaInicio,
        duracaoMin: slot.duracaoMin,
        activo: slot.activo,
        ordem: slot.ordem,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: SlotFormData) => {
      if (editingSlot) {
        await updateSlot.mutateAsync({ id: editingSlot.id, data });
      } else {
        await createSlot.mutateAsync(data);
      }
      setShowForm(false);
    },
    [editingSlot, createSlot, updateSlot]
  );

  const handleDelete = useCallback(
    (slot: SlotHorario) => {
      setDeleteModal({ isOpen: true, id: slot.id, horaInicio: slot.horaInicio });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    await deleteSlot.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "", horaInicio: "" });
  }, [deleteSlot, deleteModal.id]);

  return (
    <div>
      <PageHeader
        title="Slots de Horário"
        subtitle="Horários predefinidos para festas"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Slot
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<SlotHorario>
          data={sortedSlots}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar slots..."
          searchableFields={["horaInicio"]}
          itemLabel="slots"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhum slot encontrado",
            description: "Comece por adicionar horários para as festas.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Slot
              </Button>
            ),
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", horaInicio: "" })}
        onConfirm={confirmDelete}
        title="Eliminar Slot"
        message={`Tem a certeza que deseja eliminar o slot das ${deleteModal.horaInicio}? Esta acção não pode ser revertida.`}
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteSlot.isPending}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingSlot ? "Editar Slot" : "Novo Slot"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Hora de Início (HH:MM)</label>
                <InputField
                  type="time"
                  {...register("horaInicio")}
                  error={!!errors.horaInicio}
                  hint={errors.horaInicio?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Duração (minutos)</label>
                <InputField
                  type="number"
                  {...register("duracaoMin", { valueAsNumber: true })}
                  min={15}
                  max={480}
                  error={!!errors.duracaoMin}
                  hint={errors.duracaoMin?.message}
                />
                <p className="text-xs text-text-muted mt-1">2h15m = 135 min (predefinido)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Ordem de apresentação</label>
                <InputField
                  type="number"
                  {...register("ordem", { valueAsNumber: true })}
                  min={0}
                  max={100}
                  error={!!errors.ordem}
                  hint={errors.ordem?.message}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Activo</label>
                <Switch
                  checked={watchedActivo}
                  onChange={(checked: boolean) => setValue("activo", checked)}
                  label={watchedActivo ? "Activo" : "Inactivo"}
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
