"use client";

import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  PartyPopper,
  Clock,
  SquareCheck,
  AlertTriangle,
  Users,
  Timer,
  Package,
  Printer,
  Wallet,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Sparkles,
  Utensils,
  Phone,
  Cake,
  CreditCard,
  Shield,
  Gift,
  Star,
  Eye,
  Trash2,
  Pencil,
  Check,
  Plus,
  MoreVertical,
} from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import ConcluirResumoModal from "@/components/shared/ConcluirResumoModal";
import { useReservasAtivas, useFinalizarReserva, useToggleEtapa, useRemoverEtapa, useMarcarEtapasConcluidas } from "@/hooks/use-reservas";
import { useDashboardKPIs } from "@/hooks/use-dashboard";
import { useCacifos } from "@/hooks/use-cacifos";
import FestaForm from "./FestaForm";
import FestaDetailModal from "./FestaDetailModal";
import PagamentoModal from "./PagamentoModal";
import type { Reserva } from "@/lib/api/reservas";
import { getAniversarianteNome, getAniversarianteNomes } from "@/lib/api/reservas";
import { imprimirListaConvidados } from "@/utils/print-lista";
import type { EstadoCacifo } from "@/lib/api/cacifos";
import type { StatusType } from "@/components/ui";

export default function FestasContent() {
  const { data: festas, isLoading } = useReservasAtivas();
  const { data: kpis } = useDashboardKPIs();
  const finalizarFesta = useFinalizarReserva();

  const [confirmFinalizar, setConfirmFinalizar] = useState<Reserva | null>(null);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingReservaId, setViewingReservaId] = useState<string | null>(null);
  const [pagamentoReserva, setPagamentoReserva] = useState<Reserva | null>(null);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingReserva(null);
  }, []);

  const handleFinalizar = useCallback(
    async (custoExcesso?: number) => {
      if (!confirmFinalizar) return;
      await finalizarFesta.mutateAsync({ id: confirmFinalizar.id, custoExcesso });
      setConfirmFinalizar(null);
    },
    [finalizarFesta, confirmFinalizar]
  );

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  return (
    <div>
     <PageHeader
        title="Festas"
        subtitle={`Acompanhe em tempo real — ${todayStr}`}
      />

      {/* KPI: Crianças no parque (em festas + entradas livres). Exclui canceladas. */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-card">
          <div className="w-10 h-10 rounded-full bg-accent-teal-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent-teal-600" />
          </div>
          <div>
            <p className="text-[11px] text-text-muted leading-tight">Crianças em festas</p>
            <p className="text-xl font-bold text-text-primary font-poppins leading-tight">
              {kpis?.criancasFestas ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-card">
          <div className="w-10 h-10 rounded-full bg-accent-orange-100 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-accent-orange-600" />
          </div>
          <div>
            <p className="text-[11px] text-text-muted leading-tight">Total no parque</p>
            <p className="text-xl font-bold text-text-primary font-poppins leading-tight">
              {kpis?.totalCriancasNoParque ?? "—"}
              <span className="text-xs font-normal text-text-muted ml-1">crianças</span>
            </p>
          </div>
        </div>
      </div>

      {/* Festas Em Curso */}
      <div className="mt-6">
      <EmCursoTab
        festas={festas}
        isLoading={isLoading}
        onFinalizar={(reserva) => setConfirmFinalizar(reserva)}
        onEdit={(reserva) => {
          setEditingReserva(reserva);
          setShowForm(true);
        }}
        onView={(reserva) => setViewingReservaId(reserva.id)}
        onPagamento={(reserva) => setPagamentoReserva(reserva)}
      />
      </div>

      {/* Concluir Resumo Modal */}
      {confirmFinalizar && (
        <ConcluirResumoModal
          isOpen={!!confirmFinalizar}
          onClose={() => setConfirmFinalizar(null)}
          onConfirm={handleFinalizar}
          isConfirming={finalizarFesta.isPending}
          titulo="Finalizar Festa"
          entidadeNome={getAniversarianteNome(confirmFinalizar)}
          localNome={confirmFinalizar.local?.nome}
          inicioEm={confirmFinalizar.inicioEm}
          fimPrevisto={confirmFinalizar.fimPrevisto}
          duracaoMinutos={confirmFinalizar.duracaoMinutos}
          custoBase={Number(confirmFinalizar.valorPago ?? 0)}
          notas={{
            cacifos: confirmFinalizar.notasCacifos,
            lesoes: confirmFinalizar.observacoesLesoes,
            itens: (confirmFinalizar.cacifos ?? [])
              .filter((c) => c.notas?.trim())
              .map((c) => ({ numero: c.numero, notas: c.notas!.trim() })),
          }}
        />
      )}

      {/* Edit Reserva Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={handleFormClose} size="2xl">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {editingReserva ? "Editar Festa" : "Nova Festa"}
            </h2>
            <FestaForm reserva={editingReserva} onClose={handleFormClose} />
          </div>
        </Modal>
      )}

      {/* Detail Modal — shared self-contained modal */}
      <FestaDetailModal
        reservaId={viewingReservaId}
        onClose={() => setViewingReservaId(null)}
      />

      {/* Pagamento Modal */}
      {pagamentoReserva && (
        <PagamentoModal reserva={pagamentoReserva} onClose={() => setPagamentoReserva(null)} />
      )}
    </div>
  );
}

// ── Em Curso Tab ──────────────────────────────────────────────
function EmCursoTab({
  festas,
  isLoading,
  onFinalizar,
  onEdit,
  onView,
  onPagamento,
}: {
  festas?: Reserva[];
  isLoading: boolean;
  onFinalizar: (reserva: Reserva) => void;
  onEdit: (reserva: Reserva) => void;
  onView: (reserva: Reserva) => void;
  onPagamento: (reserva: Reserva) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-[14px] p-5 shadow-card border border-border animate-pulse"
          >
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!festas || festas.length === 0) {
    return (
      <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
        <PartyPopper size={48} className="mx-auto text-text-muted mb-3" />
        <p className="text-sm text-text-muted">
          Não há festas em curso neste momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {festas.map((festa) => (
        <FestaCard
          key={festa.id}
          festa={festa}
          onFinalizar={() => onFinalizar(festa)}
          onEdit={() => onEdit(festa)}
          onView={() => onView(festa)}
          onPagamento={() => onPagamento(festa)}
        />
      ))}
    </div>
  );
}

// ── Festa Card Component ──────────────────────────────────────
function FestaCard({
  festa,
  onFinalizar,
  onEdit,
  onView,
  onPagamento,
}: {
  festa: Reserva;
  onFinalizar: () => void;
  onEdit?: () => void;
  onView: () => void;
  onPagamento: () => void;
}) {
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [isWaitingStart, setIsWaitingStart] = useState(false);
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [isLancheAtrasado, setIsLancheAtrasado] = useState(false);
  const [showCacifos, setShowCacifos] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

  const toggleEtapa = useToggleEtapa();
  const removerEtapa = useRemoverEtapa();
  const marcarTodas = useMarcarEtapasConcluidas();
  const toggleEtapaPending = toggleEtapa.isPending;

  // Obter cacifos da festa
  const { data: cacifos } = useCacifos(
    showCacifos ? { reservaId: festa.id } : undefined
  );

  React.useEffect(() => {
    if (!festa.inicioEm || !festa.fimPrevisto) return;

    const updateTimers = () => {
      const now = new Date();
      const inicio = new Date(festa.inicioEm!);
      const fim = new Date(festa.fimPrevisto!);

      const elapsedMs = now.getTime() - inicio.getTime();
      const remainingMs = fim.getTime() - now.getTime();
      const totalDuration = fim.getTime() - inicio.getTime();

      // Pré-início: a festa ainda nem começou (estado EM_CURSO mas horário futuro)
      if (elapsedMs < 0) {
        setIsWaitingStart(true);
        setIsOverdue(false);
        setElapsed("00:00:00");
        setProgress(0);
        // Countdown até ao início
        const untilStartMs = Math.abs(elapsedMs);
        const untilH = Math.floor(untilStartMs / 3600000);
        const untilM = Math.floor((untilStartMs % 3600000) / 60000);
        const untilS = Math.floor((untilStartMs % 60000) / 1000);
        setRemaining(
          `${untilH.toString().padStart(2, "0")}:${untilM.toString().padStart(2, "0")}:${untilS.toString().padStart(2, "0")}`
        );
        return;
      }

      // Em curso normal ou ultrapassou
      setIsWaitingStart(false);

      const elapsedH = Math.floor(elapsedMs / 3600000);
      const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
      const elapsedS = Math.floor((elapsedMs % 60000) / 1000);
      setElapsed(
        `${elapsedH.toString().padStart(2, "0")}:${elapsedM.toString().padStart(2, "0")}:${elapsedS.toString().padStart(2, "0")}`
      );

      // Alerta suave: festa a acabar (≤15 min restantes, ainda não ultrapassou)
      setIsEndingSoon(remainingMs > 0 && remainingMs <= 15 * 60_000);

      // Alerta suave: lanche atrasado (hora passou e ainda NAO_INICIADO)
      if (festa.horaLanche && festa.estadoLanche === "NAO_INICIADO") {
        const [lh, lm] = festa.horaLanche.split(":").map(Number);
        const lancheMs = new Date(now).setHours(lh, lm, 0, 0);
        setIsLancheAtrasado(now.getTime() >= lancheMs);
      } else {
        setIsLancheAtrasado(false);
      }

      if (remainingMs <= 0) {
        setIsOverdue(true);
        const overMs = Math.abs(remainingMs);
        const overM = Math.floor(overMs / 60000);
        setRemaining(`+${overM} min`);
      } else {
        setIsOverdue(false);
        const remH = Math.floor(remainingMs / 3600000);
        const remM = Math.floor((remainingMs % 3600000) / 60000);
        const remS = Math.floor((remainingMs % 60000) / 1000);
        setRemaining(
          `${remH.toString().padStart(2, "0")}:${remM.toString().padStart(2, "0")}:${remS.toString().padStart(2, "0")}`
        );
      }

      const pct = Math.min(100, Math.max(0, (elapsedMs / totalDuration) * 100));
      setProgress(pct);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [festa.inicioEm, festa.fimPrevisto]);

  const monitorNomes = useMemo(
    () => festa.monitores?.map((m) => m.monitor.nome).join(", ") || "Sem monitor",
    [festa.monitores]
  );

  const handleImprimir = useCallback(() => {
    imprimirListaConvidados(festa, festa.cacifos ?? []);
    setIsDropdownOpen(false);
  }, [festa]);

  return (
    <div
     className={`bg-surface rounded-[14px] shadow-card border overflow-hidden ${
       isOverdue ? "border-accent-red-400" : isWaitingStart ? "border-primary-300" : "border-border"
     } ${isEndingSoon ? "animate-alerta-piscar" : ""}`}
   >
     {/* Color bar — cor da festa para identificação das pulseiras */}
     {festa.cor && (
       <div className="h-3" style={{ backgroundColor: festa.cor }} />
     )}

     {/* Header */}
     <div className="p-4 border-b border-border">
       <div className="flex items-start justify-between gap-3 mb-1">
         <div className="flex items-center gap-2 min-w-0 flex-1">
           {/* Chip de cor com código (para entrega de pulseiras) */}
           {festa.cor && (
             <span
               className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
               style={{ backgroundColor: `${festa.cor}1A`, color: festa.cor }}
               title="Cor da festa"
             >
               <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: festa.cor }} />
               {festa.cor.toUpperCase()}
             </span>
           )}
           <h3 className="text-sm font-semibold text-text-primary truncate">
             {getAniversarianteNome(festa)}
           </h3>
           <StatusBadge status={isOverdue ? "INSUFICIENTE" : isWaitingStart ? ("RESERVA" as StatusType) : ("EM_CURSO" as StatusType)}>
             {isOverdue ? "Ultrapassou" : isWaitingStart ? "Aguarda início" : "Em curso"}
           </StatusBadge>
           {isEndingSoon && (
             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-orange-100 text-accent-orange-700 animate-alerta-piscar shrink-0">
               ⚠ A acabar
             </span>
           )}
           {isLancheAtrasado && (
             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-orange-100 text-accent-orange-700 animate-alerta-piscar shrink-0">
               🍽 Lanche atrasado
             </span>
           )}
         </div>
          {/* Botão de impressão rápido — visível directamente no card */}
          <button
            type="button"
            onClick={handleImprimir}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:bg-brand-50 hover:text-brand-600 transition-colors shrink-0"
            title="Imprimir lista de crianças"
            aria-label="Imprimir lista de crianças"
          >
            <Printer size={16} />
          </button>
          {/* Botão de pagamento rápido — visível directamente no card */}
          <button
            type="button"
            onClick={onPagamento}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 ${festa.pago ? "text-accent-green-500 hover:bg-accent-green-50" : "text-accent-orange-500 hover:bg-accent-orange-50"}`}
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
                {onEdit && (
                  <li>
                    <DropdownItem
                      onItemClick={() => { onEdit(); setIsDropdownOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                    >
                      <Pencil size={14} className="text-text-muted" />
                      Editar
                    </DropdownItem>
                  </li>
                )}
                <li>
                  <DropdownItem
                    onItemClick={() => { onPagamento(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                  >
                    <Wallet size={14} className="text-text-muted" />
                    Gerir pagamento
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem
                    onItemClick={() => { onView(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                  >
                    <Eye size={14} className="text-text-muted" />
                    Ver tudo
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem
                    onItemClick={handleImprimir}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                  >
                    <Printer size={14} className="text-text-muted" />
                    Imprimir Lista
                  </DropdownItem>
                </li>
                <li className="my-1 border-t border-gray-100" />
                <li>
                  <DropdownItem
                    onItemClick={() => { onFinalizar(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-accent-green-700 hover:bg-accent-green-50 rounded-md transition-colors w-full text-left"
                  >
                    <CheckCircle size={14} />
                    Finalizar
                  </DropdownItem>
                </li>
              </ul>
            </Dropdown>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
          <span>{festa.local?.nome ?? "—"}</span>
          <span>·</span>
          <span>{festa.horario}</span>
          <span>·</span>
          <span>{festa.duracaoMinutos} min</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5 flex-wrap">
          <span>{(festa.cacifos?.filter((c) => c.criancas && c.criancas.trim() && c.criancas !== "Por preencher").length ?? 0)}/{festa.numCriancas ?? 0} cacifos preenchidos</span>
          {festa.cacifosConcluido && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-green-100 text-accent-green-600">
              ✓ Concluído
            </span>
          )}
          {!festa.cacifosConcluido && festa.cacifosChamado && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-orange-100 text-accent-orange-600">
              🔔 Chamado
            </span>
          )}
          {festa.cliente && (
            <>
              <span>·</span>
              <span>{festa.cliente.nome}</span>
            </>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {isWaitingStart ? "Inicia em" : "Tempo decorrido"}
            </p>
            <p className="text-2xl font-bold text-text-primary font-mono">
              {isWaitingStart ? remaining : elapsed}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {isWaitingStart ? "Duração prevista" : "Tempo restante"}
            </p>
            <p
              className={`text-2xl font-bold font-mono ${
                isOverdue ? "text-accent-red-500" : isWaitingStart ? "text-text-secondary" : "text-accent-orange-500"
              }`}
            >
              {isWaitingStart ? `${festa.duracaoMinutos} min` : remaining}
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isOverdue ? "bg-accent-red-500" : isWaitingStart ? "bg-primary-400" : "bg-accent-green-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        {/* Aniversariantes */}
        {festa.aniversariantes && festa.aniversariantes.length > 0 && (
          <div className="flex items-center gap-2">
            <Cake size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">{getAniversarianteNomes(festa)}</span>
          </div>
        )}

        {/* Cliente + Contacto */}
        {festa.cliente && (
          <div className="flex items-center gap-2">
            <Users size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">
              {festa.cliente.nome}
              {festa.cliente.telefone && (
                <span className="text-text-muted ml-1">({festa.cliente.telefone})</span>
              )}
            </span>
          </div>
        )}

        {/* Monitor */}
        <div className="flex items-center gap-2">
          <Star size={14} className="text-text-muted" />
          <span className="text-xs text-text-secondary">{monitorNomes}</span>
        </div>

        {/* Tema */}
        {festa.tema && (
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">{festa.tema}</span>
          </div>
        )}

        {/* Bolo */}
        {festa.bolo && (
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">{festa.bolo}</span>
          </div>
        )}

        {/* Menu */}
        {festa.menu && (
          <div className="flex items-center gap-2">
            <Utensils size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">
              {festa.menu.nome}
              {festa.menu.preco != null && (
                <span className="text-text-muted ml-1">
                  ({new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(festa.menu.preco)})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Extras */}
        {festa.extras && festa.extras.length > 0 && (
          <div className="flex items-center gap-2">
            <Package size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">
              {festa.extras.map((e) => `${e.extra.nome}${e.quantidade > 1 ? ` ×${e.quantidade}` : ""}`).join(", ")}
            </span>
          </div>
        )}

        {/* Pagamento — clicável para abrir PagamentoModal */}
        <button
          type="button"
          onClick={onPagamento}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
          title="Gerir pagamento"
        >
          <CreditCard size={14} className={`shrink-0 ${festa.pago ? "text-accent-green-500" : "text-accent-orange-500"}`} />
          <span className="text-xs text-text-secondary">
            {festa.pago ? (
              <span className="text-primary-500">Pago</span>
            ) : (
              <span className="text-accent-orange">Por pagar</span>
            )}
            {festa.valorPago != null && (
              <span className="text-text-muted ml-1">
                · {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(festa.valorPago)}
              </span>
            )}
            {festa.metodoPagamento && (
              <span className="text-text-muted ml-1">
                · {metodoPagamentoLabel(festa.metodoPagamento)}
              </span>
            )}
          </span>
        </button>

        {/* Caução */}
        {(festa.caucao === "PAGA" || festa.caucao === "PAGA_NO_DIA") && (
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-text-muted" />
            <span className="text-xs text-text-secondary">
              Caução {festa.caucao === "PAGA" ? "paga" : "paga no dia"}
            </span>
          </div>
        )}

        {/* Notas */}
        {festa.notas && (
          <div className="mt-1 p-2 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Notas</p>
            <p className="text-xs text-text-secondary">{festa.notas}</p>
          </div>
        )}

        {(festa.notasCacifos || (festa.cacifos ?? []).some((c) => c.notas?.trim())) && (
          <div className="mt-1 p-2 rounded-lg bg-accent-orange-50 border border-accent-orange-200">
            <p className="text-[10px] font-semibold text-accent-orange-700 uppercase tracking-wider mb-0.5">
              📝 Notas Cacifos
            </p>
            {festa.notasCacifos && (
              <p className="text-xs text-text-secondary whitespace-pre-wrap">{festa.notasCacifos}</p>
            )}
            {(festa.cacifos ?? [])
              .filter((c) => c.notas?.trim())
              .map((c) => (
                <p key={c.id} className="text-xs text-text-secondary">
                  <span className="font-medium">Cacifo {c.numero}:</span> {c.notas}
                </p>
              ))}
          </div>
        )}

        {festa.observacoesLesoes && (
          <div className="mt-1 p-2 rounded-lg bg-accent-red-50 border border-accent-red-200">
            <p className="text-[10px] font-semibold text-accent-red-700 uppercase tracking-wider mb-0.5">
              🩹 Lesões / Alergias
            </p>
            <p className="text-xs text-text-secondary whitespace-pre-wrap">{festa.observacoesLesoes}</p>
          </div>
        )}

        {/* Etapas — oculto per pedido do cliente (12/07/2026)
            O bloco etapas foi removido da UI. Mantém-se comentado para referência.
        {festa.etapas && festa.etapas.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Etapas</span>
              <button
                type="button"
                onClick={() => marcarTodas.mutate(festa.id)}
                disabled={festa.etapas.every((e) => e.concluida) || marcarTodas.isPending}
                className="flex items-center gap-1 text-[10px] text-primary-500 hover:bg-primary-50 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
              >
                <SquareCheck size={11} />
                Marcar todas
              </button>
            </div>
            {festa.etapas.map((etapa) => (
              <div
                key={etapa.id}
                className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-1 py-0.5 -mx-1 transition-all duration-200"
              >
                <Tooltip
                  content={etapa.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                  position="top"
                  theme="dark"
                >
                  <button
                    type="button"
                    onClick={() => toggleEtapa.mutate({ id: festa.id, etapaId: etapa.etapa.id })}
                    disabled={toggleEtapaPending}
                    className="flex items-center gap-2 flex-1 text-left disabled:opacity-50 group"
                  >
                    <span className={`shrink-0 transition-all duration-300 ${etapa.concluida ? "scale-110" : "scale-100 group-hover:scale-105"}`}>
                      {etapa.concluida ? (
                        <CheckCircle size={14} className="text-brand-500" />
                      ) : (
                        <XCircle size={14} className="text-text-muted" />
                      )}
                    </span>
                    <span className={`text-xs transition-colors duration-200 ${etapa.concluida ? "text-brand-500" : "text-text-secondary"}`}>
                      {etapa.etapa?.nome ?? "Etapa"}
                    </span>
                  </button>
                </Tooltip>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 transition-all duration-300 ${
                    etapa.concluida
                      ? "bg-brand-50 text-brand-500"
                      : "bg-gray-100 text-text-muted"
                  }`}>
                    {etapa.concluida ? "Concluída ✓" : "Pendente"}
                  </span>
                  <Tooltip content="Remover etapa" position="top" theme="dark">
                    <button
                      type="button"
                      onClick={() => removerEtapa.mutate({ id: festa.id, etapaId: etapa.etapa.id })}
                      disabled={removerEtapa.isPending}
                      className="p-0.5 text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={11} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )} */}
      </div>

      {/* Actions — quick buttons (Cacifos / Crianças / Ver tudo / Finalizar) */}
      <div className="p-4 border-t border-border flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowCacifos(!showCacifos)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
            showCacifos ? "text-primary-500 bg-primary-50" : "text-text-secondary hover:text-primary-500 hover:bg-primary-50"
          }`}
          title="Cacifos"
        >
          <Package size={13} />
          <span>Cacifos</span>
          {showCacifos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button
          onClick={onView}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
          title="Ver tudo"
        >
          <Eye size={13} />
          <span>Ver tudo</span>
        </button>
        <button
          onClick={onFinalizar}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-accent-green-600 hover:bg-accent-green-50 rounded-lg transition-colors ml-auto"
          title="Finalizar"
        >
          <CheckCircle size={13} />
          <span>Finalizar</span>
        </button>
      </div>

      {/* Cacifos Panel */}
      {showCacifos && (
        <div className="p-4 border-t border-border bg-gray-50">
          <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Package size={14} />
            Cacifos da festa ({cacifos?.length ?? 0})
          </h4>
          {cacifos && cacifos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {cacifos.map((cacifo) => (
                <div
                  key={cacifo.id}
                  className={`rounded-lg p-2 text-xs transition-all shadow-sm ${
                    cacifo.estado === "LIVRE" as EstadoCacifo
                      ? "bg-accent-green-400 text-white"
                      : cacifo.estado === "OCUPADO" as EstadoCacifo
                      ? "bg-accent-red-400 text-white"
                      : cacifo.estado === "RESERVADO" as EstadoCacifo
                      ? "bg-brand-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <div className="font-bold text-center">{cacifo.numero}</div>
                  {cacifo.criancas && (
                    <div className="text-[10px] mt-0.5 opacity-90 truncate text-center" title={cacifo.criancas}>
                      {cacifo.criancas}
                    </div>
                  )}
                  {cacifo.notas && (
                    <div className="text-[10px] mt-0.5 opacity-75 truncate text-center" title={cacifo.notas}>
                      📝 {cacifo.notas}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">
              Nenhum cacifo atribuído a esta festa.
            </p>
          )}
        </div>
      )}

    </div>
  );
}