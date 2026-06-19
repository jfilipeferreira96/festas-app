"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Timer,
  AlertTriangle,
  Euro,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useConfigPreco } from "@/hooks/use-precos";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const euro = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDuration(minutos: number): string {
  if (minutos <= 0) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface ConcluirResumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (custoExcesso?: number) => void;
  isConfirming?: boolean;

  /** Modal title, e.g. "Finalizar Festa" or "Concluir Entrada" */
  titulo: string;
  /** Entity name — aniversariante (festa) or first criança (entrada livre) */
  entidadeNome: string;
  /** Local / sala name */
  localNome?: string;

  /** ISO string — when the festa/entrada started */
  inicioEm?: string;
  /** ISO string — planned end time */
  fimPrevisto?: string;
  /** Planned duration in minutes */
  duracaoMinutos: number;

  /** Base cost already paid (valorPago for festa, custoTotal for entrada) */
  custoBase: number;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ConcluirResumoModal({
  isOpen,
  onClose,
  onConfirm,
  isConfirming = false,
  titulo,
  entidadeNome,
  localNome,
  inicioEm,
  fimPrevisto,
  duracaoMinutos,
  custoBase,
}: ConcluirResumoModalProps) {
  const { data: configPreco } = useConfigPreco();
  const precoExcessoFixo = configPreco
    ? Number(configPreco.precoExcessoFixo)
    : 5;

  // Tick every 30s to keep elapsed time fresh
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // ── Time calculations ──────────────────────
  const { tempoDecorridoMin, excessoMinutos } = useMemo(() => {
    if (!inicioEm) return { tempoDecorridoMin: 0, excessoMinutos: 0 };
    const inicio = new Date(inicioEm).getTime();
    const elapsedMs = now - inicio;
    const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60_000));
    const excesso = Math.max(0, elapsedMin - duracaoMinutos);
    return { tempoDecorridoMin: elapsedMin, excessoMinutos: excesso };
  }, [inicioEm, now, duracaoMinutos]);

  const hasExcesso = excessoMinutos > 0;

  // ── Excess cost state ──────────────────────
  const [cobrarExcesso, setCobrarExcesso] = useState(true);
  const [custoExcessoInput, setCustoExcessoInput] = useState("");

  // Sync default when modal opens or config loads
  useEffect(() => {
    if (isOpen) {
      setCobrarExcesso(hasExcesso);
      setCustoExcessoInput(String(precoExcessoFixo.toFixed(2)));
    }
  }, [isOpen, hasExcesso, precoExcessoFixo]);

  const custoExcesso = useMemo(() => {
    const parsed = parseFloat(custoExcessoInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [custoExcessoInput]);

  const custoExcessoFinal = hasExcesso && cobrarExcesso ? custoExcesso : 0;
  const custoTotal = custoBase + custoExcessoFinal;

  const handleConfirm = useCallback(() => {
    if (hasExcesso && cobrarExcesso) {
      onConfirm(custoExcesso);
    } else {
      onConfirm(undefined);
    }
  }, [hasExcesso, cobrarExcesso, custoExcesso, onConfirm]);

  // ── Render ─────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-accent-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-accent-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary font-poppins">
              {titulo}
            </h2>
            <p className="text-xs text-text-muted">
              Revise o resumo antes de concluir
            </p>
          </div>
        </div>

        {/* Entity info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-5 text-sm">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <User className="w-4 h-4 text-text-muted" />
            {entidadeNome}
          </span>
          {localNome && (
            <span className="flex items-center gap-1.5 text-text-secondary">
              <MapPin className="w-4 h-4 text-text-muted" />
              {localNome}
            </span>
          )}
        </div>

        {/* Time summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <Clock className="w-4 h-4 text-text-muted mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">
              Início
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {formatTime(inicioEm)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <Calendar className="w-4 h-4 text-text-muted mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">
              Fim previsto
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {formatTime(fimPrevisto)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <Timer className="w-4 h-4 text-text-muted mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">
              Decorrido
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {formatDuration(tempoDecorridoMin)}
            </p>
          </div>
        </div>

        {/* Excess warning */}
        {hasExcesso && (
          <div className="rounded-xl border border-accent-orange-200 bg-accent-orange-50 dark:border-accent-orange-800 dark:bg-accent-orange-900/20 p-4 mb-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-accent-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-accent-orange-800 dark:text-accent-orange-300">
                  Excesso de {formatDuration(excessoMinutos)}
                </p>
                <p className="text-xs text-accent-orange-700 dark:text-accent-orange-400 mt-0.5">
                  A duração prevista era de {formatDuration(duracaoMinutos)}.
                </p>

                {/* Charge toggle */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cobrarExcesso}
                    onChange={(e) => setCobrarExcesso(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-text-primary">
                    Cobrar excesso de tempo
                  </span>
                </label>

                {/* Editable excess cost */}
                {cobrarExcesso && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={custoExcessoInput}
                        onChange={(e) => setCustoExcessoInput(e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-surface px-3 pr-7 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">
                        €
                      </span>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      Sugestão: {euro.format(precoExcessoFixo)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cost breakdown */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
          {/* Title inside the card */}
          <div className="px-4 py-2.5 border-b border-border bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Resumo do Pagamento
            </p>
          </div>

          <div className="p-4 space-y-2">
            {/* Base cost */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Valor base</span>
              <span className="font-medium text-text-primary">
                {euro.format(custoBase)}
              </span>
            </div>

            {/* Excess cost */}
            {custoExcessoFinal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-accent-orange-600 dark:text-accent-orange-400">
                  Excesso ({formatDuration(excessoMinutos)})
                </span>
                <span className="font-medium text-accent-orange-600 dark:text-accent-orange-400">
                  + {euro.format(custoExcessoFinal)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">
                  Total a cobrar
                </span>
                <span className="text-lg font-bold text-text-primary font-poppins">
                  {euro.format(custoTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary rounded-lg border border-border bg-surface hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-accent-green-500 hover:bg-accent-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              "A concluir..."
            ) : (
              <>
                <Euro className="w-4 h-4" />
                Concluir
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
