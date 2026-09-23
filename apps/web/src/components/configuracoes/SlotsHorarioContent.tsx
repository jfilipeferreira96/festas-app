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
import { Select } from "@/components/ui/select";
import { FestaColorPicker, FestaColorDot } from "@/components/ui/FestaColorPicker";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useSlotsHorario, useCreateSlotHorario, useUpdateSlotHorario, useDeleteSlotHorario } from "@/hooks/use-slots-horario";
import { useSalasLanche } from "@/hooks/use-salas-lanche";
import type { SlotHorario } from "@saas/shared-types";
import type { StatusType } from "@/components/ui";

// --- Zod Schema ---
const APLICABILIDADES = ["TODOS", "FDS", "SEMANA"] as const;
type Aplicabilidade = (typeof APLICABILIDADES)[number];

const slotSchema = z
  .object({
    horaInicio: z.string().min(1, "Hora de entrada é obrigatória").regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    horaFim: z.string().min(1, "Hora de saída é obrigatória").regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
    activo: z.boolean(),
    aplicabilidade: z.enum(APLICABILIDADES),
    corDefault: z.string().nullable().optional(),
    horaLancheDefault: z.string().nullable().optional(),
    salaLancheId: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      const [hi, mi] = data.horaInicio.split(":").map(Number);
      const [hf, mf] = data.horaFim.split(":").map(Number);
      return hf * 60 + mf > hi * 60 + mi;
    },
    { message: "A hora de saída tem de ser depois da hora de entrada", path: ["horaFim"] },
  );

type SlotFormData = z.infer<typeof slotSchema>;

/** fimDeSemana (null/true/false) ↔ enum do form. */
function aplicabilidadeDeSlot(fimDeSemana: boolean | null | undefined): Aplicabilidade {
  if (fimDeSemana === true) return "FDS";
  if (fimDeSemana === false) return "SEMANA";
  return "TODOS";
}

const APLICABILIDADE_OPTIONS: { value: Aplicabilidade; label: string }[] = [
  { value: "TODOS", label: "Todos os dias" },
  { value: "FDS", label: "Só fim-de-semana e feriados" },
  { value: "SEMANA", label: "Só dias de semana" },
];

function aplicabilidadeBadge(fimDeSemana: boolean | null | undefined): { label: string; className: string } {
  if (fimDeSemana === true) return { label: "Fim-de-semana", className: "bg-accent-purple-100 text-accent-purple-600" };
  if (fimDeSemana === false) return { label: "Semana", className: "bg-brand-50 text-brand-600" };
  return { label: "Todos os dias", className: "bg-gray-100 text-text-secondary" };
}

function formatDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Soma minutos a uma hora no formato "HH:MM" e devolve "HH:MM". */
function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Diferença em minutos entre duas horas "HH:MM". */
function timeDiffMin(horaInicio: string, horaFim: string): number {
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFim.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

export default function SlotsHorarioContent() {
  const { data: slots, isLoading } = useSlotsHorario();
  const { data: salasLanche } = useSalasLanche();
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
     horaFim: "17:15",
     activo: true,
     aplicabilidade: "TODOS",
     corDefault: null,
     horaLancheDefault: null,
     salaLancheId: null,
   },
  });

  const watchedActivo = watch("activo");
  const watchedCor = watch("corDefault");
  const watchedSalaLancheId = watch("salaLancheId");
  const watchedHoraLanche = watch("horaLancheDefault");
  const watchedHoraInicio = watch("horaInicio");
  const watchedHoraFim = watch("horaFim");

  // Opções de salas de lanche para o Select
  const salaLancheOptions = useMemo(
    () => [
      { value: "", label: "Sem sala predefinida" },
      ...(salasLanche ?? []).map((s) => ({ value: s.id, label: s.nome })),
    ],
    [salasLanche]
  );


  // Ordenar por Aplicação (Todos os dias → Semana → Fim-de-semana) e, dentro de cada grupo, por hora
  const APLICACAO_ORDEM: Record<Aplicabilidade, number> = { TODOS: 0, SEMANA: 1, FDS: 2 };
  const sortedSlots = useMemo(
    () =>
      [...(slots ?? [])].sort((a, b) => {
        const appA = APLICACAO_ORDEM[aplicabilidadeDeSlot(a.fimDeSemana)];
        const appB = APLICACAO_ORDEM[aplicabilidadeDeSlot(b.fimDeSemana)];
        if (appA !== appB) return appA - appB;
        return a.horaInicio.localeCompare(b.horaInicio);
      }),
    [slots]
  );

  const columns: Column<SlotHorario>[] = useMemo(
    () => [
      // NOTA: a coluna de índice "#" já é desenhada pelo DataTable; não repetir aqui.
      {
        key: "horaInicio",
        label: "Horário",
        sortable: true,
        render: (_value, s) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-teal-100 flex items-center justify-center">
              <Clock size={14} className="text-accent-teal-600" />
            </div>
            <span className="text-sm font-medium text-text-primary">
              {s.horaInicio}–{addMinutosToTime(s.horaInicio, s.duracaoMin)}
            </span>
            <span className="text-xs text-text-muted">({formatDuracao(s.duracaoMin)})</span>
          </div>
        ),
      },
      {
        key: "corDefault",
        label: "Cor por defeito",
        sortable: false,
        render: (_value, s) => (
          <div className="flex items-center gap-2">
            {s.corDefault ? (
              <FestaColorDot color={s.corDefault} className="w-5 h-5" />
            ) : (
              <span className="text-sm text-text-muted">-</span>
            )}
          </div>
        ),
      },
      {
        key: "horaLancheDefault",
        label: "Hora Lanche",
        sortable: false,
        render: (_value, s) => (
          <span className="text-sm text-text-secondary">
            {s.horaLancheDefault ?? "-"}
          </span>
        ),
      },
      {
        key: "salaLancheId",
        label: "Sala do Lanche",
        sortable: false,
        render: (_value, s) => (
          <span className="text-sm text-text-secondary">
            {s.salaLancheNome ?? "-"}
          </span>
        ),
      },
      {
        key: "fimDeSemana",
        label: "Aplicação",
        sortable: false,
        render: (_value, s) => {
          const b = aplicabilidadeBadge(s.fimDeSemana);
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${b.className}`}>
              {b.label}
            </span>
          );
        },
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
    reset({
      horaInicio: "15:00",
      horaFim: "17:15",
      activo: true,
      aplicabilidade: "TODOS",
      corDefault: null,
      horaLancheDefault: null,
      salaLancheId: null,
    });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (slot: SlotHorario) => {
      setEditingSlot(slot);
      reset({
        horaInicio: slot.horaInicio,
        horaFim: addMinutosToTime(slot.horaInicio, slot.duracaoMin),
        activo: slot.activo,
        aplicabilidade: aplicabilidadeDeSlot(slot.fimDeSemana),
        corDefault: slot.corDefault ?? null,
        horaLancheDefault: slot.horaLancheDefault ?? null,
        salaLancheId: slot.salaLancheId ?? null,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: SlotFormData) => {
      // duracaoMin é derivado da diferença entre hora de saída e entrada
      const duracaoMin = timeDiffMin(data.horaInicio, data.horaFim);
      const { horaFim: _horaFim, aplicabilidade: _aplicabilidade, ...rest } = data;
      void _horaFim;
      const fimDeSemana = _aplicabilidade === "FDS" ? true : _aplicabilidade === "SEMANA" ? false : null;
      const payload = {
        ...rest,
        duracaoMin,
        fimDeSemana,
        corDefault: data.corDefault || undefined,
        horaLancheDefault: data.horaLancheDefault || undefined,
        salaLancheId: data.salaLancheId || undefined,
      };
      if (editingSlot) {
        await updateSlot.mutateAsync({ id: editingSlot.id, data: payload });
      } else {
        await createSlot.mutateAsync(payload);
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
        subtitle="Horários predefinidos para festas com valores por defeito"
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
          pagination={false}
          searchable
          searchPlaceholder="Pesquisar slots..."
          searchableFields={["horaInicio"]}
          itemLabel="slots"
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
                <label className="block text-sm font-medium text-text-primary mb-1.5">Hora de Entrada</label>
                <InputField
                  type="time"
                  {...register("horaInicio")}
                  error={!!errors.horaInicio}
                  hint={errors.horaInicio?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Hora de Saída</label>
                <InputField
                  type="time"
                  {...register("horaFim")}
                  error={!!errors.horaFim}
                  hint={errors.horaFim?.message}
                />
                {watchedHoraInicio && watchedHoraFim && timeDiffMin(watchedHoraInicio, watchedHoraFim) > 0 && (
                  <p className="text-xs text-text-muted mt-1">
                    Duração: <span className="font-medium text-text-secondary">{formatDuracao(timeDiffMin(watchedHoraInicio, watchedHoraFim))}</span>
                  </p>
                )}
              </div>
              {/* ── Aplicabilidade por tipo de dia ── */}
              <div className="mb-1">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Aplicação
                </label>
                <Select
                  options={APLICABILIDADE_OPTIONS}
                  value={watch("aplicabilidade")}
                  onChange={(val) => setValue("aplicabilidade", (val as Aplicabilidade) || "TODOS")}
                />
                <p className="text-xs text-text-muted mt-1">
                  Grelha de semana (6 festas/dia) e de fim-de-semana (15 festas/dia)
                  aplicam-se automaticamente consoante a data da festa.
                </p>
              </div>

              {/* ── Defaults que auto-preenchem o formulário da festa ── */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-semibold text-text-primary mb-3">
                  Valores por defeito (auto-preenchem a festa)
                </p>

                {/* Cor por defeito */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Cor por defeito
                  </label>
                  <div className="flex items-center gap-3">
                    <FestaColorPicker
                      value={watchedCor}
                      onChange={(color) => setValue("corDefault", color)}
                    />
                    {watchedCor && (
                      <button
                        type="button"
                        onClick={() => setValue("corDefault", null)}
                        className="text-xs text-accent-red-500 hover:text-accent-red-600 underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Hora do lanche por defeito */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Hora do lanche por defeito (opcional)
                  </label>
                  <InputField
                    type="time"
                    value={watchedHoraLanche ?? ""}
                    onChange={(e) => setValue("horaLancheDefault", e.target.value || null)}
                    placeholder="Ex: 16:30"
                  />
                </div>

                {/* Sala de lanche por defeito */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Sala do lanche por defeito (opcional)
                  </label>
                  <Select
                    options={salaLancheOptions}
                    value={watchedSalaLancheId ?? ""}
                    onChange={(val) => setValue("salaLancheId", val || null)}
                    placeholder="Selecione uma sala..."
                  />
                </div>
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
