"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Clock,
  Users,
  Square,
  XCircle,
  AlertTriangle,
  Plus,
  Eye,
  CheckCircle,
  CreditCard,
  Package,
  Phone,
  Pencil,
} from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import {
  useEntradasLivresAtivas,
  useConcluirEntradaLivre,
  useCancelarEntradaLivre,
  useAtualizarPagamentoEntradaLivre,
} from "@/hooks/use-entrada-livre";
import EntradaLivreForm from "./EntradaLivreForm";
import EntradaLivreDetailModal from "./EntradaLivreDetailModal";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/** Hook that returns current time, updated every second */
function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

/** Calculates elapsed and remaining time for an active entrada */
function useTimer(inicioEm: string, duracaoMinutos: number) {
  const now = useCurrentTime();
  const inicio = new Date(inicioEm);

  const elapsedMs = now.getTime() - inicio.getTime();
  const plannedMs = duracaoMinutos * 60 * 1000;
  const excessMs = Math.max(0, elapsedMs - plannedMs);
  const remainingMs = Math.max(0, plannedMs - elapsedMs);

  const isOvertime = excessMs > 0;

  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);

  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  const excessMin = Math.floor(excessMs / 60000);
  const excessSec = Math.floor((excessMs % 60000) / 1000);

  const progressPercent = Math.min(100, (elapsedMs / plannedMs) * 100);

  return {
    elapsed: `${String(elapsedMin).padStart(2, "0")}:${String(elapsedSec).padStart(2, "0")}`,
    remaining: isOvertime ? "Excedido" : `${String(remainingMin).padStart(2, "0")}:${String(remainingSec).padStart(2, "0")}`,
    excess: isOvertime ? `+${String(excessMin).padStart(2, "0")}:${String(excessSec).padStart(2, "0")}` : null,
    isOvertime,
    progressPercent,
    excessMinutes: excessMin,
  };
}

// ── Main Component ──────────────────────────────────────────────
export default function EntradasAtivasContent() {
  const { data: entradas, isLoading } = useEntradasLivresAtivas();

  const concluir = useConcluirEntradaLivre();
  const cancelar = useCancelarEntradaLivre();
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  const [confirmConcluir, setConfirmConcluir] = useState<string | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<EntradaLivre | null>(null);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  const handleConcluir = useCallback(
    async (id: string) => {
      await concluir.mutateAsync(id);
      setConfirmConcluir(null);
    },
    [concluir]
  );

  const handleCancelar = useCallback(
    async (id: string) => {
      await cancelar.mutateAsync(id);
      setConfirmCancelar(null);
    },
    [cancelar]
  );

  const handleMarcarPago = useCallback(
    async (id: string) => {
      await atualizarPagamento.mutateAsync({ id, data: { pago: true } });
    },
    [atualizarPagamento]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingEntrada(null);
  }, []);

  const handleEdit = useCallback((entrada: EntradaLivre) => {
    setEditingEntrada(entrada);
  }, []);

  const isFormOpen = showForm || !!editingEntrada;
  const formTitle = editingEntrada ? "Editar Entrada Livre" : "Nova Entrada Livre";

  return (
    <div>
      <PageHeader
        title="Entradas Livres"
        subtitle={`Acompanhe em tempo real — ${todayStr}`}
        actions={
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} />
            Nova Entrada
          </Button>
        }
      />

      {/* Entradas Ativas */}
      <div className="mt-6">
        <EmCursoTab
          entradas={entradas}
          isLoading={isLoading}
          onConcluir={setConfirmConcluir}
          onCancelar={setConfirmCancelar}
          onMarcarPago={handleMarcarPago}
          onView={setViewingEntradaId}
          onEdit={handleEdit}
          pagamentoPending={atualizarPagamento.isPending}
        />
      </div>

      {/* Confirm Concluir */}
      <ConfirmActionModal
        isOpen={!!confirmConcluir}
        onClose={() => setConfirmConcluir(null)}
        onConfirm={() => handleConcluir(confirmConcluir!)}
        title="Concluir Entrada"
        message="Tem a certeza que deseja concluir esta entrada? O tempo de excesso será calculado automaticamente."
        confirmText="Concluir"
        variant="danger"
        isConfirming={concluir.isPending}
      />

      {/* Confirm Cancelar */}
      <ConfirmActionModal
        isOpen={!!confirmCancelar}
        onClose={() => setConfirmCancelar(null)}
        onConfirm={() => handleCancelar(confirmCancelar!)}
        title="Cancelar Entrada"
        message="Tem a certeza que deseja cancelar esta entrada?"
        confirmText="Cancelar"
        variant="danger"
        isConfirming={cancelar.isPending}
      />

      {/* Create/Edit Modal */}
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
      />
    </div>
  );
}

// ── Em Curso Tab (Cards) ───────────────────────────────────────
function EmCursoTab({
  entradas,
  isLoading,
  onConcluir,
  onCancelar,
  onMarcarPago,
  onView,
  onEdit,
  pagamentoPending,
}: {
  entradas?: EntradaLivre[];
  isLoading: boolean;
  onConcluir: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (entrada: EntradaLivre) => void;
  pagamentoPending: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!entradas || entradas.length === 0) {
    return (
      <div className="rounded-xl p-12 shadow-theme-xs border border-border text-center bg-white">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mx-auto mb-4">
          <Clock size={32} className="text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">Sem entradas ativas</p>
        <p className="text-xs text-text-muted">Não existem entradas livres em curso neste momento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {entradas.map((entrada) => (
        <EntradaAtivaCard
          key={entrada.id}
          entrada={entrada}
          onConcluir={onConcluir}
          onCancelar={onCancelar}
          onMarcarPago={onMarcarPago}
          onView={onView}
          onEdit={onEdit}
          pagamentoPending={pagamentoPending}
        />
      ))}
    </div>
  );
}

// ── Entrada Ativa Card ─────────────────────────────────────────
function EntradaAtivaCard({
  entrada,
  onConcluir,
  onCancelar,
  onMarcarPago,
  onView,
  onEdit,
  pagamentoPending,
}: {
  entrada: EntradaLivre;
  onConcluir: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (entrada: EntradaLivre) => void;
  pagamentoPending: boolean;
}) {
  const timer = useTimer(entrada.inicioEm, entrada.duracaoMinutos);

  return (
    <div className={`rounded-xl border shadow-theme-xs bg-white overflow-hidden transition-all ${timer.isOvertime ? "border-accent-red-200 ring-1 ring-accent-red-100" : "border-border"}`}>
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all duration-1000 ${timer.isOvertime ? "bg-accent-red-500" : "bg-brand-500"}`}
          style={{ width: `${Math.min(100, timer.progressPercent)}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-text-muted shrink-0" />
              <span className="text-sm font-semibold text-text-primary truncate">
                {entrada.criancas.map((c) => c.nome).join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>{entrada.local?.nome ?? "—"}</span>
              <span>·</span>
              <span>{formatTime(entrada.inicioEm)}</span>
              <span>·</span>
              <span>{entrada.duracaoMinutos} min</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{entrada.criancas.length} {entrada.criancas.length === 1 ? "criança" : "crianças"}</span>
              <span>·</span>
              <span>{entrada.encarregadoNome}</span>
            </div>
          </div>
          <StatusBadge status="ATIVA" />
        </div>

        {/* Timer Display */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center px-3 py-2 rounded-lg bg-gray-50">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Decorrido</p>
            <p className={`text-lg font-bold font-mono tracking-wider ${timer.isOvertime ? "text-accent-red-600" : "text-text-primary"}`}>
              {timer.elapsed}
            </p>
          </div>
          <div className="text-center px-3 py-2 rounded-lg bg-gray-50">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Restante</p>
            <p className={`text-lg font-bold font-mono tracking-wider ${timer.isOvertime ? "text-accent-red-500" : "text-brand-600"}`}>
              {timer.remaining}
            </p>
          </div>
          <div className={`text-center px-3 py-2 rounded-lg ${timer.isOvertime ? "bg-accent-red-50" : "bg-gray-50"}`}>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Excesso</p>
            <p className={`text-lg font-bold font-mono tracking-wider ${timer.excess ? "text-accent-red-600" : "text-text-muted"}`}>
              {timer.excess ?? "—"}
            </p>
          </div>
        </div>

        {/* Overtime alert */}
        {timer.isOvertime && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-red-50 border border-accent-red-100 mb-3">
            <AlertTriangle size={14} className="text-accent-red-500 shrink-0" />
            <span className="text-xs font-medium text-accent-red-700">
              Tempo excedido há {timer.excess}. Será cobrado valor proporcional ao excesso.
            </span>
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-4 text-xs text-text-muted mb-3 flex-wrap">
          {entrada.pago ? (
            <span className="flex items-center gap-1 text-accent-green-600 font-medium"><CheckCircle size={11} /> Pago</span>
          ) : (
            <span className="flex items-center gap-1 text-accent-orange-600 font-medium"><CreditCard size={11} /> Por pagar</span>
          )}
          {entrada.cacifo && (
            <span className="flex items-center gap-1"><Package size={11} /> Cacifo #{entrada.cacifo.numero}</span>
          )}
          <span className="flex items-center gap-1"><Phone size={11} /> {entrada.encarregadoTelefone}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onView(entrada.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Eye size={13} /> Ver
          </button>
          <button
            onClick={() => onEdit(entrada)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Pencil size={13} /> Editar
          </button>
          {!entrada.pago && (
            <button
              onClick={() => onMarcarPago(entrada.id)}
              disabled={pagamentoPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <CreditCard size={13} /> Pagar
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => onConcluir(entrada.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Square size={13} /> Concluir
            </button>
            <button
              onClick={() => onCancelar(entrada.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <XCircle size={13} /> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}