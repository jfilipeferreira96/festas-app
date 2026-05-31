"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UtensilsCrossed, Plus, Trash2, Edit, Package } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { useExtras, useCreateExtra, useUpdateExtra, useDeleteExtra } from "@/hooks/use-extras";
import type { Extra } from "@/lib/api/extras";

export default function MenusContent() {
  const { data: extras, isLoading } = useExtras();
  const createExtra = useCreateExtra();
  const updateExtra = useUpdateExtra();
  const deleteExtra = useDeleteExtra();

  const [showForm, setShowForm] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Extra | null>(null);

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formPreco, setFormPreco] = useState("");
  const [formIcone, setFormIcone] = useState("");
  const [formCategoria, setFormCategoria] = useState<"MENU" | "EXTRA">("MENU");

  const menuItems = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "MENU" && e.activo),
    [extras]
  );
  const extraItems = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "EXTRA" && e.activo),
    [extras]
  );

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value / 100),
    []
  );

  const handleCreate = useCallback(() => {
    setEditingExtra(null);
    setFormNome("");
    setFormPreco("");
    setFormIcone("");
    setFormCategoria("MENU");
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((extra: Extra) => {
    setEditingExtra(extra);
    setFormNome(extra.nome);
    setFormPreco(String(Number(extra.precoUnitario) / 100));
    setFormIcone(extra.icone ?? "");
    setFormCategoria(extra.categoria as "MENU" | "EXTRA");
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const precoCentavos = Math.round(parseFloat(formPreco.replace(",", ".")) * 100) || 0;

      if (editingExtra) {
        await updateExtra.mutateAsync({
          id: editingExtra.id,
          data: {
            nome: formNome,
            precoUnitario: precoCentavos,
            icone: formIcone || undefined,
            categoria: formCategoria,
          },
        });
      } else {
        await createExtra.mutateAsync({
          nome: formNome,
          precoUnitario: precoCentavos,
          icone: formIcone || undefined,
          categoria: formCategoria,
        });
      }
      setShowForm(false);
    },
    [editingExtra, formNome, formPreco, formIcone, formCategoria, createExtra, updateExtra]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteExtra.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteExtra]);

  return (
    <div>
      <PageHeader
        title="Menus & Extras"
        subtitle="Gestão de itens de menu e extras disponíveis para reservas"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Item
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {/* Menu Section */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-primary-500" />
              Menu ({menuItems.length} itens)
            </h2>
            {menuItems.length === 0 ? (
              <p className="text-sm text-text-muted py-4">Nenhum item de menu configurado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Extras Section */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Package size={16} className="text-accent-purple-500" />
              Extras ({extraItems.length} itens)
            </h2>
            {extraItems.length === 0 ? (
              <p className="text-sm text-text-muted py-4">Nenhum extra configurado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {extraItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="md">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingExtra ? "Editar Item" : "Novo Item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nome *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Sandes de fiambre"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Preço (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPreco}
                    onChange={(e) => setFormPreco(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Categoria</label>
                  <Select
                    value={formCategoria}
                    onChange={(val) => setFormCategoria(val as "MENU" | "EXTRA")}
                    options={[
                      { value: "MENU", label: "Menu" },
                      { value: "EXTRA", label: "Extra" },
                    ]}
                    placeholder="Categoria"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Ícone (opcional)</label>
                <input
                  type="text"
                  value={formIcone}
                  onChange={(e) => setFormIcone(e.target.value)}
                  placeholder="Ex: sandwich, cake, pizza"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="border-t border-border pt-4 mt-4 flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-[10px] px-5 py-3">
                  Cancelar
                </Button>
                <div className="flex gap-2 flex-1 justify-end">
                  <Button type="submit" disabled={createExtra.isPending || updateExtra.isPending} className="rounded-[10px] px-5 py-3">
                    {createExtra.isPending || updateExtra.isPending ? "A guardar..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar Item"
        message={`Tem a certeza que deseja eliminar "${deleteTarget?.nome}"? Esta acção é irreversível.`}
        confirmText="Eliminar"
        isConfirming={deleteExtra.isPending}
      />
    </div>
  );
}

// ── Item Card ──────────────────────────────────────────────────
function ItemCard({
  item,
  formatCurrency,
  onEdit,
  onDelete,
}: {
  item: Extra;
  formatCurrency: (v: number) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-gray-300 transition-colors">
      {item.icone ? (
        <img
          src={`/images/food-icons/icons8-${item.icone}-100.png`}
          alt={item.nome}
          className="w-10 h-10 object-contain shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <UtensilsCrossed size={16} className="text-primary-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.nome}</p>
        <p className="text-xs text-text-secondary">{formatCurrency(Number(item.precoUnitario))}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 text-text-muted hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
          title="Editar"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}