"use client";

import React, { useState, useCallback } from "react";
import { ListChecks, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import {
  useEtapasFesta,
  useCreateEtapaFesta,
  useUpdateEtapaFesta,
  useDeleteEtapaFesta,
} from "@/hooks/use-etapasFesta";
import type { EtapaFesta } from "@/lib/api/etapasFesta";
import type { StatusType } from "@/components/ui";

/** Dynamically render a lucide icon by name */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LucideIcon({ name, size = 14, className = "", fallback: Fallback }: { name?: string | null; size?: number; className?: string; fallback?: React.FC<{ size?: number; className?: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = name ? (LucideIcons as any)[name] as React.FC<{ size?: number; className?: string }> | undefined : undefined;
  if (IconComponent) return <IconComponent size={size} className={className} />;
  if (Fallback) return <Fallback size={size} className={className} />;
  return <ListChecks size={size} className={className} />;
}

// --- Zod Schema ---
const etapaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0, "A ordem deve ser positiva"),
  icone: z.string().optional(),
});

type EtapaFormData = z.infer<typeof etapaSchema>;

// --- Table Columns ---
const columns: Column<EtapaFesta>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, e) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
          <LucideIcon name={e.icone} className="text-brand-600" />
        </div>
        <div>
          <span className="text-sm font-medium text-text-primary">{e.nome}</span>
          {e.descricao && (
            <p className="text-xs text-text-muted truncate max-w-[200px]">{e.descricao}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "ordem",
    label: "Ordem",
    sortable: true,
    render: (value) => (
      <span className="text-sm font-medium text-text-primary w-8 text-center">{value as number}</span>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    sortable: true,
    render: (_value, e) => (
      <StatusBadge status={e.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
        {e.activo ? "Activo" : "Inactivo"}
      </StatusBadge>
    ),
  },
];

export default function EtapasFestaContent() {
  const { data: etapas, isLoading } = useEtapasFesta();
  const createEtapa = useCreateEtapaFesta();
  const updateEtapa = useUpdateEtapaFesta();
  const deleteEtapa = useDeleteEtapaFesta();

  const [showForm, setShowForm] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<EtapaFesta | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EtapaFormData>({
    resolver: zodResolver(etapaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      ordem: 0,
      icone: "",
    },
  });

  const handleCreate = useCallback(() => {
    setEditingEtapa(null);
    const nextOrdem = (etapas || []).length + 1;
    reset({ nome: "", descricao: "", ordem: nextOrdem, icone: "" });
    setShowForm(true);
  }, [reset, etapas]);

  const handleEdit = useCallback(
    (etapa: EtapaFesta) => {
      setEditingEtapa(etapa);
      reset({
        nome: etapa.nome,
        descricao: etapa.descricao || "",
        ordem: etapa.ordem,
        icone: etapa.icone || "",
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: EtapaFormData) => {
      if (editingEtapa) {
        await updateEtapa.mutateAsync({
          id: editingEtapa.id,
          data: {
            nome: data.nome,
            descricao: data.descricao,
            ordem: data.ordem,
            icone: data.icone,
          },
        });
      } else {
        await createEtapa.mutateAsync({
          nome: data.nome,
          descricao: data.descricao,
          ordem: data.ordem,
          icone: data.icone,
        });
      }
      setShowForm(false);
    },
    [editingEtapa, createEtapa, updateEtapa]
  );

  const handleDelete = useCallback(
    async (etapa: EtapaFesta) => {
      await deleteEtapa.mutateAsync(etapa.id);
    },
    [deleteEtapa]
  );

  const handleToggleActive = useCallback(
    async (etapa: EtapaFesta) => {
      await updateEtapa.mutateAsync({
        id: etapa.id,
        data: { activo: !etapa.activo },
      });
    },
    [updateEtapa]
  );

  return (
    <div>
      <PageHeader
        title="Etapas de Festa"
        subtitle="Configure as etapas do checklist de cada festa (ex: Lanche Servido, Bolo, Parabéns)"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Nova Etapa
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<EtapaFesta>
          data={etapas || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar etapas..."
          searchableFields={["nome"]}
          itemLabel="etapas"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhuma etapa encontrada",
            description:
              "Comece por criar etapas para o checklist das festas (ex: Lanche Servido, Bolo Servido, Parabéns Cantados).",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Nova Etapa
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
              {editingEtapa ? "Editar Etapa" : "Nova Etapa"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Ex: Lanche Servido, Bolo, Parabéns Cantados"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Descrição</label>
                <InputField
                  {...register("descricao")}
                  placeholder="Descrição da etapa (opcional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Ordem</label>
                  <InputField
                    type="number"
                    min="0"
                    {...register("ordem", { valueAsNumber: true })}
                    placeholder="1"
                    error={!!errors.ordem}
                    hint={errors.ordem?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Ícone (Lucide)
                  </label>
                  <InputField
                    {...register("icone")}
                    placeholder="Ex: UtensilsCrossed, Cake, Music"
                  />
                </div>
              </div>
              <p className="text-xs text-text-muted">
                O campo "Ícone" deve conter o nome de um ícone do pacote lucide-react.
                Exemplos: UtensilsCrossed, Cake, Music, Gift, PartyPopper
              </p>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingEtapa(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "A guardar..." : editingEtapa ? "Guardar Alterações" : "Criar Etapa"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}