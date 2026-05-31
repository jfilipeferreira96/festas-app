"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UtensilsCrossed, Plus, Trash2, Edit, Package } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
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
  const [formCategoria, setFormCategoria] = useState<"MENU" | "EXTRA">("MENU");
  const [formSubcategoria, setFormSubcategoria] = useState("");
  const [formRequerTexto, setFormRequerTexto] = useState(false);

  const menuItems = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "MENU" && e.activo),
    [extras]
  );
  const extraItems = useMemo(() => {
    const items = (extras ?? []).filter((e) => e.categoria === "EXTRA" && e.activo);
    const grouped: Record<string, typeof items> = {};
    const ungrouped: typeof items = [];
    for (const item of items) {
      const sub = item.subcategoria?.trim();
      if (sub) {
        if (!grouped[sub]) grouped[sub] = [];
        grouped[sub].push(item);
      } else {
        ungrouped.push(item);
      }
    }
    return { grouped, ungrouped, all: items };
  }, [extras]);

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value / 100),
    []
  );

  const handleCreate = useCallback(() => {
    setEditingExtra(null);
    setFormNome("");
    setFormPreco("");
    setFormCategoria("MENU");
    setFormSubcategoria("");
    setFormRequerTexto(false);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((extra: Extra) => {
    setEditingExtra(extra);
    setFormNome(extra.nome);
    setFormPreco(String(Number(extra.precoUnitario) / 100));
    setFormCategoria(extra.categoria as "MENU" | "EXTRA");
    setFormSubcategoria(extra.subcategoria ?? "");
    setFormRequerTexto(extra.requerTexto ?? false);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const precoCentavos = Math.round(parseFloat(formPreco.replace(",", ".")) * 100) || 0;

      const commonData = {
        nome: formNome,
        precoUnitario: precoCentavos,
        categoria: formCategoria,
        subcategoria: formSubcategoria.trim() || undefined,
        requerTexto: formRequerTexto,
      };
      if (editingExtra) {
        await updateExtra.mutateAsync({ id: editingExtra.id, data: commonData });
      } else {
        await createExtra.mutateAsync(commonData);
      }
      setShowForm(false);
    },
    [editingExtra, formNome, formPreco, formCategoria, formSubcategoria, formRequerTexto, createExtra, updateExtra]
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
              Extras ({extraItems.all.length} itens)
            </h2>
            {extraItems.all.length === 0 ? (
              <p className="text-sm text-text-muted py-4">Nenhum extra configurado.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(extraItems.grouped).map(([sub, items]) => (
                  <div key={sub}>
                    <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">{sub}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => (
                        <ItemCard key={item.id} item={item} formatCurrency={formatCurrency}
                          onEdit={() => handleEdit(item)} onDelete={() => setDeleteTarget(item)} />
                      ))}
                    </div>
                  </div>
                ))}
                {extraItems.ungrouped.length > 0 && (
                  <div>
                    {Object.keys(extraItems.grouped).length > 0 && (
                      <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Outros</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {extraItems.ungrouped.map((item) => (
                        <ItemCard key={item.id} item={item} formatCurrency={formatCurrency}
                          onEdit={() => handleEdit(item)} onDelete={() => setDeleteTarget(item)} />
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Subcategoria</label>
                  <input
                    type="text"
                    value={formSubcategoria}
                    onChange={(e) => setFormSubcategoria(e.target.value)}
                    placeholder="Ex: Diversão, Premium"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch checked={formRequerTexto} onChange={setFormRequerTexto} />
                  <label className="text-xs font-medium text-text-secondary">Permitir texto personalizado</label>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createExtra.isPending || updateExtra.isPending}>
                  {createExtra.isPending || updateExtra.isPending ? "A guardar..." : "Guardar"}
                </Button>
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
      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
        {item.categoria === "MENU" ? (
          <UtensilsCrossed size={16} className="text-primary-500" />
        ) : (
          <Package size={16} className="text-accent-purple-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.nome}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-secondary">{formatCurrency(Number(item.precoUnitario))}</p>
          {item.requerTexto && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-600 font-medium">Texto</span>
          )}
          {item.subcategoria && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-text-muted font-medium">{item.subcategoria}</span>
          )}
        </div>
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