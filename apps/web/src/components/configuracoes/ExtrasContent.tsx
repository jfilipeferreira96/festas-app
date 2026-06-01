"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Sparkles, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import { Select } from "@/components/ui/select";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useExtras, useCreateExtra, useUpdateExtra, useDeleteExtra } from "@/hooks/use-extras";
import type { Extra } from "@/lib/api/extras";
import type { StatusType } from "@/components/ui";

// --- Helpers ---
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

/** Dynamically render a lucide icon by name */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LucideIcon({ name, size = 14, className = "", fallback: Fallback }: { name?: string | null; size?: number; className?: string; fallback?: React.FC<{ size?: number; className?: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = name ? (LucideIcons as any)[name] as React.FC<{ size?: number; className?: string }> | undefined : undefined;
  if (IconComponent) return <IconComponent size={size} className={className} />;
  if (Fallback) return <Fallback size={size} className={className} />;
  return <Sparkles size={size} className={className} />;
}

// --- Zod Schema ---
const extraSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  precoUnitario: z.number().min(0, "O preço não pode ser negativo"),
  icone: z.string().optional(),
  categoria: z.string().optional(),
  subcategoria: z.string().optional(),
  requerTexto: z.boolean().optional(),
});

type ExtraFormData = z.infer<typeof extraSchema>;

// --- Category options ---
const CATEGORIA_OPTIONS = [
  { value: "EXTRA", label: "Extra" },
  { value: "MENU", label: "Menu" },
];

const SUBCATEGORIA_OPTIONS = [
  { value: "", label: "Sem subcategoria" },
  { value: "Diversão", label: "Diversão" },
  { value: "Premium", label: "Premium" },
];

// --- Table Columns ---
const columns: Column<Extra>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, e) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <LucideIcon name={e.icone} className="text-purple-600" />
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
    key: "precoUnitario",
    label: "Preço Unitário",
    sortable: true,
    render: (value) => (
      <span className="text-sm font-medium text-text-primary">{formatCurrency(value as number)}</span>
    ),
  },
  {
    key: "categoria",
    label: "Categoria",
    sortable: true,
    render: (value, e) => (
      <div className="flex flex-col gap-0.5">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full w-fit ${
          value === "MENU"
            ? "bg-amber-50 text-amber-700"
            : "bg-purple-50 text-purple-700"
        }`}>
          {value === "MENU" ? "Menu" : "Extra"}
        </span>
        {e.subcategoria && (
          <span className="text-xs text-text-muted">{e.subcategoria}</span>
        )}
      </div>
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

export default function ExtrasContent() {
  const { data: extras, isLoading } = useExtras();
  const createExtra = useCreateExtra();
  const updateExtra = useUpdateExtra();
  const deleteExtra = useDeleteExtra();

  const [showForm, setShowForm] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExtraFormData>({
    resolver: zodResolver(extraSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      precoUnitario: 0,
      icone: "",
      categoria: "EXTRA",
      subcategoria: "",
      requerTexto: false,
    },
  });

  const currentCategoria = watch("categoria");

  const handleCreate = useCallback(() => {
    setEditingExtra(null);
    reset({ nome: "", descricao: "", precoUnitario: 0, icone: "", categoria: "EXTRA", subcategoria: "", requerTexto: false });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (extra: Extra) => {
      setEditingExtra(extra);
      reset({
        nome: extra.nome,
        descricao: extra.descricao || "",
        precoUnitario: Number(extra.precoUnitario),
        icone: extra.icone || "",
        categoria: extra.categoria || "EXTRA",
        subcategoria: extra.subcategoria || "",
        requerTexto: extra.requerTexto || false,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: ExtraFormData) => {
      const payload = {
        nome: data.nome,
        descricao: data.descricao,
        precoUnitario: Number(data.precoUnitario),
        icone: data.icone,
        categoria: (data.categoria || "EXTRA") as "EXTRA" | "MENU",
        subcategoria: data.subcategoria || undefined,
        requerTexto: data.requerTexto || false,
      };
      if (editingExtra) {
        await updateExtra.mutateAsync({
          id: editingExtra.id,
          data: payload,
        });
      } else {
        await createExtra.mutateAsync(payload);
      }
      setShowForm(false);
    },
    [editingExtra, createExtra, updateExtra]
  );

  const handleDelete = useCallback(
    async (extra: Extra) => {
      await deleteExtra.mutateAsync(extra.id);
    },
    [deleteExtra]
  );

  return (
    <div>
      <PageHeader
        title="Extras"
        subtitle="Gestão de extras e items de menu disponíveis para reservas"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Extra
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<Extra>
          data={extras || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar extras..."
          searchableFields={["nome"]}
          itemLabel="extras"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhum extra encontrado",
            description: "Comece por criar o primeiro extra (ex: Turbo Slide, Laser Show, Máquina de Gelo).",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Extra
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
              {editingExtra ? "Editar Extra" : "Novo Extra"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Ex: Turbo Slide, Laser Show, Máquina de Gelo"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Descrição</label>
                <InputField
                  {...register("descricao")}
                  placeholder="Descrição do extra (opcional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Preço Unitário (€)</label>
                  <InputField
                    type="number"
                    step={0.01}
                    min="0"
                    {...register("precoUnitario", { valueAsNumber: true })}
                    placeholder="0,00"
                    error={!!errors.precoUnitario}
                    hint={errors.precoUnitario?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Categoria</label>
                  <Select
                    options={CATEGORIA_OPTIONS}
                    value={currentCategoria || "EXTRA"}
                    onChange={(val) => setValue("categoria", val, { shouldDirty: true })}
                    placeholder="Selecionar categoria"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Subcategoria</label>
                  <Select
                    options={SUBCATEGORIA_OPTIONS}
                    value={watch("subcategoria") || ""}
                    onChange={(val) => setValue("subcategoria", val, { shouldDirty: true })}
                    placeholder="Sem subcategoria"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("requerTexto")}
                      className="w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-primary">Requer texto personalizado</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Ícone (Lucide)
                </label>
                <InputField
                  {...register("icone")}
                  placeholder="Ex: Sparkles, Zap, Snowflake, Gift"
                />
              </div>
              <p className="text-xs text-text-muted">
                O campo "Ícone" deve conter o nome de um ícone do pacote lucide-react.
                Exemplos: Sparkles, Zap, Snowflake, Gift, Palette, Candy, Music, Star
              </p>
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