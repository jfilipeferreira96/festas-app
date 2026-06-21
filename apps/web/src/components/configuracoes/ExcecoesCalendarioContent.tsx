"use client";

import React, { useState, useCallback, useMemo } from "react";
import { CalendarX, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import InputField from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Switch from "@/components/form/switch/Switch";
import { Select } from "@/components/ui/select";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useExcecoesCalendario, useCreateExcecaoCalendario, useUpdateExcecaoCalendario, useDeleteExcecaoCalendario } from "@/hooks/use-excecoes-calendario";
import type { ExcecaoCalendario } from "@saas/shared-types";
import type { TipoExcecaoCalendario } from "@saas/shared-types";
import type { StatusType } from "@/components/ui";

// --- Zod Schema ---
const excecaoSchema = z.object({
  data: z.string().min(1, "Data é obrigatória"),
  tipo: z.enum(["FERIADO", "BLOQUEADO"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  afectaPreco: z.boolean(),
  bloqueiaReserva: z.boolean(),
  recorrenciaAnual: z.boolean(),
});

type ExcecaoFormData = z.infer<typeof excecaoSchema>;

const tipoOptions = [
  { value: "FERIADO", label: "Feriado" },
  { value: "BLOQUEADO", label: "Dia Bloqueado" },
];

function formatDate(data: string): string {
  try {
    return format(parseISO(data), "d 'de' MMMM 'de' yyyy", { locale: pt });
  } catch {
    return data;
  }
}

export default function ExcecoesCalendarioContent() {
  const { data: excecoes, isLoading } = useExcecoesCalendario();
  const createExcecao = useCreateExcecaoCalendario();
  const updateExcecao = useUpdateExcecaoCalendario();
  const deleteExcecao = useDeleteExcecaoCalendario();

  const [showForm, setShowForm] = useState(false);
  const [editingExcecao, setEditingExcecao] = useState<ExcecaoCalendario | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; nome: string }>({ isOpen: false, id: "", nome: "" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExcecaoFormData>({
    resolver: zodResolver(excecaoSchema),
    defaultValues: {
      data: "",
      tipo: "FERIADO",
      nome: "",
      afectaPreco: false,
      bloqueiaReserva: false,
      recorrenciaAnual: false,
    },
  });

  const watchedData = watch("data");
  const watchedTipo = watch("tipo");
  const watchedAfectaPreco = watch("afectaPreco");
  const watchedBloqueiaReserva = watch("bloqueiaReserva");
  const watchedRecorrenciaAnual = watch("recorrenciaAnual");

  // Ordenar por data ascendente
  const sortedExcecoes = useMemo(
    () => [...(excecoes ?? [])].sort((a, b) => a.data.localeCompare(b.data)),
    [excecoes]
  );

  const columns: Column<ExcecaoCalendario>[] = useMemo(
    () => [
      {
        key: "data",
        label: "Data",
        sortable: true,
        render: (value) => (
          <span className="text-sm font-medium text-text-primary">{formatDate(value as string)}</span>
        ),
      },
      {
        key: "nome",
        label: "Nome",
        sortable: true,
        render: (_value, e) => (
          <span className="text-sm text-text-secondary">{e.nome}</span>
        ),
      },
      {
        key: "tipo",
        label: "Tipo",
        sortable: true,
        render: (_value, e) => (
          <StatusBadge status={(e.tipo === "FERIADO" ? "FERIADO" : "BLOQUEADO") as StatusType}>
            {e.tipo === "FERIADO" ? "Feriado" : "Bloqueado"}
          </StatusBadge>
        ),
      },
      {
        key: "flags",
        label: "Efeitos",
        sortable: false,
        render: (_value, e) => (
          <div className="flex flex-wrap gap-1">
            {e.afectaPreco && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-100 text-warning-700">Tarifa Fim-Semana</span>
            )}
            {e.bloqueiaReserva && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-error-100 text-error-700">Sem Reservas</span>
            )}
            {e.recorrenciaAnual && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-violet-100 text-accent-violet-700">Anual</span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const handleCreate = useCallback(() => {
    setEditingExcecao(null);
    reset({ data: "", tipo: "FERIADO", nome: "", afectaPreco: false, bloqueiaReserva: false, recorrenciaAnual: false });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (excecao: ExcecaoCalendario) => {
      setEditingExcecao(excecao);
      reset({
        data: excecao.data,
        tipo: excecao.tipo,
        nome: excecao.nome,
        afectaPreco: excecao.afectaPreco,
        bloqueiaReserva: excecao.bloqueiaReserva,
        recorrenciaAnual: excecao.recorrenciaAnual,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: ExcecaoFormData) => {
      if (editingExcecao) {
        await updateExcecao.mutateAsync({ id: editingExcecao.id, data });
      } else {
        await createExcecao.mutateAsync(data);
      }
      setShowForm(false);
    },
    [editingExcecao, createExcecao, updateExcecao]
  );

  const handleDelete = useCallback(
    (excecao: ExcecaoCalendario) => {
      setDeleteModal({ isOpen: true, id: excecao.id, nome: excecao.nome });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    await deleteExcecao.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "", nome: "" });
  }, [deleteExcecao, deleteModal.id]);

  // DatePicker (flatpickr) callback — converte Date selecionado para yyyy-MM-dd
  const onDataDateChange = useCallback(
    (selectedDates: Date[]) => {
      const d = selectedDates?.[0];
      if (d) setValue("data", format(d, "yyyy-MM-dd"), { shouldValidate: true });
    },
    [setValue]
  );

  return (
    <div>
      <PageHeader
        title="Exceções de Calendário"
        subtitle="Feriados e dias bloqueados"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Nova Exceção
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<ExcecaoCalendario>
          data={sortedExcecoes}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar exceções..."
          searchableFields={["nome", "data"]}
          itemLabel="exceções"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhuma exceção encontrada",
            description: "Comece por adicionar feriados ou dias bloqueados.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Nova Exceção
              </Button>
            ),
          }}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", nome: "" })}
        onConfirm={confirmDelete}
        title="Eliminar Exceção"
        message={`Tem a certeza que deseja eliminar a exceção "${deleteModal.nome}"? Esta acção não pode ser revertida.`}
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteExcecao.isPending}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingExcecao ? "Editar Exceção" : "Nova Exceção"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <DatePicker
                  id="excecao-data"
                  label="Data"
                  defaultDate={watchedData || undefined}
                  onChange={onDataDateChange}
                />
                {errors.data && (
                  <p className="mt-1.5 text-xs text-error-500">{errors.data.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Ex: Natal, Encerramento..."
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Tipo</label>
                <Select
                  options={tipoOptions}
                  value={watchedTipo}
                  onChange={(value) => setValue("tipo", value as TipoExcecaoCalendario)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Tarifa fim-de-semana</label>
                <Switch
                  checked={watchedAfectaPreco}
                  onChange={(checked: boolean) => setValue("afectaPreco", checked)}
                  label={watchedAfectaPreco ? "Sim" : "Não"}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Bloquear reservas</label>
                <Switch
                  checked={watchedBloqueiaReserva}
                  onChange={(checked: boolean) => setValue("bloqueiaReserva", checked)}
                  label={watchedBloqueiaReserva ? "Sim" : "Não"}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Recorrência anual</label>
                <Switch
                  checked={watchedRecorrenciaAnual}
                  onChange={(checked: boolean) => setValue("recorrenciaAnual", checked)}
                  label={watchedRecorrenciaAnual ? "Sim" : "Não"}
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

