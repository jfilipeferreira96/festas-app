"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Clock,
  Users,
  XCircle,
  AlertTriangle,
  Plus,
  Eye,
  CheckCircle,
  CreditCard,
  Package,
  Phone,
  Pencil,
  MoreVertical,
  Wallet,
} from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import ConcluirResumoModal from "@/components/shared/ConcluirResumoModal";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  useEntradasLivresAtivas,
  useConcluirEntradaLivre,
  useCancelarEntradaLivre,
  useAtualizarPagamentoEntradaLivre,
} from "@/hooks/use-entrada-livre";
import EntradaLivreForm from "./EntradaLivreForm";
import EntradaLivreDetailModal from "./EntradaLivreDetailModal";
import EntradaLivrePagamentoModal from "./EntradaLivrePagamentoModal";
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

  const [confirmConcluir, setConfirmConcluir] = useState<EntradaLivre | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<EntradaLivre | null>(null);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);
  const [pagamentoEntrada, setPagamentoEntrada] = useState<EntradaLivre | null>(null);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  const handleConcluir = useCallback(
    async (custoExcesso?: number) => {
      if (!confirmConcluir) return;
      await concluir.mutateAsync({ id: confirmConcluir.id, custoExcesso });
      setConfirmConcluir(null);
    },
    [concluir, confirmConcluir]
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
          onPagamento={setPagamentoEntrada}
          pagamentoPending={atualizarPagamento.isPending}
        />
      </div>

      {/* Concluir Resumo Modal */}
      {confirmConcluir && (
        <ConcluirResumoModal
          isOpen={!!confirmConcluir}
          onClose={() => setConfirmConcluir(null)}
          onConfirm={handleConcluir}
          isConfirming={concluir.isPending}
          titulo="Concluir Entrada"
          entidadeNome={confirmConcluir.criancas?.[0]?.nome ?? confirmConcluir.encarregadoNome}
          inicioEm={confirmConcluir.inicioEm}
          fimPrevisto={confirmConcluir.fimPrevisto}
          duracaoMinutos={confirmConcluir.duracaoMinutos}
          custoBase={Number(confirmConcluir.custoTotal ?? 0)}
          notas={{
            cacifos: confirmConcluir.observacoes,
            lesoes: confirmConcluir.observacoesLesoes,
          }}
        />
      )}

      {/* Confirm Cancelar */}
      <ConfirmActionModal
        isOpen={!!confirmCancelar}
        onClose={() => setConfirmCancelar(null)}
        onConfirm={() => handleCancelar(confirmCancelar!)}
        title="Cancelar Entrada"
        message="Tem a certeza que deseja cancelar esta entrada?"
        confirmText="Cancelar"
        variant="warning"
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

      {/* Pagamento Modal */}
      {pagamentoEntrada && (
        <EntradaLivrePagamentoModal
          entrada={pagamentoEntrada}
          onClose={() => setPagamentoEntrada(null)}
        />
      )}
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
  onPagamento,
  pagamentoPending,
}: {
  entradas?: EntradaLivre[];
  isLoading: boolean;
  onConcluir: (entrada: EntradaLivre) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (entrada: EntradaLivre) => void;
  onPagamento: (entrada: EntradaLivre) => void;
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
          onPagamento={onPagamento}
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
  onPagamento,
  pagamentoPending,
}: {
  entrada: EntradaLivre;
  onConcluir: (entrada: EntradaLivre) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (entrada: EntradaLivre) => void;
  onPagamento: (entrada: EntradaLivre) => void;
  pagamentoPending: boolean;
}) {
  const timer = useTimer(entrada.inicioEm, entrada.duracaoMinutos);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

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
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-text-muted shrink-0" />
              <span className="text-sm font-semibold text-text-primary truncate">
                {entrada.criancas.map((c) => c.nome).join(", ")}
              </span>
              <StatusBadge status="ATIVA" />
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
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
          {/* Botão de pagamento rápido — abre modal com acertos */}
          <button
            type="button"
            onClick={() => onPagamento(entrada)}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${
              entrada.pago
                ? "text-accent-green-500 hover:bg-accent-green-50"
                : "text-accent-orange-500 hover:bg-accent-orange-50"
            }`}
            title="Gerir pagamento"
            aria-label="Gerir pagamento"
          >
            <Wallet size={16} />
          </button>
          {/* 3-dots dropdown — acções secundárias */}
          <div className="relative shrink-0">
            <button
              ref={dropdownTriggerRef}
              type="button"
              onClick={() => setIsDropdownOpen((v) => !v)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
              aria-label="Mais acções"
            >
              <MoreVertical size={16} />
            </button>
            <Dropdown
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              usePortal
              triggerRef={dropdownTriggerRef}
            >
              <ul className="flex flex-col">
                <li>
                  <DropdownItem
                    onItemClick={() => { onEdit(entrada); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                  >
                    <Pencil size={14} className="text-text-muted" />
                    Editar
                  </DropdownItem>
                </li>
                {!entrada.pago && (
                  <li>
                    <DropdownItem
                      onItemClick={() => {
                        if (pagamentoPending) return;
                        onMarcarPago(entrada.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${
                        pagamentoPending
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <CreditCard size={14} className="text-text-muted" />
                      Marcar como paga
                    </DropdownItem>
                  </li>
                )}
                <li>
                  <DropdownItem
                    onItemClick={() => { onView(entrada.id); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                  >
                    <Eye size={14} className="text-text-muted" />
                    Ver detalhes
                  </DropdownItem>
                </li>
                <li className="my-1 border-t border-gray-100" />
                <li>
                  <DropdownItem
                    onItemClick={() => { onConcluir(entrada); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-accent-green-700 hover:bg-accent-green-50 rounded-md transition-colors w-full text-left"
                  >
                    <CheckCircle size={14} />
                    Concluir
                  </DropdownItem>
                </li>
                <li className="my-1 border-t border-gray-100" />
                <li>
                  <DropdownItem
                    onItemClick={() => { onCancelar(entrada.id); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-accent-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left"
                  >
                    <XCircle size={14} />
                    Cancelar
                  </DropdownItem>
                </li>
              </ul>
            </Dropdown>
          </div>
        </div>

        {/* Avisos aos pais — observações e lesões/alergias */}
        {(entrada.observacoes?.trim() || entrada.observacoesLesoes?.trim()) && (
          <div className="space-y-1.5 mb-3">
            {entrada.observacoes?.trim() && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-orange-50 border border-accent-orange-200">
                <AlertTriangle size={13} className="text-accent-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                  {entrada.observacoes}
                </p>
              </div>
            )}
            {entrada.observacoesLesoes?.trim() && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-red-50 border border-accent-red-200">
                <AlertTriangle size={13} className="text-accent-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                  <span className="font-medium">Lesões/Alergias:</span> {entrada.observacoesLesoes}
                </p>
              </div>
            )}
          </div>
        )}

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

        {/* Actions — quick buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onView(entrada.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Eye size={13} /> Ver detalhes
          </button>
          <button
            onClick={() => onConcluir(entrada)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-green-600 hover:bg-accent-green-50 rounded-lg transition-colors ml-auto"
          >
            <CheckCircle size={13} /> Concluir
          </button>
        </div>
      </div>
    </div>
  );
}