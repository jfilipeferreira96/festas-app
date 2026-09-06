"use client";

import React, { useState } from "react";
import {
  CheckCircle2, Play, Users, MapPin,
  Clock, Cake, Sparkles, Package, CreditCard, Shield,
  Gift, FileText, MessageSquare, Sandwich,
  SquareCheck, Phone, Mail, Hash, Percent, Tag, Calendar,
  Printer, Pencil,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { StatusBadge, type StatusType } from "@/components/ui";
import { StatusStepper } from "@/components/ui/status-stepper/StatusStepper";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { useReserva } from "@/hooks/use-reservas";
import type { Reserva } from "@/lib/api/reservas";
import { formatDate, formatDuration } from "@/utils/date";
import { differenceInYears } from "date-fns";
import { BOLO_LABELS } from "@/lib/constants/bolo";
import { imprimirListaConvidados } from "@/utils/print-lista";
import PagamentoModal from "./PagamentoModal";
import { resumoLedger } from "@/lib/pagamento-ledger";

// ── Constants ──────────────────────────────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const CAUCAO_LABELS: Record<string, string> = {
  PAGA: "Paga",
  NAO_PAGA: "Não paga",
  PAGA_NO_DIA: "Paga no dia",
};

// ── Quick nav tabs ─────────────────────────────────────────────────
type QuickTab = "geral" | "criancas";

// ── Props ──────────────────────────────────────────────────────────
interface FestaDetailModalProps {
  reservaId: string | null;
  onClose: () => void;
  /** Oculta secções de preço (Pagamento, Caução, Desconto, valores monetários) - usado para o papel CACIFOS. */
  hidePrices?: boolean;
}

// ── Main Component ─────────────────────────────────────────────────
export default function FestaDetailModal({ reservaId, onClose, hidePrices = false }: FestaDetailModalProps) {
  const { data: reserva, isLoading } = useReserva(reservaId ?? "");

  // Quick nav
  const [activeTab, setActiveTab] = useState<QuickTab>("geral");
  const [showPagamento, setShowPagamento] = useState(false);

  // ── Render ─────────────────────────────────────────────────────────
  if (!reservaId) return null;

  return (
    <Modal isOpen={!!reservaId} onClose={onClose} size="2xl" title="Detalhes da Festa">
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
            hidePrices={hidePrices}
            onEditPagamento={() => setShowPagamento(true)}
          />
        ) : (
          <div className="text-center text-text-muted py-8">
            Reserva não encontrada.
          </div>
        )}
      </div>

      {/* Pagamento Modal - edita pagamento dentro do modal de detalhes */}
      {showPagamento && reserva && (
        <PagamentoModal reserva={reserva} onClose={() => setShowPagamento(false)} />
      )}
    </Modal>
  );
}

// ── Detail Content (read-only) ─────────────────────────────────────
function DetailContent({
  reserva,
  activeTab,
  setActiveTab,
  hidePrices = false,
  onEditPagamento,
}: {
  reserva: Reserva;
  activeTab: QuickTab;
  setActiveTab: (tab: QuickTab) => void;
  hidePrices?: boolean;
  onEditPagamento: () => void;
}) {
  const estado = reserva.estado;
  const numCacifos = (reserva.cacifos?.length ?? 0) + (reserva.cacifosHistorico?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FestaColorDot color={reserva.cor} />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {reserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "-"}
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
          onClick={() => setActiveTab("criancas")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "criancas"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Users size={12} />
          Crianças {numCacifos > 0 && (
            <span className="ml-0.5 text-[10px] opacity-70">({numCacifos} cacifos)</span>
          )}
        </button>
        {/* Botão de impressão - sempre visível */}
        <button
          type="button"
          onClick={() => imprimirListaConvidados(reserva, reserva.cacifos ?? [])}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-brand-700 hover:bg-brand-50 transition-colors"
          title="Imprimir lista de crianças"
        >
          <Printer size={12} />
          Imprimir
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "geral" && (
        <GeralTab reserva={reserva} hidePrices={hidePrices} onEditPagamento={onEditPagamento} />
      )}
      {activeTab === "criancas" && (
        <CriancasTab reserva={reserva} />
      )}

    </div>
  );
}

// ── Geral Tab ──────────────────────────────────────────────────────
function GeralTab({ reserva, hidePrices = false, onEditPagamento }: { reserva: Reserva; hidePrices?: boolean; onEditPagamento: () => void }) {
  return (
    <div className="space-y-4">
      {/* Configuração Geral */}
      <Section title="Configuração Geral" icon={<Cake size={13} />}>
        <div className="grid grid-cols-2 gap-3">
          <DetailRow icon={<Calendar size={13} />} label="Data" value={formatDate(reserva.data)} />
          <DetailRow icon={<Clock size={13} />} label="Horário" value={`${reserva.horario} (${formatDuration(reserva.duracaoMinutos)})`} />
          <DetailRow icon={<MapPin size={13} />} label="Sala" value={reserva.local?.nome ?? "-"} />
          {reserva.horaLanche && (
            <DetailRow icon={<Clock size={13} />} label="Hora Lanche" value={reserva.horaLanche} />
          )}
          {reserva.salaLanche?.nome && (
            <DetailRow icon={<MapPin size={13} />} label="Sala Lanche" value={reserva.salaLanche.nome} />
          )}
          <DetailRow icon={<Users size={13} />} label="Nº Crianças" value={String(reserva.numCriancas ?? 0)} />
          {reserva.previsaoCriancas != null && reserva.previsaoCriancas !== reserva.numCriancas && (
            <DetailRow icon={<Users size={13} />} label="Previsão" value={String(reserva.previsaoCriancas)} />
          )}
          {reserva.numCriancasConfirmadas != null && reserva.numCriancasConfirmadas > 0 && (
            <DetailRow icon={<Users size={13} />} label="Confirmadas" value={String(reserva.numCriancasConfirmadas)} />
          )}
        </div>
      </Section>

      {/* Encarregado */}
      <Section title="Encarregado" icon={<Users size={13} />}>
        <div className="space-y-1.5">
          <DetailRow icon={<Users size={13} />} label="Nome" value={reserva.cliente?.nome ?? "-"} />
          <DetailRow icon={<Phone size={13} />} label="Telefone" value={reserva.cliente?.telefone ?? "-"} />
          {reserva.cliente?.email && <DetailRow icon={<Mail size={13} />} label="Email" value={reserva.cliente.email} />}
        </div>
      </Section>

      {/* Bolo de Aniversário */}
      {reserva.bolo && (
        <Section title="Bolo de Aniversário" icon={<Cake size={13} />}>
          <div className="space-y-1.5">
            <DetailRow icon={<Gift size={13} />} label="Tipo" value={BOLO_LABELS[reserva.bolo] ?? reserva.bolo} />
            {reserva.boloTema && <DetailRow icon={<Sparkles size={13} />} label="Tema" value={reserva.boloTema} />}
            {reserva.boloQuantidade != null && reserva.boloQuantidade > 0 && (
              <DetailRow icon={<Gift size={13} />} label="Quantidade" value={String(reserva.boloQuantidade)} />
            )}
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
                  {!hidePrices && e.extra.precoUnitario != null && e.extra.precoUnitario > 0 && (
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
            {!hidePrices && reserva.menu.preco != null && (
              <span className="text-sm text-text-secondary">
                {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.menu.preco)}
              </span>
            )}
          </div>
          {reserva.menu.notas && <p className="text-xs text-text-muted mt-1">{reserva.menu.notas}</p>}
        </Section>
      )}

      {/* Etapas - oculto per pedido do cliente (12/07/2026)
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
      )} */}

      {/* Pagamento - oculto para CACIFOS (hidePrices) */}
      {!hidePrices && (
      <Section title="Pagamento" icon={<CreditCard size={13} />} action={
        <button
          type="button"
          onClick={onEditPagamento}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-brand-700 hover:bg-brand-50 transition-colors normal-case tracking-normal"
        >
          <Pencil size={11} />
          Editar
        </button>
      }>
        <div className="space-y-1.5">
          <DetailRow
            icon={<CreditCard size={13} />}
            label="Estado"
            value={reserva.pago
              ? <span className="text-accent-green-500 font-medium">Pago</span>
              : <span className="text-accent-orange-500 font-medium">Por pagar</span>
            }
          />
          {(() => {
            const { totalPago, temPagamentos, metodos } = resumoLedger(reserva.pagamentos);
            return (
              <>
                {temPagamentos && (
                  <DetailRow icon={<CreditCard size={13} />} label="Método" value={metodos} />
                )}
                {temPagamentos && (
                  <DetailRow icon={<CreditCard size={13} />} label="Valor Pago" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(totalPago)} />
                )}
              </>
            );
          })()}
        </div>
      </Section>
      )}

      {/* Caução - oculto para CACIFOS (hidePrices) */}
      {!hidePrices && (
      <Section title="Caução" icon={<Shield size={13} />}>
        <div className="space-y-1.5">
          <DetailRow
            icon={<Shield size={13} />}
            label="Estado"
            value={
              <span className={`font-medium ${
                reserva.caucao === "PAGA" ? "text-accent-green-500"
                  : reserva.caucao === "PAGA_NO_DIA" ? "text-accent-orange-500"
                  : "text-text-muted"
              }`}>
                {CAUCAO_LABELS[reserva.caucao] ?? reserva.caucao}
              </span>
            }
          />
          {reserva.valorCaucao != null && (
            <DetailRow icon={<Shield size={13} />} label="Valor" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.valorCaucao)} />
          )}
          {/* Falta liquidar = Caução paga (a devolver ao cliente no final) */}
          {(() => {
            const total = Number(reserva.valorTotal) || 0;
            const liquidado = reserva.pago;
            const caucaoPaga = (reserva.caucao === "PAGA" || reserva.caucao === "PAGA_NO_DIA")
              ? Number(reserva.valorCaucao) || 0
              : 0;
            if (total <= 0 || caucaoPaga <= 0 || !liquidado) return null;
            const emFalta = caucaoPaga;
            const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
            return (
              <div className="pt-2 mt-1 border-t border-border bg-accent-orange-50 -mx-3 px-3 py-2 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-accent-orange-700">Falta liquidar</span>
                  <span className="text-base font-bold text-accent-orange-700">{fmt.format(emFalta)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-text-muted">Já pago (caução)</span>
                  <span className="text-xs text-success-600">−{fmt.format(caucaoPaga)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </Section>
      )}

      {/* Desconto - oculto para CACIFOS (hidePrices) */}
      {!hidePrices && (reserva.descontoPercentagem != null && reserva.descontoPercentagem > 0) && (
        <Section title="Desconto" icon={<Percent size={13} />}>
          <div className="space-y-1.5">
            <DetailRow icon={<Percent size={13} />} label="Desconto" value={`${reserva.descontoPercentagem}%`} />
            {reserva.descontoMotivo && <DetailRow icon={<Tag size={13} />} label="Motivo" value={reserva.descontoMotivo} />}
          </div>
        </Section>
      )}

      {/* Observações */}
      {(reserva.observacoesGerais || reserva.observacoesLesoes || reserva.observacoesBrindes || reserva.outrosExtras || reserva.notasCacifos) && (
        <Section title="Observações" icon={<FileText size={13} />}>
          <div className="space-y-2">
            {reserva.observacoesGerais && <ObsBlock label="Gerais" value={reserva.observacoesGerais} />}
            {reserva.notasCacifos && <ObsBlock label="Cacifos" value={reserva.notasCacifos} />}
            {reserva.observacoesLesoes && <ObsBlock label="Lesões / Alergias" value={reserva.observacoesLesoes} />}
            {reserva.observacoesBrindes && <ObsBlock label="Brindes" value={reserva.observacoesBrindes} />}
            {reserva.outrosExtras && <ObsBlock label="Outros Extras" value={reserva.outrosExtras} />}
          </div>
        </Section>
      )}

      {/* Notas Importantes - Lanche */}
      {reserva.notasLanche && (
        <Section title="Notas - Lanche" icon={<Sandwich size={13} />}>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{reserva.notasLanche}</p>
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

// ── Crianças Tab (Cacifos) ───────────────────────────────────────
function CriancasTab({ reserva }: { reserva: Reserva }) {
  const cacifos = reserva.cacifos ?? [];
  const historico = reserva.cacifosHistorico ?? [];

  const totalCacifos = cacifos.length;
  const preenchidos = cacifos.filter(
    (c) => c.criancas && c.criancas.trim() && c.criancas !== "Por preencher",
  ).length;
  const pctCacifos = totalCacifos > 0 ? Math.round((preenchidos / totalCacifos) * 100) : 0;
  const previstos = reserva.numCriancas ?? reserva.previsaoCriancas ?? 0;

  return (
    <div className="space-y-4">
      {/* Cacifos Progress + Badges */}
      {totalCacifos > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-brand-500" />
            <span className="text-sm font-medium text-text-primary">
              {preenchidos}/{totalCacifos} cacifos preenchidos
            </span>
          </div>
          <div className="flex items-center gap-2">
            {reserva.cacifosChamado && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent-orange-100 text-accent-orange-600">
                🔔 Chamado
              </span>
            )}
            {reserva.cacifosConcluido && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent-green-100 text-accent-green-600">
                ✓ Concluído
              </span>
            )}
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctCacifos === 100 ? "bg-accent-green-500" : "bg-brand-400"}`}
                style={{ width: `${pctCacifos}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cacifos Tabela */}
      {totalCacifos > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cacifos Activos ({totalCacifos})</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Nº</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Estado</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Crianças</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cacifos.map((c) => {
                  const porPreencher = !c.criancas || !c.criancas.trim() || c.criancas === "Por preencher";
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-bold text-text-primary whitespace-nowrap">#{c.numero}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            c.estado === "OCUPADO" ? "bg-accent-red-400"
                              : porPreencher ? "bg-accent-orange-400"
                              : c.estado === "RESERVADO" ? "bg-brand-400"
                              : "bg-accent-green-400"
                          }`} />
                          <span className="text-xs text-text-secondary">{porPreencher ? "Por preencher" : c.estado}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-primary">
                        {porPreencher ? <span className="text-text-muted">-</span> : c.criancas}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">{c.notas ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cacifos Histórico */}
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

      {/* Sem cacifos - placeholder */}
      {totalCacifos === 0 && (
        <div className="py-8 text-center">
          <Users size={32} className="mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-muted">Nenhum cacifo atribuído.</p>
          <p className="text-xs text-text-muted mt-1">Previstos: {previstos} crianças</p>
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

// ── Section Component ──────────────────────────────────────────────
function Section({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon}
        {title}
        {action && <span className="ml-auto">{action}</span>}
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

// ── Observation Block ──────────────────────────────────────────────
function ObsBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-text-secondary whitespace-pre-wrap">{value}</p>
    </div>
  );
}
