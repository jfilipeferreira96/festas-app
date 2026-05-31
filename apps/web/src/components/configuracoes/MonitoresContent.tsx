"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UserCog, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProfilePhotoUpload from "@/components/ui/ProfilePhotoUpload";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import MultiSelect from "@/components/form/MultiSelect";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useMonitores, useCreateMonitor, useUpdateMonitor, useDeleteMonitor } from "@/hooks/use-monitores";
import { useLocais } from "@/hooks/use-locais";
import type { Monitor } from "@/lib/api/monitores";
import type { StatusType } from "@/components/ui";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5555";

// --- Zod Schema ---
const monitorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contacto: z.string().min(9, "Contacto inválido (mín. 9 dígitos)"),
  activo: z.boolean(),
  locaisIds: z.array(z.string()),
});

type MonitorFormData = z.infer<typeof monitorSchema>;

// --- Table Columns ---
const columns: Column<Monitor>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, m) => (
      <div className="flex items-center gap-2">
        {m.fotoUrl ? (
          <img
            src={`${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5555"}${m.fotoUrl}`}
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
  {
    key: "locais",
    label: "Salas",
    render: (_value, m) => (
      <span className="text-xs text-text-muted">
        {m.locais.map((l) => l.local.nome).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    sortable: true,
    render: (_value, m) => (
      <StatusBadge status={m.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
        {m.activo ? "Activo" : "Inactivo"}
      </StatusBadge>
    ),
  },
];

export default function MonitoresContent() {
  const { data: monitores, isLoading } = useMonitores();
  const { data: locais } = useLocais();
  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const deleteMonitor = useDeleteMonitor();

  const [showForm, setShowForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; nome: string }>({ isOpen: false, id: "", nome: "" });

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
      locaisIds: [],
    },
  });

  const activo = watch("activo");
  const locaisIds = watch("locaisIds");
  const nome = watch("nome");

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
    reset({ nome: "", contacto: "", activo: true, locaisIds: [] });
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
        locaisIds: monitor.locais.map((l) => l.local.id),
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
          data: { nome: data.nome, contacto: data.contacto, activo: data.activo, locaisIds: data.locaisIds },
        });
      } else {
        const newMonitor = await createMonitor.mutateAsync({
          nome: data.nome,
          contacto: data.contacto,
          activo: data.activo,
          locaisIds: data.locaisIds,
        });

        // Upload pending photo if one was selected
        if (pendingPhotoFile && newMonitor?.id) {
          await uploadPendingPhoto(newMonitor.id, pendingPhotoFile);
        }
      }
      setShowForm(false);
      setPendingPhotoFile(null);
    },
    [editingMonitor, createMonitor, updateMonitor, pendingPhotoFile, uploadPendingPhoto]
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

  const locaisOptions = useMemo(
    () =>
      (locais || []).map((local) => ({
        value: local.id,
        text: local.nome,
        selected: locaisIds.includes(local.id),
      })),
    [locais, locaisIds]
  );

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
          onEdit={handleEdit}
          onDelete={handleDelete}
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
              <div>
                <MultiSelect
                  label="Salas"
                  options={locaisOptions}
                  defaultSelected={locaisIds}
                  onChange={(selected: string[]) => setValue("locaisIds", selected)}
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
