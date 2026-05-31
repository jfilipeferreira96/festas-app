"use client";

import React, { useState, useCallback } from "react";
import { Plus, Mail, Phone, Cake, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from "@/hooks/use-clientes";
import type { Cliente } from "@/lib/api/clientes";

// --- Zod Schema ---
const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contribuinte: z.string().optional(),
  email: z.string().email("Email inválido").or(z.literal("")),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  codigoPostal: z.string().optional(),
  observacao: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

// --- Aniversariante sub-form ---
interface AniversarianteEntry {
  nome: string;
  dataNascimento: string;
}

// --- Table Columns ---
const columns: Column<Cliente>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    render: (_value, c) => (
      <div>
        <span className="text-sm font-medium text-text-primary">{c.nome}</span>
        {c.contribuinte && (
          <p className="text-xs text-text-muted">NIF: {c.contribuinte}</p>
        )}
      </div>
    ),
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Mail size={14} className="text-text-muted" />
        <span className="text-sm text-text-primary">{value || "—"}</span>
      </div>
    ),
  },
  {
    key: "telefone",
    label: "Telefone",
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Phone size={14} className="text-text-muted" />
        <span className="text-sm text-text-primary">{value}</span>
      </div>
    ),
  },
  {
    key: "aniversariantes",
    label: "Aniversariantes",
    render: (_value, c) => {
      if (!c.aniversariantes || c.aniversariantes.length === 0) return <span className="text-text-muted">—</span>;
      return (
        <div className="space-y-1">
          {c.aniversariantes.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5">
              <Cake size={12} className="text-pink-500" />
              <span className="text-xs text-text-primary">{a.nome}</span>
              <span className="text-xs text-text-muted">
                ({format(new Date(a.dataNascimento), "dd MMM", { locale: pt })})
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "optOut",
    label: "Newsletter",
    render: (_value, c) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        c.optOut ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
      }`}>
        {c.optOut ? "Excluído" : "Activo"}
      </span>
    ),
  },
];

export default function ClientesContent() {
  const { data, isLoading } = useClientes();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();

  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [aniversariantes, setAniversariantes] = useState<AniversarianteEntry[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "",
      contribuinte: "",
      email: "",
      telefone: "",
      codigoPostal: "",
      observacao: "",
    },
  });

  const clientes = data?.data || [];

  const handleCreate = useCallback(() => {
    setEditingCliente(null);
    setAniversariantes([]);
    reset({ nome: "", contribuinte: "", email: "", telefone: "", codigoPostal: "", observacao: "" });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (cliente: Cliente) => {
      setEditingCliente(cliente);
      setAniversariantes(
        cliente.aniversariantes?.map((a) => ({
          nome: a.nome,
          dataNascimento: format(new Date(a.dataNascimento), "yyyy-MM-dd"),
        })) || []
      );
      reset({
        nome: cliente.nome,
        contribuinte: cliente.contribuinte || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        codigoPostal: cliente.codigoPostal || "",
        observacao: cliente.observacao || "",
      });
      setShowForm(true);
    },
    [reset]
  );

  const addAniversariante = useCallback(() => {
    setAniversariantes((prev) => [...prev, { nome: "", dataNascimento: "" }]);
  }, []);

  const removeAniversariante = useCallback((index: number) => {
    setAniversariantes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAniversariante = useCallback((index: number, field: keyof AniversarianteEntry, value: string) => {
    setAniversariantes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const onSubmit = useCallback(
    async (data: ClienteFormData) => {
      const payload = {
        nome: data.nome,
        contribuinte: data.contribuinte || undefined,
        email: data.email || "",
        telefone: data.telefone,
        codigoPostal: data.codigoPostal || undefined,
        observacao: data.observacao || undefined,
        ...(editingCliente ? {} : { aniversariantes: aniversariantes.filter((a) => a.nome && a.dataNascimento) }),
      };
      if (editingCliente) {
        await updateCliente.mutateAsync({ id: editingCliente.id, data: payload });
      } else {
        await createCliente.mutateAsync(payload);
      }
      setShowForm(false);
    },
    [editingCliente, createCliente, updateCliente, aniversariantes]
  );

  const handleDelete = useCallback(
    async (cliente: Cliente) => {
      await deleteCliente.mutateAsync(cliente.id);
    },
    [deleteCliente]
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gestão de pais/encarregados de educação e contactos para newsletters"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Cliente
          </Button>
        }
      />

      <div className="mt-4">
        <DataTable<Cliente>
          data={clientes}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar clientes..."
          searchableFields={["nome", "email", "telefone"]}
          itemLabel="clientes"
          pagination
          pageSize={10}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyState={{
            title: "Nenhum cliente encontrado",
            description: "Os clientes são adicionados automaticamente ao criar festas. Também pode adicionar manualmente.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Cliente
              </Button>
            ),
          }}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingCliente ? "Editar Cliente" : "Novo Cliente"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Nome *</label>
                  <InputField
                    {...register("nome")}
                    placeholder="Nome completo"
                    error={!!errors.nome}
                    hint={errors.nome?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Contribuinte</label>
                  <InputField
                    {...register("contribuinte")}
                    placeholder="NIF (opcional)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Email *</label>
                  <InputField
                    {...register("email")}
                    type="email"
                    placeholder="email@exemplo.pt"
                    error={!!errors.email}
                    hint={errors.email?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Telefone *</label>
                  <InputField
                    {...register("telefone")}
                    placeholder="912 345 678"
                    error={!!errors.telefone}
                    hint={errors.telefone?.message}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Código Postal</label>
                <InputField
                  {...register("codigoPostal")}
                  placeholder="1000-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Observação</label>
                <textarea
                  {...register("observacao")}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Notas adicionais (opcional)"
                />
              </div>

              {/* Aniversariantes */}
              {!editingCliente && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text-primary">
                      Aniversariantes (filhos)
                    </label>
                    <button
                      type="button"
                      onClick={addAniversariante}
                      className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Adicionar
                    </button>
                  </div>
                  {aniversariantes.length === 0 && (
                    <p className="text-xs text-text-muted">Clique em "Adicionar" para registar filhos.</p>
                  )}
                  <div className="space-y-2">
                    {aniversariantes.map((a, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <input
                          type="text"
                          value={a.nome}
                          onChange={(e) => updateAniversariante(i, "nome", e.target.value)}
                          placeholder="Nome da criança"
                          className="flex-1 h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-transparent text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
                        />
                        <input
                          type="date"
                          value={a.dataNascimento}
                          onChange={(e) => updateAniversariante(i, "dataNascimento", e.target.value)}
                          className="flex-1 h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-transparent text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeAniversariante(i)}
                          className="text-red-500 hover:text-red-600 text-sm px-2 py-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 mt-4 flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-[10px] px-5 py-3">
                  Cancelar
                </Button>
                <div className="flex gap-2 flex-1 justify-end">
                  <Button type="submit" disabled={isSubmitting} className="rounded-[10px] px-5 py-3">
                    {isSubmitting ? "A guardar..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}