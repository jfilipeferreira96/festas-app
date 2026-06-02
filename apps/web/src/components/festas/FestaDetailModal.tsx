"use client";

import React, { useState, useCallback } from "react";
import {
  Pencil, Trash2, CheckCircle2, Play, XCircle, Users, MapPin,
  Clock, Cake, Sparkles, Package, UserCheck, CreditCard, Shield,
  Gift, Star, FileText, MessageSquare, History,
  SquareCheck, Phone, Mail, Hash, Percent, Tag, Calendar,
  Eye,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge, Button, type StatusType } from "@/components/ui";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { StatusStepper } from "@/components/ui/status-stepper/StatusStepper";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import {
  useReserva,
  useDeleteReserva,
  useUpdateReservaStatus,
  useIniciarReserva,
  useFinalizarReserva,
} from "@/hooks/use-reservas";
import FestaForm from "./FestaForm";
import CheckInModal from "./CheckInModal";
import HistoricoModal from "./HistoricoModal";
import type { Reserva, EstadoReserva } from "@/lib/api/reservas";
import { formatDate, formatDuration } from "@/utils/date";
import { differenceInYears } from "date-fns";

// ── Constants ──────────────────────────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const METODO_PAGAMENTO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  MULTIBANCO: "Multibanco",
  MBWAY: "MB WAY",
  TRANSFERENCIA: "Transferência Bancária",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const CAUCAO_LABELS: Record<string, string> = {
  PAGA: "Paga",
  NAO_PAGA: "Não paga",
  PAGA_NO_DIA: "Paga no dia",
};

// ── Quick nav tabs ─────────────────────────────────────────────────
type QuickTab = "geral" | "participantes" | "cacifos";

// ── Props ──────────────────────────────────────────────────────────
interface FestaDetailModalProps {
  reservaId: string | null;
  onClose: () => void;
}

// ── Main Component ─────────────────────────────────────────────────
export default function FestaDetailModal({ reservaId, onClose }: FestaDetailModalProps) {
  const { data: reserva, isLoading } = useReserva(reservaId ?? "");

  // Action mutations
  const deleteReserva = useDeleteReserva();
  const updateStatus = useUpdateReservaStatus();
  const iniciarReserva = useIniciarReserva();
  const finalizarReserva = useFinalizarReserva();

  // Sub-modal states
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "cancel" | "confirmar" | "finalizar" | "iniciar";
  } | null>(null);

  // Quick nav
  const [activeTab, setActiveTab] = useState<QuickTab>("geral");

  // ── Action handlers ────────────────────────────────────────────────
  const handleConfirmAction = useCallback(async () => {
    if (!reserva || !confirmAction) return;
    try {
      switch (confirmAction.type) {
        case "delete":
          await deleteReserva.mutateAsync(reserva.id);
          onClose();
          break;
        case "cancel":
          await updateStatus.mutateAsync({ id: reserva.id, estado: "CANCELADA" as EstadoReserva });
          break;
        case "confirmar":
          await updateStatus.mutateAsync({ id: reserva.id, estado: "CONFIRMADO" as EstadoReserva });
          break;
        case "finalizar":
          await finalizarReserva.mutateAsync(reserva.id);
          break;
        case "iniciar":
          await iniciarReserva.mutateAsync(reserva.id);
          break;
      }
    } catch {
      // Error handled by mutation
    }
    setConfirmAction(null);
  }, [reserva, confirmAction, deleteReserva, updateStatus, finalizarReserva, iniciarReserva, onClose]);

  const isActionPending =
    deleteReserva.isPending ||
    updateStatus.isPending ||
    iniciarReserva.isPending ||
    finalizarReserva.isPending;

  // ── Render ─────────────────────────────────────────────────────────
  if (!reservaId) return null;

  return (
    <>
      {/* Main Detail Modal */}
      <Modal isOpen={!!reservaId} onClose={onClose} size="2xl">
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : reserva ? (
            <DetailContent
              reserva={reserva}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onEdit={() => setShowEditForm(true)}
              onCheckIn={() => setShowCheckIn(true)}
              onHistorico={() => setShowHistorico(true)}
              onConfirmar={() => setConfirmAction({ type: "confirmar" })}
              onCancelar={() => setConfirmAction({ type: "cancel" })}
              onEliminar={() => setConfirmAction({ type: "delete" })}
              onIniciar={() => setConfirmAction({ type: "iniciar" })}
              onFinalizar={() => setConfirmAction({ type: "finalizar" })}
            />
          ) : (
            <div className="text-center text-text-muted py-8">
              Reserva não encontrada.
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Form Modal */}
      {showEditForm && reserva && (
        <Modal isOpen={showEditForm} onClose={() => setShowEditForm(false)} size="2xl">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Editar Festa</h2>
            <FestaForm reserva={reserva} onClose={() => setShowEditForm(false)} />
          </div>
        </Modal>
      )}

      {/* Check-in Modal */}
      {showCheckIn && reserva && (
        <CheckInModal reserva={reserva} onClose={() => setShowCheckIn(false)} />
      )}

      {/* Historico Modal */}
      {showHistorico && reserva && (
        <HistoricoModal reserva={reserva} onClose={() => setShowHistorico(false)} />
      )}

      {/* Confirmation Modals */}
      {confirmAction?.type === "delete" && (
        <ConfirmActionModal
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title="Eliminar Festa"
          message="Tem a certeza que deseja eliminar esta festa? Esta acção não pode ser revertida."
          confirmText="Eliminar"
          variant="danger"
          isConfirming={isActionPending}
        />
      )}
      {confirmAction?.type === "cancel" && (
        <ConfirmActionModal
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title="Cancelar Festa"
          message="Tem a certeza que deseja cancelar esta festa?"
          confirmText="Cancelar Festa"
          variant="warning"
          isConfirming={isActionPending}
        />
      )}
      {confirmAction?.type === "confirmar" && (
        <ConfirmActionModal
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title="Confirmar Festa"
          message="Tem a certeza que deseja confirmar esta festa?"
          confirmText="Confirmar"
          variant="success"
          isConfirming={isActionPending}
        />
      )}
      {confirmAction?.type === "finalizar" && (
        <ConfirmActionModal
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title="Finalizar Festa"
          message="Tem a certeza que deseja finalizar esta festa? Esta acção é irreversível."
          confirmText="Finalizar"
          variant="danger"
          isConfirming={isActionPending}
        />
      )}
      {confirmAction?.type === "iniciar" && reserva && (
        <Modal isOpen onClose={() => setConfirmAction(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Play size={20} className="text-brand-500" />
              Iniciar Festa
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Confirme os dados antes de iniciar a festa. Esta acção irá transformar a reserva numa festa em curso.
            </p>
            <div className="bg-surface rounded-lg border border-border p-4 space-y-2 mb-4">
              <ConfirmRow label="Aniversariante" value={reserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "—"} />
              <ConfirmRow label="Encarregado" value={reserva.cliente?.nome ?? "—"} />
              <ConfirmRow label="Sala" value={reserva.local?.nome ?? "—"} />
              <ConfirmRow label="Nº Crianças" value={String(reserva.numCriancas ?? 0)} />
              <ConfirmRow label="Duração" value={formatDuration(reserva.duracaoMinutos)} />
              {reserva.menu && <ConfirmRow label="Menu" value={reserva.menu.nome} />}
              {reserva.extras.length > 0 && <ConfirmRow label="Extras" value={`${reserva.extras.length} extras`} />}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
              <Button onClick={handleConfirmAction} disabled={isActionPending} className="flex items-center gap-2">
                {isActionPending ? "A iniciar..." : <><Play size={16} /> Iniciar Festa</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Detail Content ─────────────────────────────────────────────────
function DetailContent({
  reserva,
  activeTab,
  setActiveTab,
  onEdit,
  onCheckIn,
  onHistorico,
  onConfirmar,
  onCancelar,
  onEliminar,
  onIniciar,
  onFinalizar,
}: {
  reserva: Reserva;
  activeTab: QuickTab;
  setActiveTab: (tab: QuickTab) => void;
  onEdit: () => void;
  onCheckIn: () => void;
  onHistorico: () => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  onEliminar: () => void;
  onIniciar: () => void;
  onFinalizar: () => void;
}) {
  const estado = reserva.estado;
  const numParticipantes = reserva.participantes?.length ?? 0;
  const numCacifos = (reserva.cacifos?.length ?? 0) + (reserva.cacifosHistorico?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FestaColorDot color={reserva.cor} />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {reserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "—"}
            </h2>
            <p className="text-sm text-text-muted">
              {reserva.aniversariantes
                ?.filter(a => a.aniversariante?.dataNascimento)
                .map(a => `${differenceInYears(new Date(reserva.data ?? new Date()), new Date(a.aniversariante.dataNascimento!))} anos`)
                .join(", ") || ""}
            </p>
          </div>
        </div>
        <StatusBadge status={estado as StatusType}>
          {ESTADO_LABELS[estado] ?? estado}
        </StatusBadge>
      </div>

      {/* Status Stepper */}
      <div className="px-2">
        <StatusStepper currentStatus={estado as "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA"} />
      </div>

      {/* Runtime Timer (EM_CURSO) */}
      {estado === "EM_CURSO" && reserva.inicioEm && (
        <RuntimeTimer reserva={reserva} />
      )}

      {/* Quick Nav Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab("geral")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "geral"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <FileText size={12} />
          Geral
        </button>
        <button
          onClick={() => setActiveTab("participantes")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "participantes"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Users size={12} />
          Participantes {numParticipantes > 0 && <span className="ml-0.5 text-[10px] opacity-70">({numParticipantes})</span>}
        </button>
        <button
          onClick={() => setActiveTab("cacifos")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "cacifos"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Package size={12} />
          Cacifos {numCacifos > 0 && <span className="ml-0.5 text-[10px] opacity-70">({numCacifos})</span>}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "geral" && (
        <GeralTab reserva={reserva} />
      )}
      {activeTab === "participantes" && (
        <ParticipantesTab reserva={reserva} />
      )}
      {activeTab === "cacifos" && (
        <CacifosTab reserva={reserva} />
      )}

      {/* Actions */}
      <div className="pt-4 mt-4 border-t border-border flex flex-wrap items-center gap-2">
        {/* RESERVA */}
        {estado === "RESERVA" && (
          <>
            <ActionButton icon={<CheckCircle2 size={14} />} label="Confirmar" onClick={onConfirmar} variant="success" />
            <ActionButton icon={<Pencil size={14} />} label="Editar" onClick={onEdit} variant="primary" />
            <ActionButton icon={<XCircle size={14} />} label="Cancelar" onClick={onCancelar} variant="warning" />
            <ActionButton icon={<Trash2 size={14} />} label="Eliminar" onClick={onEliminar} variant="danger" />
          </>
        )}
        {/* CONFIRMADO */}
        {estado === "CONFIRMADO" && (
          <>
            <ActionButton icon={<Play size={14} />} label="Iniciar" onClick={onIniciar} variant="primary" />
            <ActionButton icon={<UserCheck size={14} />} label="Check-in" onClick={onCheckIn} variant="success" />
            <ActionButton icon={<Pencil size={14} />} label="Editar" onClick={onEdit} variant="primary" />
            <ActionButton icon={<XCircle size={14} />} label="Cancelar" onClick={onCancelar} variant="warning" />
          </>
        )}
        {/* EM_CURSO */}
        {estado === "EM_CURSO" && (
          <>
            <ActionButton icon={<SquareCheck size={14} />} label="Finalizar" onClick={onFinalizar} variant="danger" />
            <ActionButton icon={<UserCheck size={14} />} label="Check-in" onClick={onCheckIn} variant="success" />
            <ActionButton icon={<Pencil size={14} />} label="Editar" onClick={onEdit} variant="primary" />
          </>
        )}
        {/* CONCLUIDA */}
        {estado === "CONCLUIDA" && (
          <>
            <ActionButton icon={<History size={14} />} label="Histórico" onClick={onHistorico} variant="primary" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Geral Tab ──────────────────────────────────────────────────────
function GeralTab({ reserva }: { reserva: Reserva }) {
  return (
    <div className="space-y-4">
      {/* Configuração Geral */}
      <Section title="Configuração Geral" icon={<Cake size={13} />}>
        <div className="grid grid-cols-2 gap-3">
          <DetailRow icon={<Calendar size={13} />} label="Data" value={formatDate(reserva.data)} />
          <DetailRow icon={<Clock size={13} />} label="Horário" value={`${reserva.horario} (${formatDuration(reserva.duracaoMinutos)})`} />
          <DetailRow icon={<MapPin size={13} />} label="Sala" value={reserva.local?.nome ?? "—"} />
          <DetailRow icon={<Users size={13} />} label="Nº Crianças" value={String(reserva.numCriancas ?? 0)} />
          {reserva.previsaoCriancas != null && reserva.previsaoCriancas !== reserva.numCriancas && (
            <DetailRow icon={<Users size={13} />} label="Previsão" value={String(reserva.previsaoCriancas)} />
          )}
        </div>
      </Section>

      {/* Encarregado */}
      <Section title="Encarregado" icon={<Users size={13} />}>
        <div className="space-y-1.5">
          <DetailRow icon={<Users size={13} />} label="Nome" value={reserva.cliente?.nome ?? "—"} />
          <DetailRow icon={<Phone size={13} />} label="Telefone" value={reserva.cliente?.telefone ?? "—"} />
          {reserva.cliente?.email && <DetailRow icon={<Mail size={13} />} label="Email" value={reserva.cliente.email} />}
        </div>
      </Section>

      {/* Tema e Bolo */}
      {(reserva.tema || reserva.bolo) && (
        <Section title="Tema e Bolo" icon={<Sparkles size={13} />}>
          <div className="space-y-1.5">
            {reserva.tema && <DetailRow icon={<Sparkles size={13} />} label="Tema" value={reserva.tema} />}
            {reserva.bolo && <DetailRow icon={<Gift size={13} />} label="Bolo" value={reserva.bolo} />}
            {reserva.boloQuantidade != null && reserva.boloQuantidade > 0 && (
              <DetailRow icon={<Gift size={13} />} label="Qtd. Bolo" value={String(reserva.boloQuantidade)} />
            )}
          </div>
        </Section>
      )}

      {/* Monitores */}
      {reserva.monitores && reserva.monitores.length > 0 && (
        <Section title="Monitores" icon={<Star size={13} />}>
          <div className="flex flex-wrap gap-1.5">
            {reserva.monitores.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 text-xs rounded-full font-medium">
                <Star size={11} />
                {m.monitor.nome}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Extras */}
      {reserva.extras && reserva.extras.length > 0 && (
        <Section title="Extras" icon={<Package size={13} />}>
          <div className="space-y-1">
            {reserva.extras.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50">
                <span className="text-sm text-text-primary">{e.extra.nome}</span>
                <div className="flex items-center gap-2">
                  {e.quantidade > 1 && <span className="text-xs text-text-muted">×{e.quantidade}</span>}
                  {e.extra.precoUnitario != null && e.extra.precoUnitario > 0 && (
                    <span className="text-xs text-text-secondary">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(e.extra.precoUnitario * e.quantidade)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Menu / Lanche */}
      {reserva.menu && (
        <Section title="Lanche / Menu" icon={<Cake size={13} />}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">{reserva.menu.nome}</span>
            {reserva.menu.preco != null && (
              <span className="text-sm text-text-secondary">
                {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.menu.preco)}
              </span>
            )}
          </div>
          {reserva.menu.notas && <p className="text-xs text-text-muted mt-1">{reserva.menu.notas}</p>}
        </Section>
      )}

      {/* Etapas */}
      {reserva.etapas && reserva.etapas.length > 0 && (
        <Section title={`Etapas (${reserva.etapas.filter(e => e.concluida).length}/${reserva.etapas.length})`} icon={<CheckCircle2 size={13} />}>
          <div className="space-y-1">
            {reserva.etapas.map((etapa) => (
              <div key={etapa.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50">
                <span className="text-sm text-text-primary">{etapa.etapa.nome}</span>
                <span className={`text-xs font-medium ${etapa.concluida ? "text-accent-green-500" : "text-text-muted"}`}>
                  {etapa.concluida ? "✓ Concluída" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Pagamento */}
      <Section title="Pagamento" icon={<CreditCard size={13} />}>
        <div className="space-y-1.5">
          <DetailRow
            icon={<CreditCard size={13} />}
            label="Estado"
            value={reserva.pago
              ? <span className="text-accent-green-500 font-medium">Pago</span>
              : <span className="text-accent-orange font-medium">Por pagar</span>
            }
          />
          {reserva.metodoPagamento && (
            <DetailRow icon={<CreditCard size={13} />} label="Método" value={METODO_PAGAMENTO_LABELS[reserva.metodoPagamento] ?? reserva.metodoPagamento} />
          )}
          {reserva.valorPago != null && (
            <DetailRow icon={<CreditCard size={13} />} label="Valor Pago" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.valorPago)} />
          )}
          {reserva.referenciaPagamento && (
            <DetailRow icon={<Hash size={13} />} label="Referência" value={reserva.referenciaPagamento} />
          )}
        </div>
      </Section>

      {/* Caução */}
      <Section title="Caução" icon={<Shield size={13} />}>
        <div className="space-y-1.5">
          <DetailRow
            icon={<Shield size={13} />}
            label="Estado"
            value={
              <span className={`font-medium ${
                reserva.caucao === "PAGA" ? "text-accent-green-500"
                  : reserva.caucao === "PAGA_NO_DIA" ? "text-accent-orange"
                  : "text-text-muted"
              }`}>
                {CAUCAO_LABELS[reserva.caucao] ?? reserva.caucao}
              </span>
            }
          />
          {reserva.valorCaucao != null && (
            <DetailRow icon={<Shield size={13} />} label="Valor" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.valorCaucao)} />
          )}
        </div>
      </Section>

      {/* Desconto */}
      {(reserva.descontoPercentagem != null && reserva.descontoPercentagem > 0) && (
        <Section title="Desconto" icon={<Percent size={13} />}>
          <div className="space-y-1.5">
            <DetailRow icon={<Percent size={13} />} label="Desconto" value={`${reserva.descontoPercentagem}%`} />
            {reserva.descontoMotivo && <DetailRow icon={<Tag size={13} />} label="Motivo" value={reserva.descontoMotivo} />}
          </div>
        </Section>
      )}

      {/* Observações */}
      {(reserva.observacoesGerais || reserva.observacoesLesoes || reserva.observacoesBrindes || reserva.outrosExtras) && (
        <Section title="Observações" icon={<FileText size={13} />}>
          <div className="space-y-2">
            {reserva.observacoesGerais && <ObsBlock label="Gerais" value={reserva.observacoesGerais} />}
            {reserva.observacoesLesoes && <ObsBlock label="Lesões / Alergias" value={reserva.observacoesLesoes} />}
            {reserva.observacoesBrindes && <ObsBlock label="Brindes" value={reserva.observacoesBrindes} />}
            {reserva.outrosExtras && <ObsBlock label="Outros Extras" value={reserva.outrosExtras} />}
          </div>
        </Section>
      )}

      {/* Notas */}
      {reserva.notas && (
        <Section title="Notas" icon={<MessageSquare size={13} />}>
          <p className="text-sm text-text-secondary">{reserva.notas}</p>
        </Section>
      )}

      {/* Runtime Info */}
      {(reserva.inicioEm || reserva.fimPrevisto || reserva.fimReal) && (
        <Section title="Informações de Execução" icon={<Clock size={13} />}>
          <div className="space-y-1.5">
            {reserva.inicioEm && <DetailRow icon={<Play size={13} />} label="Início" value={new Date(reserva.inicioEm).toLocaleString("pt-PT")} />}
            {reserva.fimPrevisto && <DetailRow icon={<Clock size={13} />} label="Fim Previsto" value={new Date(reserva.fimPrevisto).toLocaleString("pt-PT")} />}
            {reserva.fimReal && <DetailRow icon={<SquareCheck size={13} />} label="Fim Real" value={new Date(reserva.fimReal).toLocaleString("pt-PT")} />}
            {reserva.inicioEm && reserva.fimReal && (
              <DetailRow
                icon={<Clock size={13} />}
                label="Duração Real"
                value={formatDuration(Math.round((new Date(reserva.fimReal).getTime() - new Date(reserva.inicioEm).getTime()) / 60000))}
              />
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Participantes Tab ──────────────────────────────────────────────
function ParticipantesTab({ reserva }: { reserva: Reserva }) {
  const participantes = reserva.participantes ?? [];
  const presentes = participantes.filter(p => p.presente).length;

  if (participantes.length === 0) {
    return (
      <div className="py-8 text-center">
        <Users size={32} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">Nenhum participante registado.</p>
        <p className="text-xs text-text-muted mt-1">Previstos: {reserva.numCriancas ?? reserva.previsaoCriancas ?? 0} crianças</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-brand-500" />
          <span className="text-sm font-medium text-text-primary">
            {presentes}/{participantes.length} presentes
          </span>
        </div>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${presentes === participantes.length ? "bg-accent-green-500" : "bg-primary-400"}`}
            style={{ width: `${(presentes / participantes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-1">
        {participantes.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-border transition-all">
            <div className="flex items-center gap-2">
              <span className={`shrink-0 ${p.presente ? "text-accent-green-500" : "text-text-muted"}`}>
                {p.presente ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </span>
              <span className="text-sm text-text-primary">{p.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              {p.cacifo && (
                <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-500 rounded-full">
                  Cacifo #{p.cacifo.numero}
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                p.presente ? "bg-accent-green-50 text-accent-green-600" : "bg-gray-100 text-text-muted"
              }`}>
                {p.presente ? "Presente" : "Ausente"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cacifos Tab ────────────────────────────────────────────────────
function CacifosTab({ reserva }: { reserva: Reserva }) {
  const cacifos = reserva.cacifos ?? [];
  const historico = reserva.cacifosHistorico ?? [];

  if (cacifos.length === 0 && historico.length === 0) {
    return (
      <div className="py-8 text-center">
        <Package size={32} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">Nenhum cacifo atribuído.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Cacifos */}
      {cacifos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cacifos Activos ({cacifos.length})</h4>
          <div className="grid grid-cols-4 gap-2">
            {cacifos.map((c) => (
              <div key={c.id} className={`rounded-lg p-3 text-center text-xs shadow-sm ${
                c.estado === "LIVRE" ? "bg-accent-green-400 text-white"
                  : c.estado === "OCUPADO" ? "bg-accent-red-400 text-white"
                  : c.estado === "RESERVADO" ? "bg-brand-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}>
                <div className="font-bold text-sm">#{c.numero}</div>
                <div className="text-[10px] opacity-80">{c.estado}</div>
                {c.criancas && <div className="text-[10px] mt-1 opacity-90 truncate" title={c.criancas}>{c.criancas}</div>}
                {c.notas && <div className="text-[10px] mt-0.5 opacity-75 truncate" title={c.notas}>📝 {c.notas}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Cacifos */}
      {historico.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Histórico de Cacifos ({historico.length})</h4>
          <div className="grid grid-cols-4 gap-2">
            {historico.map((c, i) => (
              <div key={`hist-${i}`} className="bg-gray-50 border border-border rounded-lg p-3 text-center text-xs">
                <div className="font-bold text-sm text-text-primary">#{c.numero}</div>
                {c.criancas && <div className="text-[10px] text-text-secondary truncate" title={c.criancas}>{c.criancas}</div>}
                {c.notas && <div className="text-[10px] text-text-muted truncate" title={c.notas}>📝 {c.notas}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Runtime Timer Component ────────────────────────────────────────
function RuntimeTimer({ reserva }: { reserva: Reserva }) {
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  React.useEffect(() => {
    if (!reserva.inicioEm || !reserva.fimPrevisto) return;

    const update = () => {
      const now = new Date();
      const inicio = new Date(reserva.inicioEm!);
      const fim = new Date(reserva.fimPrevisto!);
      const elapsedMs = now.getTime() - inicio.getTime();
      const remainingMs = fim.getTime() - now.getTime();

      const eH = Math.floor(elapsedMs / 3600000);
      const eM = Math.floor((elapsedMs % 3600000) / 60000);
      const eS = Math.floor((elapsedMs % 60000) / 1000);
      setElapsed(`${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}:${String(eS).padStart(2, "0")}`);

      if (remainingMs <= 0) {
        setIsOverdue(true);
        setRemaining(`+${Math.floor(Math.abs(remainingMs) / 60000)} min`);
      } else {
        setIsOverdue(false);
        const rH = Math.floor(remainingMs / 3600000);
        const rM = Math.floor((remainingMs % 3600000) / 60000);
        const rS = Math.floor((remainingMs % 60000) / 1000);
        setRemaining(`${String(rH).padStart(2, "0")}:${String(rM).padStart(2, "0")}:${String(rS).padStart(2, "0")}`);
      }

      const total = fim.getTime() - inicio.getTime();
      setProgress(Math.min(100, Math.max(0, (elapsedMs / total) * 100)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [reserva.inicioEm, reserva.fimPrevisto]);

  return (
    <div className={`rounded-lg border p-4 ${isOverdue ? "border-accent-red bg-red-50/50" : "border-accent-green-200 bg-green-50/50"}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Tempo decorrido</p>
          <p className="text-2xl font-bold text-text-primary font-mono">{elapsed}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Tempo restante</p>
          <p className={`text-2xl font-bold font-mono ${isOverdue ? "text-accent-red" : "text-accent-orange"}`}>
            {remaining}
          </p>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isOverdue ? "bg-accent-red" : "bg-accent-green"}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Action Button ──────────────────────────────────────────────────
function ActionButton({
  icon,
  label,
  onClick,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant: "primary" | "success" | "danger" | "warning";
}) {
  const styles = {
    primary: "text-brand-500 hover:bg-brand-50",
    success: "text-accent-green-600 hover:bg-accent-green-50",
    danger: "text-accent-red hover:bg-red-50",
    warning: "text-accent-orange hover:bg-orange-50",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${styles[variant]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Section Component ──────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      <div className="p-3 rounded-lg bg-surface border border-border">
        {children}
      </div>
    </div>
  );
}

// ── Detail Row ─────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-text-muted shrink-0">{icon}</span>}
      <span className="text-xs text-text-muted w-24 shrink-0">{label}:</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

// ── Confirm Row (for Iniciar modal) ────────────────────────────────
function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}

// ── Observation Block ──────────────────────────────────────────────
function ObsBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-text-secondary whitespace-pre-wrap">{value}</p>
    </div>
  );
}
