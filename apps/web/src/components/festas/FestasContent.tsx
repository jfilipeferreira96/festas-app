"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  PartyPopper,
  Clock,
  SquareCheck,
  AlertTriangle,
  Users,
  Timer,
  Package,
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
  UserCheck,
  UserX,
  Check,
  Plus,
} from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { useReservasAtivas, useFinalizarReserva, useToggleEtapa, useRemoverEtapa, useMarcarEtapasConcluidas } from "@/hooks/use-reservas";
import { useCacifos } from "@/hooks/use-cacifos";
import { useParticipantes, useConfirmarPresenca, useAdicionarParticipante } from "@/hooks/use-participantes";
import FestaForm from "./FestaForm";
import FestaDetailModal from "./FestaDetailModal";
import type { Reserva } from "@/lib/api/reservas";
import { getAniversarianteNome, getAniversarianteNomes } from "@/lib/api/reservas";
import type { EstadoCacifo } from "@/lib/api/cacifos";
import type { StatusType } from "@/components/ui";

export default function FestasContent() {
  const { data: festas, isLoading } = useReservasAtivas();
  const finalizarFesta = useFinalizarReserva();

  const [confirmFinalizar, setConfirmFinalizar] = useState<string | null>(null);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingReservaId, setViewingReservaId] = useState<string | null>(null);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingReserva(null);
  }, []);

  const handleFinalizar = useCallback(
    async (id: string) => {
      await finalizarFesta.mutateAsync(id);
      setConfirmFinalizar(null);
    },
    [finalizarFesta]
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

      {/* Festas Em Curso */}
      <div className="mt-6">
      <EmCursoTab
        festas={festas}
        isLoading={isLoading}
        onFinalizar={setConfirmFinalizar}
        onEdit={(reserva) => {
          setEditingReserva(reserva);
          setShowForm(true);
        }}
        onView={(reserva) => setViewingReservaId(reserva.id)}
      />
      </div>

      {/* Confirm Finalize Modal */}
      <ConfirmActionModal
        isOpen={!!confirmFinalizar}
        onClose={() => setConfirmFinalizar(null)}
        onConfirm={() => handleFinalizar(confirmFinalizar!)}
        title="Finalizar Festa"
        message="Tem a certeza que deseja finalizar esta festa? Esta acção é irreversível."
        confirmText="Finalizar"
        variant="danger"
        isConfirming={finalizarFesta.isPending}
      />

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
}: {
  festas?: Reserva[];
  isLoading: boolean;
  onFinalizar: (id: string) => void;
  onEdit: (reserva: Reserva) => void;
  onView: (reserva: Reserva) => void;
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
          onFinalizar={() => onFinalizar(festa.id)}
          onEdit={() => onEdit(festa)}
          onView={() => onView(festa)}
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
}: {
  festa: Reserva;
  onFinalizar: () => void;
  onEdit?: () => void;
  onView: () => void;
}) {
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [showCacifos, setShowCacifos] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const toggleEtapa = useToggleEtapa();
  const removerEtapa = useRemoverEtapa();
  const marcarTodas = useMarcarEtapasConcluidas();
  const toggleEtapaPending = toggleEtapa.isPending;

  // Obter cacifos da festa
  const { data: cacifos } = useCacifos(
    showCacifos ? { reservaId: festa.id } : undefined
  );

  // Participantes para check-in inline
  const { data: participantes } = useParticipantes(showCheckIn ? festa.id : "");
  const confirmarPresenca = useConfirmarPresenca(festa.id);
  const adicionarParticipante = useAdicionarParticipante(festa.id);
  const [novoNome, setNovoNome] = useState("");
  const [filtroParticipantes, setFiltroParticipantes] = useState("");

  const participantesFiltrados = React.useMemo(() => {
    if (!participantes) return [];
    if (!filtroParticipantes.trim()) return participantes;
    return participantes.filter(p =>
      p.nome.toLowerCase().includes(filtroParticipantes.toLowerCase())
    );
  }, [participantes, filtroParticipantes]);

  // Reset filter when panel closes
  React.useEffect(() => {
    if (!showCheckIn) {
      setFiltroParticipantes("");
    }
  }, [showCheckIn]);

  React.useEffect(() => {
    if (!festa.inicioEm || !festa.fimPrevisto) return;

    const updateTimers = () => {
      const now = new Date();
      const inicio = new Date(festa.inicioEm!);
      const fim = new Date(festa.fimPrevisto!);

      const elapsedMs = now.getTime() - inicio.getTime();
      const remainingMs = fim.getTime() - now.getTime();

      const elapsedH = Math.floor(elapsedMs / 3600000);
      const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
      const elapsedS = Math.floor((elapsedMs % 60000) / 1000);
      setElapsed(
        `${elapsedH.toString().padStart(2, "0")}:${elapsedM.toString().padStart(2, "0")}:${elapsedS.toString().padStart(2, "0")}`
      );

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

      const totalDuration = fim.getTime() - inicio.getTime();
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

  const handleTogglePresenca = useCallback((participanteId: string, currentState: boolean) => {
    confirmarPresenca.mutate({ participanteId, presenca: !currentState });
  }, [confirmarPresenca]);

  const handleAdicionar = useCallback(() => {
    const nome = novoNome.trim();
    if (!nome) return;
    adicionarParticipante.mutate({ nome }, { onSuccess: () => setNovoNome("") });
  }, [novoNome, adicionarParticipante]);

  const presentes = participantes?.filter(p => p.presente).length ?? 0;
  const total = participantes?.length ?? 0;

  return (
    <div
      className={`bg-surface rounded-[14px] shadow-card border overflow-hidden ${
        isOverdue ? "border-accent-red" : "border-border"
      }`}
    >
      {/* Color bar */}
      {festa.cor && (
        <div className="h-1.5" style={{ backgroundColor: festa.cor }} />
      )}

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">
            {getAniversarianteNome(festa)}
          </h3>
          <StatusBadge status={isOverdue ? "INSUFICIENTE" : ("EM_CURSO" as StatusType)}>
            {isOverdue ? "Ultrapassou" : "Em curso"}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{festa.local?.nome ?? "—"}</span>
          <span>·</span>
          <span>{festa.horario}</span>
          <span>·</span>
          <span>{festa.duracaoMinutos} min</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
          <span>{festa.participantes?.filter((p) => p.presente).length ?? 0}/{festa.numCriancas ?? 0} crianças presentes</span>
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
              Tempo decorrido
            </p>
            <p className="text-2xl font-bold text-text-primary font-mono">
              {elapsed}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              Tempo restante
            </p>
            <p
              className={`text-2xl font-bold font-mono ${
                isOverdue ? "text-accent-red" : "text-accent-orange"
              }`}
            >
              {remaining}
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isOverdue ? "bg-accent-red" : "bg-accent-green"
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

        {/* Pagamento */}
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-text-muted" />
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
                · {festa.metodoPagamento === "DINHEIRO" ? "Dinheiro" : festa.metodoPagamento === "MULTIBANCO" ? "Multibanco" : festa.metodoPagamento === "MBWAY" ? "MB WAY" : festa.metodoPagamento === "TRANSFERENCIA" ? "Transferência" : festa.metodoPagamento === "CARTAO" ? "Cartão" : festa.metodoPagamento}
              </span>
            )}
          </span>
        </div>

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

        {/* Etapas */}
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
                <button
                  type="button"
                  onClick={() => toggleEtapa.mutate({ id: festa.id, etapaId: etapa.etapa.id })}
                  disabled={toggleEtapaPending}
                  className="flex items-center gap-2 flex-1 text-left disabled:opacity-50 group"
                  title={etapa.concluida ? "Marcar como pendente" : "Marcar como concluída"}
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
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 transition-all duration-300 ${
                    etapa.concluida
                      ? "bg-brand-50 text-brand-500"
                      : "bg-gray-100 text-text-muted"
                  }`}>
                    {etapa.concluida ? "Concluída ✓" : "Pendente"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removerEtapa.mutate({ id: festa.id, etapaId: etapa.etapa.id })}
                    disabled={removerEtapa.isPending}
                    className="p-0.5 text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                    title="Remover etapa"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
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
          onClick={() => setShowCheckIn(!showCheckIn)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
            showCheckIn ? "text-accent-green-600 bg-accent-green-50" : "text-text-secondary hover:text-accent-green-600 hover:bg-accent-green-50"
          }`}
          title="Check-in crianças"
        >
          <UserCheck size={13} />
          <span>Crianças</span>
          {showCheckIn ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={13} />
            <span>Editar</span>
          </button>
        )}
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
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-accent-red hover:bg-red-50 rounded-lg transition-colors ml-auto"
        >
          <SquareCheck size={13} />
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

      {/* Check-in Panel */}
      {showCheckIn && (
        <div className="p-4 border-t border-border bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-text-primary flex items-center gap-2">
              <UserCheck size={14} />
              Check-in ({presentes}/{total})
            </h4>
            {total > 0 && (
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${presentes === total ? "bg-accent-green-500" : "bg-primary-400"}`}
                  style={{ width: `${(presentes / total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Search/Filter */}
          <div className="mb-3">
            <input
              type="text"
              value={filtroParticipantes}
              onChange={(e) => setFiltroParticipantes(e.target.value)}
              placeholder="Filtrar crianças..."
              className="w-full text-xs px-3 py-1.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>

          {/* Add participant */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdicionar(); } }}
              placeholder="Nome da criança..."
              className="flex-1 text-xs px-3 py-1.5 border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <button
              onClick={handleAdicionar}
              disabled={!novoNome.trim() || adicionarParticipante.isPending}
              className="p-1.5 text-accent-green-600 hover:bg-accent-green-50 rounded-lg transition-colors disabled:opacity-50"
              title="Adicionar"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Participants list */}
          {participantesFiltrados.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {participantesFiltrados.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePresenca(p.id, p.presente ?? false)}
                      disabled={confirmarPresenca.isPending}
                      className={`shrink-0 transition-all ${p.presente ? "text-accent-green-500" : "text-text-muted hover:text-accent-green-400"}`}
                      title={p.presente ? "Desmarcar presença" : "Marcar presente"}
                    >
                      {p.presente ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                    <span className={`text-xs ${p.presente ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                      {p.nome}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    p.presente ? "bg-accent-green-50 text-accent-green-600" : "bg-gray-100 text-text-muted"
                  }`}>
                    {p.presente ? "Presente" : "Ausente"}
                  </span>
                </div>
              ))}
              {filtroParticipantes && participantesFiltrados.length === 0 && participantes && participantes.length > 0 && (
                <p className="text-xs text-text-muted text-center py-2">
                  Nenhum participante encontrado.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">
              {participantes && participantes.length > 0
                ? "Nenhum participante encontrado."
                : "Nenhum participante registado."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
