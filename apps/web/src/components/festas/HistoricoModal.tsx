"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui";
import {
  Clock,
  Users,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  User,
  Sparkles,
  Utensils,
  Gift,
  CreditCard,
  Shield,
  Phone,
  Cake,
  Mail,
  AlertTriangle,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import type { Reserva } from "@/lib/api/reservas";
import { getAniversarianteNome, getAniversarianteNomes } from "@/lib/api/reservas";
import type { CacifoHistoricoEntry } from "@saas/shared-types";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";

interface HistoricoModalProps {
  reserva: Reserva | null;
  onClose: () => void;
}

export default function HistoricoModal({ reserva, onClose }: HistoricoModalProps) {
  if (!reserva) return null;

  const duracaoReal = React.useMemo(() => {
    if (!reserva.inicioEm || !reserva.fimReal) return null;
    const ms = new Date(reserva.fimReal).getTime() - new Date(reserva.inicioEm).getTime();
    const min = Math.round(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }, [reserva.inicioEm, reserva.fimReal]);

  const cacifosHistorico = (reserva.cacifosHistorico ?? []) as CacifoHistoricoEntry[];
  const monitores = reserva.monitores?.map((m) => m.monitor.nome).join(", ") ?? "Sem monitor";
  const etapasConcluidas = reserva.etapas?.filter((e) => e.concluida) ?? [];
  const etapasPendentes = reserva.etapas?.filter((e) => !e.concluida) ?? [];

  return (
    <Modal isOpen={!!reserva} onClose={onClose}>
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {getAniversarianteNome(reserva)}
            </h2>
            <p className="text-sm text-text-muted">
              Histórico da festa concluída
            </p>
          </div>
          <StatusBadge status="CONCLUIDA">Concluída</StatusBadge>
        </div>

        {/* Data */}
        {reserva.data && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-text-muted" />
              <span className="text-xs text-text-secondary">
                {format(parseISO(reserva.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
              </span>
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <InfoItem
            icon={<MapPin size={14} />}
            label="Local"
            value={reserva.local?.nome ?? "-"}
          />
          <InfoItem
            icon={<Clock size={14} />}
            label="Horário"
            value={`${reserva.horario} · ${reserva.duracaoMinutos} min`}
          />
          <InfoItem
            icon={<Clock size={14} />}
            label="Duração real"
            value={duracaoReal ?? "-"}
          />
          <InfoItem
            icon={<User size={14} />}
            label="Encarregado"
            value={reserva.cliente?.nome ?? "-"}
          />
          {reserva.cliente?.telefone && (
            <InfoItem
              icon={<Phone size={14} />}
              label="Telefone"
              value={reserva.cliente.telefone}
            />
          )}
          {reserva.cliente?.email && (
            <InfoItem
              icon={<Mail size={14} />}
              label="Email"
              value={reserva.cliente.email}
            />
          )}
          <InfoItem
            icon={<Cake size={14} />}
            label="Aniversariante(s)"
            value={getAniversarianteNomes(reserva)}
          />
          <InfoItem
            icon={<Users size={14} />}
            label="Crianças"
            value={`${reserva.numCriancas ?? 0} previstas`}
          />
          <InfoItem
            icon={<Users size={14} />}
            label="Monitores"
            value={monitores}
          />
        </div>

        {/* Detalhes da Festa */}
        {(reserva.tema || reserva.bolo || reserva.menu || (reserva.extras && reserva.extras.length > 0)) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-text-primary mb-1">Detalhes da Festa</p>
            {(reserva.tema || reserva.cor) && (
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-text-muted" />
                <span className="text-xs text-text-secondary">
                  <span className="text-text-muted">Tema:</span> {reserva.tema || "-"}
                  {reserva.cor && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <span className="w-3 h-3 rounded-full inline-block border border-gray-300" style={{ backgroundColor: reserva.cor }} />
                    </span>
                  )}
                </span>
              </div>
            )}
            {reserva.bolo && (
              <div className="flex items-center gap-2">
                <Gift size={13} className="text-text-muted" />
                <span className="text-xs text-text-secondary"><span className="text-text-muted">Bolo:</span> {reserva.bolo}</span>
              </div>
            )}
            {reserva.menu && (
              <div className="flex items-center gap-2">
                <Utensils size={13} className="text-text-muted" />
                <span className="text-xs text-text-secondary">
                  <span className="text-text-muted">Menu:</span> {reserva.menu.nome}
                  {reserva.menu.preco != null && (
                    <span className="text-text-muted ml-1">
                      ({new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.menu.preco)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {reserva.extras && reserva.extras.length > 0 && (
              <div className="flex items-center gap-2">
                <Package size={13} className="text-text-muted" />
                <span className="text-xs text-text-secondary">
                  <span className="text-text-muted">Extras:</span>{" "}
                  {reserva.extras.map((e) => `${e.extra.nome}${e.quantidade > 1 ? ` ×${e.quantidade}` : ""}`).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pagamento */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-text-primary mb-1">Pagamento</p>
          <div className="flex items-center gap-2">
            <CreditCard size={13} className="text-text-muted" />
            <span className="text-xs text-text-secondary">
              {reserva.pago ? (
                <span className="text-primary-500">Pago</span>
              ) : (
                <span className="text-accent-orange">Por pagar</span>
              )}
              {reserva.valorPago != null && (
                <span className="text-text-muted ml-1">
                  · {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(reserva.valorPago)}
                </span>
              )}
              {reserva.metodoPagamento && (
                <span className="text-text-muted ml-1">
                  · {metodoPagamentoLabel(reserva.metodoPagamento)}
                </span>
              )}
            </span>
          </div>
          {(reserva.caucao === "PAGA" || reserva.caucao === "PAGA_NO_DIA") && (
            <div className="flex items-center gap-2">
              <Shield size={13} className="text-text-muted" />
              <span className="text-xs text-text-secondary">
                Caução {reserva.caucao === "PAGA" ? "paga" : "paga no dia"}
              </span>
            </div>
          )}
        </div>

        {/* Observações detalhadas */}
        {(reserva.observacoesGerais || reserva.observacoesLesoes || reserva.observacoesBrindes || reserva.outrosExtras || reserva.notas) && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <MessageSquare size={14} />
              Observações
            </h3>
            <div className="space-y-2">
              {reserva.observacoesGerais && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Observações gerais</p>
                  <p className="text-xs text-text-primary">{reserva.observacoesGerais}</p>
                </div>
              )}
              {reserva.observacoesLesoes && (
                <div className="p-3 bg-accent-orange-50 rounded-lg border border-accent-orange-200">
                  <p className="text-[10px] text-accent-orange-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> Lesões / Alergias
                  </p>
                  <p className="text-xs text-text-primary">{reserva.observacoesLesoes}</p>
                </div>
              )}
              {reserva.observacoesBrindes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Brindes</p>
                  <p className="text-xs text-text-primary">{reserva.observacoesBrindes}</p>
                </div>
              )}
              {reserva.outrosExtras && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Outros extras</p>
                  <p className="text-xs text-text-primary">{reserva.outrosExtras}</p>
                </div>
              )}
              {reserva.notas && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Notas</p>
                  <p className="text-xs text-text-primary">{reserva.notas}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Etapas - oculto per pedido do cliente (12/07/2026)
        {reserva.etapas && reserva.etapas.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Etapas</h3>
            <div className="space-y-1">
              {etapasConcluidas.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={14} className="text-accent-green-500 shrink-0" />
                  <span className="text-text-primary">{e.etapa?.nome}</span>
                  {e.concluidaEm && (
                    <span className="text-xs text-text-muted ml-auto">
                      {new Date(e.concluidaEm).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
              {etapasPendentes.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <XCircle size={14} className="text-text-muted shrink-0" />
                  <span className="text-text-muted">{e.etapa?.nome}</span>
                  <span className="text-xs text-text-muted ml-auto">Não concluída</span>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Cacifos Historico */}
        {cacifosHistorico.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Package size={14} />
              Cacifos ({cacifosHistorico.length})
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {cacifosHistorico.map((c) => (
                <div
                  key={c.numero}
                  className={`rounded-lg p-2 text-center text-xs font-bold ${
                    c.estado === "PAGO"
                      ? "bg-accent-purple-100 text-accent-purple-600"
                      : "bg-accent-red-100 text-accent-red-600"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Package size={12} />
                    <span>#{c.numero}</span>
                  </div>
                  {c.criancas && (
                    <p className="text-[10px] font-normal mt-1 truncate" title={c.criancas}>
                      {c.criancas}
                    </p>
                  )}
                  {c.notas && (
                    <p className="text-[10px] font-normal text-text-muted truncate" title={c.notas}>
                      {c.notas}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-[10px] bg-white text-gray-700 border border-gray-300 shadow-theme-xs hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted">{icon}</span>
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  );
}
