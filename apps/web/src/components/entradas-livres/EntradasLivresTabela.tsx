"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Eye, Trash2, Square, XCircle, Users, Clock } from "lucide-react";
import { PageHeader, StatusBadge, Button, type StatusType } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { useEntradasLivres, useEliminarEntradaLivre, useConcluirEntradaLivre, useCancelarEntradaLivre } from "@/hooks/use-entrada-livre";
import EntradaLivreForm from "./EntradaLivreForm";
import EntradaLivreDetailModal from "./EntradaLivreDetailModal";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import DataTable from "@/components/ui/table/DataTable";

const ESTADO_LABELS: Record<string, string> = {
  ATIVA: "Ativa",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const FILTER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "ATIVA", label: "Em Curso" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "CANCELADA", label: "Canceladas" },
];

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function EntradasLivresTabela() {
  const [filtro, setFiltro] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [concluirModal, setConcluirModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [cancelarModal, setCancelarModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });

  // Build filter params
  const filtros = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    if (filtro === "hoje") return { data: hoje };
    if (filtro === "semana") {
      const inicioSemana = new Date();
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1); // Monday
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(fimSemana.getDate() + 7);
      return { dataInicio: inicioSemana.toISOString().split("T")[0], dataFim: fimSemana.toISOString().split("T")[0] };
    }
    if (["ATIVA", "CONCLUIDA", "CANCELADA"].includes(filtro)) {
      return { estado: filtro };
    }
    return undefined;
  }, [filtro]);

  const { data: entradas, isLoading } = useEntradasLivres(filtros);
  const eliminar = useEliminarEntradaLivre();
  const concluir = useConcluirEntradaLivre();
  const cancelar = useCancelarEntradaLivre();

  const handleCreate = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleView = useCallback((entrada: EntradaLivre) => {
    setViewingEntradaId(entrada.id);
  }, []);

  const handleDelete = useCallback(async () => {
    await eliminar.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "" });
  }, [eliminar, deleteModal.id]);

  const handleConcluir = useCallback(async () => {
    await concluir.mutateAsync(concluirModal.id);
    setConcluirModal({ isOpen: false, id: "" });
  }, [concluir, concluirModal.id]);

  const handleCancelar = useCallback(async () => {
    await cancelar.mutateAsync(cancelarModal.id);
    setCancelarModal({ isOpen: false, id: "" });
  }, [cancelar, cancelarModal.id]);

  return (
    <div>
      <PageHeader
        title="Entradas Livres"
        subtitle="Gestão de entradas livres"
      />

      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-4 mt-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto filter-scrollbar max-w-full">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltro(opt.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                  filtro === opt.value
                    ? "bg-brand-500 text-white shadow-theme-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Nova Entrada
        </Button>
      </div>

      {/* Table */}
      <DataTable<EntradaLivre>
        data={entradas ?? []}
        itemLabel="entradas"
        defaultSort={{ key: "inicioEm", direction: "desc" }}
        columns={[
          {
            key: "criancas",
            label: "Crianças",
            render: (_v, r) => (
              <div className="flex items-center gap-2">
                <Users size={14} className="text-text-muted shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {r.criancas.map((c: any) => c.nome).join(", ")}
                  </p>
                  {r.criancas.some((c: any) => c.idade) && (
                    <p className="text-xs text-primary-500 font-medium">
                      {r.criancas.filter((c: any) => c.idade).map((c: any) => `${c.idade}a`).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "encarregado",
            label: "Encarregado",
            render: (_v, r) => (
              <div>
                <p className="text-sm font-medium text-text-primary">{r.encarregadoNome}</p>
                <p className="text-xs text-text-muted">{r.encarregadoTelefone}</p>
              </div>
            ),
          },
          {
            key: "local",
            label: "Local",
            render: (_v, r) => (
              <span className="text-sm text-text-secondary">{r.local?.nome ?? "—"}</span>
            ),
          },
          {
            key: "inicioEm",
            label: "Início",
            sortable: true,
            render: (_v, r) => (
              <div>
                <p className="text-sm text-text-primary">{formatDate(r.inicioEm)}</p>
                <p className="text-xs text-text-muted">{formatTime(r.inicioEm)}</p>
              </div>
            ),
          },
          {
            key: "duracaoMinutos",
            label: "Duração",
            render: (_v, r) => (
              <span className="text-sm text-text-secondary">{r.duracaoMinutos} min</span>
            ),
          },
          {
            key: "custo",
            label: "Custo",
            render: (_v, r) => (
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(r.custoTotalFinal ?? r.custoTotal)}
              </span>
            ),
          },
          {
            key: "estado",
            label: "Estado",
            sortable: true,
            render: (_v, r) => (
              <StatusBadge status={r.estado as StatusType}>
                {ESTADO_LABELS[r.estado] ?? r.estado}
              </StatusBadge>
            ),
          },
          {
            key: "pago",
            label: "Pago",
            render: (_v, r) => (
              r.pago ? (
                <span className="text-accent-green-600 font-medium text-sm">Sim</span>
              ) : (
                <span className="text-text-muted text-sm">Não</span>
              )
            ),
          },
        ]}
        loading={isLoading}
        searchable
        searchPlaceholder="Pesquisar por nome, telefone..."
        searchFn={(r, q) => {
          const criancasNomes = r.criancas.map((c: any) => c.nome || "").join(" ").toLowerCase();
          return (
            criancasNomes.includes(q) ||
            (r.encarregadoNome?.toLowerCase()?.includes(q) ?? false) ||
            (r.encarregadoTelefone?.includes(q) ?? false)
          );
        }}
        pagination
        pageSize={10}
        renderActions={(r) => (
          <div className="flex items-center justify-end gap-1">
            {/* Quick action: Concluir */}
            {r.estado === "ATIVA" && (
              <button
                onClick={() => setConcluirModal({ isOpen: true, id: r.id })}
                className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                title="Concluir entrada"
              >
                <Square size={15} />
              </button>
            )}
            {/* Quick action: Cancelar */}
            {r.estado === "ATIVA" && (
              <button
                onClick={() => setCancelarModal({ isOpen: true, id: r.id })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                title="Cancelar entrada"
              >
                <XCircle size={15} />
              </button>
            )}
            {/* View */}
            <button
              onClick={() => setViewingEntradaId(r.id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
              title="Ver detalhes"
            >
              <Eye size={15} />
            </button>
            {/* Delete (only non-active) */}
            {r.estado !== "ATIVA" && (
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: r.id })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
        emptyState={{
          title: "Nenhum registo encontrado",
          description: "Tente alterar os filtros ou crie uma nova entrada.",
          action: (
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} /> Nova Entrada
            </Button>
          ),
        }}
      />

      {/* Create Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={handleFormClose} size="2xl">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Nova Entrada Livre</h2>
            <EntradaLivreForm onClose={handleFormClose} />
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      <EntradaLivreDetailModal
        entradaId={viewingEntradaId}
        onClose={() => setViewingEntradaId(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "" })}
        onConfirm={handleDelete}
        title="Eliminar Entrada"
        message="Tem a certeza que deseja eliminar esta entrada? Esta acção é irreversível."
        confirmText="Eliminar"
        variant="danger"
        isConfirming={eliminar.isPending}
      />

      {/* Confirm Concluir Modal */}
      <ConfirmActionModal
        isOpen={concluirModal.isOpen}
        onClose={() => setConcluirModal({ isOpen: false, id: "" })}
        onConfirm={handleConcluir}
        title="Concluir Entrada"
        message="Tem a certeza que deseja concluir esta entrada? O tempo de excesso será calculado automaticamente."
        confirmText="Concluir"
        variant="danger"
        isConfirming={concluir.isPending}
      />

      {/* Confirm Cancelar Modal */}
      <ConfirmActionModal
        isOpen={cancelarModal.isOpen}
        onClose={() => setCancelarModal({ isOpen: false, id: "" })}
        onConfirm={handleCancelar}
        title="Cancelar Entrada"
        message="Tem a certeza que deseja cancelar esta entrada?"
        confirmText="Cancelar"
        variant="danger"
        isConfirming={cancelar.isPending}
      />
    </div>
  );
}
