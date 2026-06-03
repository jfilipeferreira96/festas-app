"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Clock,
  Users,
  Timer,
  AlertTriangle,
  Plus,
  Eye,
  CheckCircle,
  CreditCard,
  Package,
  Phone,
} from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import {
  useEntradasLivres,
  useAtualizarPagamentoEntradaLivre,
} from "@/hooks/use-entrada-livre";
import EntradaLivreForm from "./EntradaLivreForm";
import EntradaLivreDetailModal from "./EntradaLivreDetailModal";
import type { EntradaLivre, Crianca } from "@/lib/api/entradaLivre";

// ── Filter options for tabs ──────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "ATIVA", label: "Em Curso" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "CANCELADA", label: "Canceladas" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  };
}

// ── Main Component ──────────────────────────────────────────────
export default function EntradasAtivasContent() {
  const [filtro, setFiltro] = useState("ATIVA");
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  const [showForm, setShowForm] = useState(false);
  const [viewingEntradaId, setViewingEntradaId] = useState<string | null>(null);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  // Build filter params from active tab
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

  // Use refetchInterval for ATIVA tab to keep real-time updates
  const isAtivaTab = filtro === "ATIVA";

  const { data: entradas, isLoading } = useEntradasLivres(filtros, {
    refetchInterval: isAtivaTab ? 30000 : false,
  });

  const handleMarcarPago = useCallback(
    async (id: string) => {
      await atualizarPagamento.mutateAsync({ id, data: { pago: true } });
    },
    [atualizarPagamento]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
  }, []);

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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs mt-4 mb-6 overflow-x-auto filter-scrollbar max-w-full">
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

      {/* Tab Content */}
      {isAtivaTab ? (
        <EmCursoTab
          entradas={entradas}
          isLoading={isLoading}
          onMarcarPago={handleMarcarPago}
          onView={setViewingEntradaId}
          pagamentoPending={atualizarPagamento.isPending}
        />
      ) : (
        <ListaTab
          entradas={entradas}
          isLoading={isLoading}
          onView={setViewingEntradaId}
        />
      )}

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
    </div>
  );
}

// ── Em Curso Tab (Cards) ───────────────────────────────────────
function EmCursoTab({
  entradas,
  isLoading,
  onMarcarPago,
  onView,
  pagamentoPending,
}: {
  entradas?: EntradaLivre[];
  isLoading: boolean;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
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
          onMarcarPago={onMarcarPago}
          onView={onView}
          pagamentoPending={pagamentoPending}
        />
      ))}
    </div>
  );
}

// ── Lista Tab (non-ATIVA filters: Todas, Hoje, Semana, Concluídas, Canceladas) ──
function ListaTab({
  entradas,
  isLoading,
  onView,
}: {
  entradas?: EntradaLivre[];
  isLoading: boolean;
  onView: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!entradas || entradas.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-theme-xs border border-border text-center">
        <Clock size={48} className="mx-auto text-text-muted mb-3" />
        <p className="text-sm text-text-muted">
          Nenhum registo encontrado para este filtro.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-theme-xs border border-border overflow-hidden">
      {entradas.map((entrada) => {
        const isConcluida = entrada.estado === "CONCLUIDA";
        const isCancelada = entrada.estado === "CANCELADA";
        const isAtiva = entrada.estado === "ATIVA";

        const duracaoReal = entrada.inicioEm && entrada.fimReal
          ? Math.round((new Date(entrada.fimReal).getTime() - new Date(entrada.inicioEm).getTime()) / 60000)
          : null;

        const statusIcon = isConcluida
          ? <CheckCircle size={18} className="text-accent-green-500" />
          : isCancelada
            ? <Clock size={18} className="text-accent-red-500" />
            : <Clock size={18} className="text-brand-500" />;

        const statusBg = isConcluida
          ? "bg-accent-green-100"
          : isCancelada
            ? "bg-accent-red-100"
            : "bg-brand-100";

        return (
          <div
            key={entrada.id}
            className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${statusBg} flex items-center justify-center`}>
                {statusIcon}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {entrada.criancas.map((c: Crianca) => c.nome).join(", ")}
                </p>
                <p className="text-xs text-text-muted">
                  {entrada.local?.nome ?? "—"} · {formatDate(entrada.inicioEm)} {formatTime(entrada.inicioEm)}
                  {duracaoReal ? ` · ${duracaoReal} min` : ` · ${entrada.duracaoMinutos} min`}
                  {entrada.excessoMinutos != null && entrada.excessoMinutos > 0 ? ` · +${entrada.excessoMinutos} min excesso` : ""}
                  {entrada.cacifo ? ` · Cacifo #${entrada.cacifo.numero}` : ""}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {entrada.encarregadoNome}
                  {entrada.encarregadoTelefone ? ` (${entrada.encarregadoTelefone})` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAtiva && !entrada.pago && (
                <span className="text-xs font-medium text-accent-orange-600">Por pagar</span>
              )}
              {isAtiva && entrada.pago && (
                <span className="text-xs font-medium text-accent-green-600">Pago</span>
              )}
              <Button
                onClick={() => onView(entrada.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Eye size={13} />
                <span>Ver</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Entrada Ativa Card ─────────────────────────────────────────
function EntradaAtivaCard({
  entrada,
  onMarcarPago,
  onView,
  pagamentoPending,
}: {
  entrada: EntradaLivre;
  onMarcarPago: (id: string) => void;
  onView: (id: string) => void;
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
                {entrada.criancas.map((c: Crianca) => c.nome).join(", ")}
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

        {/* Actions — only Ver + Pagar */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onView(entrada.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Eye size={13} /> Ver
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
        </div>
      </div>
    </div>
  );
}
