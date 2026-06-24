"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Eye, Trash2, Check, CheckCircle, XCircle, Users, Clock, Pencil, CreditCard } from "lucide-react";
import { PageHeader, StatusBadge, Button, type StatusType } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import ConcluirResumoModal from "@/components/shared/ConcluirResumoModal";
import { useEntradasLivres, useEliminarEntradaLivre, useConcluirEntradaLivre, useCancelarEntradaLivre, useAtualizarPagamentoEntradaLivre } from "@/hooks/use-entrada-livre";
import EntradaLivreForm from "./EntradaLivreForm";
import EntradaLivreDetailModal from "./EntradaLivreDetailModal";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";

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

export default function EntradasLivresTabela({ mode = "full" }: { mode?: "full" | "cacifos" }) {
  const isCacifos = mode === "cacifos";
  const [filtro, setFiltro] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<EntradaLivre | null>(null);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [concluirModal, setConcluirModal] = useState<EntradaLivre | null>(null);
  const [cancelarModal, setCancelarModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });

  const isFormOpen = showForm || !!editingEntrada;
  const formTitle = editingEntrada ? "Editar Entrada Livre" : "Nova Entrada Livre";

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

  // Total de crianças (somatório de todas as entradas visíveis)
  const totalCriancas = useMemo(() => {
    if (!entradas) return 0;
    return entradas.reduce((sum, e) => sum + (e.criancas?.length ?? 0), 0);
  }, [entradas]);

  const eliminar = useEliminarEntradaLivre();
  const concluir = useConcluirEntradaLivre();
  const cancelar = useCancelarEntradaLivre();
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  const handleCreate = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingEntrada(null);
  }, []);

  const handleEdit = useCallback((entrada: EntradaLivre) => {
    setEditingEntrada(entrada);
  }, []);

  const handleView = useCallback((entrada: EntradaLivre) => {
    setViewingEntradaId(entrada.id);
  }, []);

  const handleDelete = useCallback(async () => {
    await eliminar.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "" });
  }, [eliminar, deleteModal.id]);

  const handleConcluir = useCallback(
    async (custoExcesso?: number) => {
      if (!concluirModal) return;
      await concluir.mutateAsync({ id: concluirModal.id, custoExcesso });
      setConcluirModal(null);
    },
    [concluir, concluirModal],
  );

  const handleCancelar = useCallback(async () => {
    await cancelar.mutateAsync(cancelarModal.id);
    setCancelarModal({ isOpen: false, id: "" });
  }, [cancelar, cancelarModal.id]);

  const handleMarcarPago = useCallback(async (id: string) => {
    await atualizarPagamento.mutateAsync({ id, data: { pago: true } });
  }, [atualizarPagamento]);

  const handlePagarExcesso = useCallback(async (id: string) => {
    await atualizarPagamento.mutateAsync({ id, data: { pagoExcesso: true } });
  }, [atualizarPagamento]);

  return (
    <div>
      <PageHeader
        title="Entradas Livres"
        subtitle="Gestão de entradas livres"
        actions={
          !isLoading && totalCriancas > 0 && (filtro === "hoje" || filtro === "semana" || filtro === "ATIVA") ? (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-2">
              <Users size={18} className="text-brand-600" />
              <span className="text-sm font-semibold text-brand-700">
                {totalCriancas} {totalCriancas === 1 ? "criança" : "crianças"}
              </span>
            </div>
          ) : undefined
        }
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
        {!isCacifos && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Nova Entrada
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable<EntradaLivre>
        data={entradas ?? []}
        itemLabel="entradas"
        defaultSort={{ key: "inicioEm", direction: "desc" }}
        columns={([
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
                <p className="text-xs text-text-muted">
                  {r.encarregadoTelefone ?? ""}
                  {r.encarregadoTelefone && r.encarregadoEmail ? " · " : ""}
                  {r.encarregadoEmail ?? ""}
                </p>
              </div>
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
                <span className="text-accent-red-600 font-medium text-sm">Não</span>
              )
            ),
          },
        ] as Column<EntradaLivre>[]).filter((c) => !(isCacifos && (c.key === "custo" || c.key === "pago")))}
        loading={isLoading}
        searchable
        searchPlaceholder="Pesquisar por nome, telefone, email..."
        searchFn={(r, q) => {
          const criancasNomes = r.criancas.map((c: any) => c.nome || "").join(" ").toLowerCase();
          return (
            criancasNomes.includes(q) ||
            (r.encarregadoNome?.toLowerCase()?.includes(q) ?? false) ||
            (r.encarregadoTelefone?.includes(q) ?? false) ||
            (r.encarregadoEmail?.toLowerCase()?.includes(q) ?? false)
          );
        }}
        pagination
        pageSize={10}
        renderActions={(r) => {
          // CACIFOS read-only: apenas "Ver detalhes"
          if (isCacifos) {
            return (
              <div className="flex items-center justify-end gap-1">
                <Tooltip content="Ver detalhes" position="top" theme="dark">
                  <button
                    onClick={() => setViewingEntradaId(r.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                  >
                    <Eye size={15} />
                  </button>
                </Tooltip>
              </div>
            );
          }
          return (
          <div className="flex items-center justify-end gap-1">
            {/* Quick action: Marcar Pago (ATIVA não paga) */}
            {r.estado === "ATIVA" && !r.pago && (
              <Tooltip content="Marcar como paga" position="top" theme="dark">
                <button
                  onClick={() => handleMarcarPago(r.id)}
                  disabled={atualizarPagamento.isPending}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors disabled:opacity-50"
                >
                  <Check size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Pagar Excesso (CONCLUIDA com excesso em falta) */}
            {r.estado === "CONCLUIDA" && r.custoExcesso != null && r.custoExcesso > 0 && !r.pagoExcesso && (
              <Tooltip content="Marcar excesso pago" position="top" theme="dark">
                <button
                  onClick={() => handlePagarExcesso(r.id)}
                  disabled={atualizarPagamento.isPending}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors disabled:opacity-50"
                >
                  <CreditCard size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Concluir (ATIVA) */}
            {r.estado === "ATIVA" && (
              <Tooltip content="Concluir entrada" position="top" theme="dark">
                <button
                  onClick={() => setConcluirModal(r)}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                >
                  <CheckCircle size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Cancelar (ATIVA) */}
            {r.estado === "ATIVA" && (
              <Tooltip content="Cancelar entrada" position="top" theme="dark">
                <button
                  onClick={() => setCancelarModal({ isOpen: true, id: r.id })}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-text-muted hover:text-accent-orange transition-colors"
                >
                  <XCircle size={15} />
                </button>
              </Tooltip>
            )}
            {/* View */}
            <Tooltip content="Ver detalhes" position="top" theme="dark">
              <button
                onClick={() => setViewingEntradaId(r.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
              >
                <Eye size={15} />
              </button>
            </Tooltip>
            {/* Edit (não conclusivas) */}
            {r.estado !== "CONCLUIDA" && r.estado !== "CANCELADA" && (
              <Tooltip content="Editar" position="top" theme="dark">
                <button
                  onClick={() => handleEdit(r)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                >
                  <Pencil size={15} />
                </button>
              </Tooltip>
            )}
            {/* Delete */}
            <Tooltip content="Eliminar" position="top" theme="dark">
              <button
                onClick={() => setDeleteModal({ isOpen: true, id: r.id })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </Tooltip>
          </div>
        )}}
        emptyState={{
          title: "Nenhum registo encontrado",
          description: "Tente alterar os filtros ou crie uma nova entrada.",
          action: isCacifos ? undefined : (
            <Button onClick={handleCreate} className="gap-2">
              <Plus size={16} /> Nova Entrada
            </Button>
          ),
        }}
      />

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={handleFormClose} size="2xl">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">{formTitle}</h2>
            <EntradaLivreForm entrada={editingEntrada} onClose={handleFormClose} />
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      <EntradaLivreDetailModal
        entradaId={viewingEntradaId}
        onClose={() => setViewingEntradaId(null)}
        hidePrices={isCacifos}
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

      {/* Concluir Resumo Modal */}
      {concluirModal && (
        <ConcluirResumoModal
          isOpen={!!concluirModal}
          onClose={() => setConcluirModal(null)}
          onConfirm={handleConcluir}
          isConfirming={concluir.isPending}
          titulo="Concluir Entrada"
          entidadeNome={concluirModal.criancas?.[0]?.nome ?? concluirModal.encarregadoNome}
          localNome="Parque (Entrada Livre)"
          inicioEm={concluirModal.inicioEm}
          fimPrevisto={concluirModal.fimPrevisto}
          duracaoMinutos={concluirModal.duracaoMinutos}
          custoBase={Number(concluirModal.custoTotal ?? 0)}
        />
      )}

      {/* Confirm Cancelar Modal */}
      <ConfirmActionModal
        isOpen={cancelarModal.isOpen}
        onClose={() => setCancelarModal({ isOpen: false, id: "" })}
        onConfirm={handleCancelar}
        title="Cancelar Entrada"
        message="Tem a certeza que deseja cancelar esta entrada?"
        confirmText="Cancelar"
        variant="warning"
        isConfirming={cancelar.isPending}
      />
    </div>
  );
}
