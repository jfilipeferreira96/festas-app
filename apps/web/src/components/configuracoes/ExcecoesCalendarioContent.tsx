"use client";

import React, { useState, useCallback, useMemo } from "react";
import { CalendarX, Plus, Download } from "lucide-react";
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
import { useExcecoesCalendario, useCreateExcecaoCalendario, useUpdateExcecaoCalendario, useDeleteExcecaoCalendario, useImportarFeriados } from "@/hooks/use-excecoes-calendario";
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
  const [importModal, setImportModal] = useState(false);
  const [importAno, setImportAno] = useState<number>(new Date().getFullYear());
  const [importResult, setImportResult] = useState<{ criados: number; ignorados: number; total: number } | null>(null);

  const importarFeriados = useImportarFeriados();

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

  const handleImportFeriados = useCallback(async () => {
    setImportResult(null);
    try {
      const result = await importarFeriados.mutateAsync(importAno);
      setImportResult(result.data);
    } catch {
      // erro tratado pelo mutation
    }
  }, [importarFeriados, importAno]);

  return (
    <div>
      <PageHeader
        title="Exceções de Calendário"
        subtitle="Feriados e dias bloqueados"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setImportResult(null); setImportModal(true); }} className="flex items-center gap-2">
              <Download size={16} />
              Importar Feriados
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus size={16} />
              Nova Exceção
            </Button>
          </div>
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

      {/* Import Feriados Modal */}
      {importModal && (
        <Modal isOpen={importModal} onClose={() => setImportModal(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Importar Feriados Nacionais
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Importa automaticamente os feriados nacionais de Portugal para o ano selecionado.
              Os feriados fixos são criados com recorrência anual.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Ano</label>
                <InputField
                  type="number"
                  value={importAno}
                  onChange={(e) => setImportAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  min="2000"
                  max="2100"
                />
              </div>

              {importResult && (
                <div className="rounded-lg bg-primary-50 border border-primary-200 p-4 text-sm">
                  <p className="font-medium text-primary-700 mb-1">Importação concluída</p>
                  <p className="text-text-secondary">
                    <strong className="text-primary-600">{importResult.criados}</strong> feriado(s) criado(s),
                    {" "}<strong>{importResult.ignorados}</strong> já existia(m) de um total de
                    {" "}<strong>{importResult.total}</strong>.
                  </p>
                </div>
              )}

              {importarFeriados.isError && (
                <p className="text-sm text-error-500">
                  Erro ao importar feriados. Verifique a ligação à internet e tente novamente.
                </p>
              )}

              <div className="flex items-center gap-3 lg:justify-end">
                <Button variant="outline" onClick={() => setImportModal(false)}>
                  {importResult ? "Fechar" : "Cancelar"}
                </Button>
                {!importResult && (
                  <Button onClick={handleImportFeriados} disabled={importarFeriados.isPending}>
                    {importarFeriados.isPending ? "A importar..." : "Importar"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

