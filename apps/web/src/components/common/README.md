# Componentes Comuns

Este diretório contém componentes reutilizáveis para operações CRUD comuns.

## Componentes Disponíveis

### DeleteModal
Modal de confirmação para eliminação de itens.

```tsx
import { DeleteModal } from "@/components/common/DeleteModal";

const [deletingItem, setDeletingItem] = useState<Item | null>(null);

const handleDelete = async () => {
  await deleteItem.mutateAsync(deletingItem.id);
  setDeletingItem(null);
};

<DeleteModal
  isOpen={!!deletingItem}
  onClose={() => setDeletingItem(null)}
  onConfirm={handleDelete}
  title="Confirmar Eliminação"
  message="Tem a certeza que deseja eliminar este item?"
  itemName={deletingItem?.name}
/>
```

### CreateModal
Modal para criar novos itens.

```tsx
import { CreateModal } from "@/components/common/CreateModal";
import { useModal } from "@/hooks/useModal";

const { isOpen, openModal, closeModal } = useModal();

const handleSubmit = async (data: unknown) => {
  await createItem.mutateAsync(data);
};

<CreateModal
  isOpen={isOpen}
  onClose={closeModal}
  onSubmit={handleSubmit}
  title="Novo Item"
  size="md"
>
  <YourForm />
</CreateModal>
```

### EditModal
Modal para editar itens existentes.

```tsx
import { EditModal } from "@/components/common/EditModal";

const [editingItem, setEditingItem] = useState<Item | null>(null);

const handleSubmit = async (data: unknown) => {
  await updateItem.mutateAsync({ id: editingItem.id, ...data });
  setEditingItem(null);
};

<EditModal
  isOpen={!!editingItem}
  onClose={() => setEditingItem(null)}
  onSubmit={handleSubmit}
  title="Editar Item"
  size="md"
>
  <YourForm initialData={editingItem} />
</EditModal>
```

## useModal Hook

Hook para gerir o estado de modais.

```tsx
import { useModal } from "@/hooks/useModal";

const { isOpen, openModal, closeModal, toggleModal } = useModal();
```

## DataTable

Componente de tabela reutilizável com paginação, pesquisa e ordenação.

```tsx
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";

const columns: Column<Reserva>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
  },
  {
    key: "estado",
    label: "Estado",
    sortable: true,
    render: (value) => <StatusBadge status={value} />,
  },
];

<DataTable
  data={reservas}
  columns={columns}
  loading={isLoading}
  searchable={true}
  searchPlaceholder="Pesquisar reservas..."
  searchableFields={["nome", "email"]}
  pagination={true}
  pageSize={10}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onView={handleView}
  canManage={true}
  emptyState={{
    title: "Sem reservas",
    description: "Comece por criar a sua primeira reserva",
    action: <Button onClick={openCreateModal}>Criar Reserva</Button>
  }}
/>
```

## Modal Component

Componente base para modais com tamanhos configuráveis.

```tsx
import { Modal } from "@/components/ui/modal";
import type { ModalSize } from "@/components/ui/modal";

<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <div className="p-6">
    <h2 className="text-lg font-semibold mb-4">Título</h2>
    <p>Conteúdo do modal</p>
  </div>
</Modal>
```

### Tamanhos disponíveis:
- `sm` - max-w-md (para formulários pequenos)
- `md` - max-w-2xl (para formulários padrão - default)
- `lg` - max-w-4xl (para formulários complexos)
- `xl` - max-w-6xl (para tabelas ou modais muito grandes)
- `full` - w-full h-full (apenas quando estritamente necessário)

## LoadingState

Componente para estados de loading.

```tsx
import LoadingState from "@/components/ui/LoadingState";

<LoadingState message="A carregar dados..." size="md" />
<LoadingState message="A guardar..." onCancel={handleCancel} cancelText="Cancelar" />
```

## Padrão Completo de CRUD

```tsx
"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { useModal } from "@/hooks/useModal";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { CreateModal, EditModal, DeleteModal } from "@/components/common";

export default function ItemsPage() {
  const { data: items, isLoading } = useItems();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const createModal = useModal();

  const handleCreate = useCallback(async (data: unknown) => {
    await createItem.mutateAsync(data);
    createModal.closeModal();
  }, [createModal]);

  const handleEdit = useCallback((item: Item) => {
    setEditingItem(item);
  }, []);

  const handleEditSubmit = useCallback(async (data: unknown) => {
    await updateItem.mutateAsync({ id: editingItem.id, ...data });
    setEditingItem(null);
  }, [editingItem]);

  const handleDelete = useCallback((item: Item) => {
    setDeletingItem(item);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    await deleteItem.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  }, [deletingItem]);

  const columns: Column<Item>[] = [
    { key: "name", label: "Nome", sortable: true },
    { key: "email", label: "Email", sortable: true },
  ];

  return (
    <div>
      <PageHeader
        title="Itens"
        subtitle="Gestão de itens"
        actions={
          <Button onClick={createModal.openModal} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Item
          </Button>
        }
      />

      <DataTable
        data={items || []}
        columns={columns}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyState={{
          title: "Sem itens",
          description: "Comece por criar o seu primeiro item",
          action: <Button onClick={createModal.openModal}>Criar Item</Button>
        }}
      />

      <CreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.closeModal}
        onSubmit={handleCreate}
        title="Novo Item"
        size="md"
      >
        <ItemForm />
      </CreateModal>

      {editingItem && (
        <EditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={handleEditSubmit}
          title="Editar Item"
          size="md"
        >
          <ItemForm initialData={editingItem} />
        </EditModal>
      )}

      {deletingItem && (
        <DeleteModal
          isOpen={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteConfirm}
          title="Confirmar Eliminação"
          message="Tem a certeza que deseja eliminar este item?"
          itemName={deletingItem.name}
        />
      )}
    </div>
  );
}