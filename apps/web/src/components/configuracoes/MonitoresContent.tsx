"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UserCog, Plus, Clock, Calculator, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProfilePhotoUpload from "@/components/ui/ProfilePhotoUpload";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useMonitores, useCreateMonitor, useUpdateMonitor, useDeleteMonitor } from "@/hooks/use-monitores";
import { useCalcularHorasMonitor } from "@/hooks/use-alocacoes-monitor";
import type { Monitor } from "@/lib/api/monitores";
import type { StatusType } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { useUser } from "@/contexts/AuthContext";

const SERVER_URL = ""; // Single-app: API/uploads served same-origin via Next.js Route Handlers

// --- Zod Schema ---
const monitorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contacto: z.string().min(9, "Contacto inválido (mín. 9 dígitos)"),
  activo: z.boolean(),
  valorHora: z.number().min(0, "O valor por hora não pode ser negativo").optional().nullable(),
});

type MonitorFormData = z.infer<typeof monitorSchema>;

// --- Currency helper ---
const euro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export default function MonitoresContent() {
  const { data: monitores, isLoading } = useMonitores();
  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const deleteMonitor = useDeleteMonitor();

  // Apenas ADMINISTRADOR vê valor/hora e cálculo de horas trabalhadas
  const { user } = useUser();
  const isAdmin = user?.funcao === "ADMINISTRADOR";

  const [showForm, setShowForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; nome: string }>({ isOpen: false, id: "", nome: "" });

  // --- Horas trabalhadas modal state (admin only) ---
  const [horasModal, setHorasModal] = useState<{ isOpen: boolean; monitor: Monitor | null }>({ isOpen: false, monitor: null });
  const [horasInicio, setHorasInicio] = useState("");
  const [horasFim, setHorasFim] = useState("");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const horasData = useCalcularHorasMonitor(
    horasModal.monitor?.id ?? null,
    horasInicio || undefined,
    horasFim || undefined,
  );

  // Só busca quando o modal está aberto e há um trigger explícito
  const horasEnabled = horasModal.isOpen && fetchTrigger > 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MonitorFormData>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      nome: "",
      contacto: "",
      activo: true,
      valorHora: null,
    },
  });

  const activo = watch("activo");
  const nome = watch("nome");

  // --- Conditional table columns ---
  const columns: Column<Monitor>[] = useMemo(() => {
    const cols: Column<Monitor>[] = [
      {
        key: "nome",
        label: "Nome",
        sortable: true,
        render: (_value, m) => (
          <div className="flex items-center gap-2">
            {m.fotoUrl ? (
              <img
                src={m.fotoUrl}
                alt={m.nome}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <UserCog size={14} className="text-primary-500" />
              </div>
            )}
            <span className="text-sm font-medium text-text-primary">{m.nome}</span>
          </div>
        ),
      },
      {
        key: "contacto",
        label: "Contacto",
        sortable: true,
      },
    ];

    if (isAdmin) {
      cols.push({
        key: "valorHora",
        label: "Valor/Hora",
        sortable: true,
        render: (_value, m) => (
          <span className="text-sm text-text-secondary">
            {m.valorHora != null ? euro.format(Number(m.valorHora)) : "—"}
          </span>
        ),
      });
    }

    cols.push({
      key: "activo",
      label: "Estado",
      sortable: true,
      render: (_value, m) => (
        <StatusBadge status={m.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
          {m.activo ? "Activo" : "Inactivo"}
        </StatusBadge>
      ),
    });

    return cols;
  }, [isAdmin]);

  /** Upload a pending photo file after entity creation */
  const uploadPendingPhoto = useCallback(async (entityId: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    try {
      await fetch(`${SERVER_URL}/api/upload/monitor/${entityId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
    } catch {
      // Silently fail — photo is optional, entity was already created
    }
  }, []);

  const handleCreate = useCallback(() => {
    setEditingMonitor(null);
    setPendingPhotoFile(null);
    reset({ nome: "", contacto: "", activo: true, valorHora: null });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (monitor: Monitor) => {
      setEditingMonitor(monitor);
      setPendingPhotoFile(null);
      reset({
        nome: monitor.nome,
        contacto: monitor.contacto,
        activo: monitor.activo,
        valorHora: monitor.valorHora != null ? Number(monitor.valorHora) : null,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: MonitorFormData) => {
      if (editingMonitor) {
        await updateMonitor.mutateAsync({
          id: editingMonitor.id,
          data: {
            nome: data.nome,
            contacto: data.contacto,
            activo: data.activo,
            valorHora: isAdmin ? (data.valorHora ?? null) : null,
          },
        });
      } else {
        const newMonitor = await createMonitor.mutateAsync({
          nome: data.nome,
          contacto: data.contacto,
          activo: data.activo,
          valorHora: isAdmin ? (data.valorHora ?? null) : null,
        });

        // Upload pending photo if one was selected
        if (pendingPhotoFile && newMonitor?.id) {
          await uploadPendingPhoto(newMonitor.id, pendingPhotoFile);
        }
      }
      setShowForm(false);
      setPendingPhotoFile(null);
    },
    [editingMonitor, createMonitor, updateMonitor, pendingPhotoFile, uploadPendingPhoto, isAdmin]
  );

  const handleDelete = useCallback(
    (monitor: Monitor) => {
      setDeleteModal({ isOpen: true, id: monitor.id, nome: monitor.nome });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    await deleteMonitor.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "", nome: "" });
  }, [deleteMonitor, deleteModal.id]);

  // --- Horas trabalhadas handlers ---
  const handleOpenHoras = useCallback((monitor: Monitor) => {
    setFetchTrigger(0);
    setHorasInicio("");
    setHorasFim("");
    setHorasModal({ isOpen: true, monitor });
  }, []);

  const handleCalcularHoras = useCallback(() => {
    setFetchTrigger((n) => n + 1);
    // Força refetch invalidando e re-ativando
    horasData.refetch();
  }, [horasData]);

  const closeHorasModal = useCallback(() => {
    setHorasModal({ isOpen: false, monitor: null });
    setFetchTrigger(0);
  }, []);

  // Resultado só é válido quando enabled e fetched
  const horasResultado = horasEnabled ? horasData.data : undefined;

  return (
    <div>
      <PageHeader
        title="Monitores"
        subtitle="Gestão de monitores e alocação"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Monitor
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<Monitor>
          data={monitores || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar monitores..."
          searchableFields={["nome", "contacto"]}
          itemLabel="monitores"
          pagination
          pageSize={10}
          onEdit={isAdmin ? undefined : handleEdit}
          onDelete={handleDelete}
          {...(isAdmin
            ? {
                renderActions: (m: Monitor) => (
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip content="Horas trabalhadas" position="top" theme="dark">
                      <button
                        onClick={() => handleOpenHoras(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                      >
                        <Clock size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Editar" position="top" theme="dark">
                      <button
                        onClick={() => handleEdit(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Eliminar" position="top" theme="dark">
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Tooltip>
                  </div>
                ),
              }
            : {})}
          emptyState={{
            title: "Nenhum monitor encontrado",
            description: "Comece por criar o primeiro monitor.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Monitor
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
        title="Eliminar Monitor"
        message={`Tem a certeza que deseja eliminar o monitor "${deleteModal.nome}"? Esta acção não pode ser revertida.`}
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteMonitor.isPending}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-6">
              {editingMonitor ? "Editar Monitor" : "Novo Monitor"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Profile Photo Section */}
              <div>
                <h4 className="mb-4 text-sm font-medium text-text-primary">
                  {editingMonitor ? "Alterar Foto de Perfil" : "Foto de Perfil"}
                </h4>
                <div className="mb-4 flex max-w-sm items-center gap-5">
                  {editingMonitor ? (
                    <ProfilePhotoUpload
                      currentPhotoUrl={editingMonitor.fotoUrl}
                      name={nome}
                      uploadEndpoint={`/api/upload/monitor/${editingMonitor.id}`}
                      size={80}
                      onUploadSuccess={(imageUrl) => {
                        setEditingMonitor({ ...editingMonitor, fotoUrl: imageUrl });
                      }}
                    />
                  ) : (
                    <ProfilePhotoUpload
                      name={nome}
                      size={80}
                      onFileSelect={(file) => setPendingPhotoFile(file)}
                      pendingFile={pendingPhotoFile}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Nome do monitor"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Contacto</label>
                <InputField
                  type="tel"
                  {...register("contacto")}
                  placeholder="912 345 678"
                  error={!!errors.contacto}
                  hint={errors.contacto?.message}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Valor/Hora (€)</label>
                  <InputField
                    type="number"
                    step={0.01}
                    min="0"
                    {...register("valorHora", {
                      setValueAs: (v) => {
                        if (v === "" || v === null || v === undefined) return null;
                        const n = parseFloat(v);
                        return isNaN(n) ? null : n;
                      },
                    })}
                    placeholder="0,00"
                    error={!!errors.valorHora}
                    hint={errors.valorHora?.message}
                  />
                </div>
              )}
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

      {/* Horas Trabalhadas Modal (admin only) */}
      {isAdmin && horasModal.isOpen && horasModal.monitor && (
        <Modal isOpen={horasModal.isOpen} onClose={closeHorasModal} size="md">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-primary-500" />
              <h2 className="text-lg font-semibold text-text-primary">Horas Trabalhadas</h2>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Monitor: <span className="font-medium text-text-primary">{horasModal.monitor.nome}</span>
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Data Início</label>
                <InputField
                  type="date"
                  value={horasInicio}
                  onChange={(e) => setHorasInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Data Fim</label>
                <InputField
                  type="date"
                  value={horasFim}
                  onChange={(e) => setHorasFim(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={handleCalcularHoras} className="flex items-center gap-2">
                <Calculator size={16} />
                Calcular
              </Button>
            </div>

            {horasData.isFetching && (
              <div className="py-8 text-center text-sm text-text-secondary">A calcular...</div>
            )}

            {horasResultado && !horasData.isFetching && (
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Alocações no período</span>
                  <span className="font-medium text-text-primary">{horasResultado.alocacoes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Total de horas</span>
                  <span className="font-medium text-text-primary">
                    {horasResultado.totalHoras.toFixed(1)} h
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Valor/Hora</span>
                  <span className="font-medium text-text-primary">
                    {horasResultado.valorHora > 0 ? euro.format(horasResultado.valorHora) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-2">
                  <span className="text-text-primary">Custo Total</span>
                  <span className="text-primary-500">{euro.format(horasResultado.valorTotal)}</span>
                </div>
              </div>
            )}

            {!horasResultado && !horasData.isFetching && fetchTrigger === 0 && (
              <div className="py-6 text-center text-sm text-text-muted">
                Seleccione um intervalo de datas e clique em &ldquo;Calcular&rdquo;.
              </div>
            )}

            {horasData.isError && !horasData.isFetching && (
              <div className="py-4 text-center text-sm text-accent-red">
                Erro ao calcular horas. Verifique as permissões.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
