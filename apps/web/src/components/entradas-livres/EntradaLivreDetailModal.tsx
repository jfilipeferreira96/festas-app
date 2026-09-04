"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Users,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  FileText,
  AlertTriangle,
  Timer,
  Sandwich,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge, Button } from "@/components/ui";
import EntradaLivrePagamentoModal from "./EntradaLivrePagamentoModal";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import { useEntradaLivre } from "@/hooks/use-entrada-livre";
import { useConfigPreco } from "@/hooks/use-precos";
import type { StatusType } from "@/components/ui/status-badge/StatusBadge";
import type { ConfiguracaoPreco } from "@/lib/api/precos";

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

/** Preço por pessoa conforme o escalão de duração (espelha o service calcularPrecoEntrada). */
function getTierPricePerPerson(duracaoMin: number, config: ConfiguracaoPreco | undefined): number {
  const p1 = Number(config?.precoEntrada1h ?? 6);
  const p2 = Number(config?.precoEntrada2h ?? 10);
  const pAd = Number(config?.precoEntradaHoraAdicional ?? 5);
  if (duracaoMin <= 60) return p1;
  if (duracaoMin <= 120) return p2;
  const extra = Math.ceil((duracaoMin - 120) / 60);
  return p2 + extra * pAd;
}

/** Etiqueta legível do escalão aplicado. */
function getTierLabel(duracaoMin: number): string {
  if (duracaoMin <= 60) return "1ª hora";
  if (duracaoMin <= 120) return "2 horas";
  const horas = Math.ceil((duracaoMin - 120) / 60);
  return `2h + ${horas}h adicional${horas > 1 ? "s" : ""}`;
}

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

interface EntradaLivreDetailModalProps {
  entradaId: string | null;
  onClose: () => void;
  /** Oculta secções de preço - usado para o papel CACIFOS. */
  hidePrices?: boolean;
}

export default function EntradaLivreDetailModal({ entradaId, onClose, hidePrices = false }: EntradaLivreDetailModalProps) {
  const { data: entrada, isLoading } = useEntradaLivre(entradaId ?? "");
  const { data: configPreco } = useConfigPreco();
  const [showPagamento, setShowPagamento] = useState(false);

  const now = useCurrentTime();

  // ── Composição do preço (escalão × pessoas + lanche + meias + extras) ──
  const breakdown = useMemo(() => {
    if (!entrada) return null;
    const numCriancas = entrada.criancas?.length ?? 0;
    const numAdultos = entrada.numAdultos ?? 0;
    const totalPessoas = numCriancas + numAdultos;
    const precoPorPessoa = getTierPricePerPerson(entrada.duracaoMinutos, configPreco);
    const custoTempo = +(precoPorPessoa * totalPessoas).toFixed(2);
    const precoLanche = Number(configPreco?.precoLancheEntrada ?? 4.5);
    const custoLanche = entrada.temLanche ? +(precoLanche * totalPessoas).toFixed(2) : 0;
    const custoMeias = entrada.meiasQuantidade
      ? +((entrada.meiasPrecoUnit ?? Number(configPreco?.precoMeias ?? 2.5)) * entrada.meiasQuantidade).toFixed(2)
      : 0;
    const custoExtras = entrada.extras?.reduce(
      (sum, e) => sum + Number(e.extra?.precoUnitario ?? 0) * (e.quantidade ?? 1),
      0,
    ) ?? 0;
    return {
      totalPessoas,
      precoPorPessoa,
      tierLabel: getTierLabel(entrada.duracaoMinutos),
      custoTempo,
      custoLanche,
      custoMeias,
      custoExtras: +custoExtras.toFixed(2),
      subtotal: +(custoTempo + custoLanche + custoMeias + custoExtras).toFixed(2),
    };
  }, [entrada, configPreco]);

  if (!entradaId) return null;

  return (
    <>
    <Modal isOpen={!!entradaId} onClose={onClose} size="lg" title="Detalhes da Entrada Livre">
      <div className="p-6">
        {isLoading || !entrada ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Header (identidade) */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50">
                  <Clock size={20} className="text-brand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {entrada.criancas.map((c: any) => c.nome).join(", ")}
                  </h2>
                  <p className="text-xs text-text-muted">{formatDate(entrada.inicioEm)}</p>
                </div>
              </div>
              <StatusBadge status={entrada.estado as StatusType}>
                {entrada.estado === "ATIVA" ? "Ativa" : entrada.estado === "CONCLUIDA" ? "Concluída" : "Cancelada"}
              </StatusBadge>
            </div>

            {/* Timer (only for ATIVA) */}
            {entrada.estado === "ATIVA" && (
              <TimerSection inicioEm={entrada.inicioEm} duracaoMinutos={entrada.duracaoMinutos} now={now} />
            )}

            {/* Info Grid */}
            <div className="space-y-2">
              <DetailRow icon={<Users size={12} />} label="Crianças" value={entrada.criancas.map((c: any) => c.nome + (c.idade ? ` (${c.idade}a)` : "")).join(", ")} />
              <DetailRow icon={<Users size={12} />} label="Encarregado" value={entrada.encarregadoNome} />
              <DetailRow icon={<Phone size={12} />} label="Telefone" value={entrada.encarregadoTelefone} />
              {entrada.encarregadoEmail && (
                <DetailRow icon={<Mail size={12} />} label="Email" value={entrada.encarregadoEmail} />
              )}
              {entrada.cacifo && (
                <DetailRow icon={<Package size={12} />} label="Cacifo" value={`#${entrada.cacifo.numero}`} />
              )}
              <div className="border-t border-border my-2" />
              <DetailRow icon={<Clock size={12} />} label="Início" value={`${formatDate(entrada.inicioEm)} ${formatTime(entrada.inicioEm)}`} />
              <DetailRow icon={<Timer size={12} />} label="Duração" value={`${entrada.duracaoMinutos} min`} />
              <DetailRow label="Fim Previsto" value={formatTime(entrada.fimPrevisto)} />
              {entrada.temLanche && (
                <DetailRow
                  icon={<Sandwich size={12} />}
                  label="Lanche"
                  value={entrada.horaLanche ? `Às ${entrada.horaLanche}` : "Incluído"}
                />
              )}
              {entrada.fimReal && (
                <DetailRow label="Fim Real" value={formatTime(entrada.fimReal)} />
              )}
              {entrada.excessoMinutos != null && entrada.excessoMinutos > 0 && (
                <DetailRow icon={<AlertTriangle size={12} />} label="Excesso" value={`${entrada.excessoMinutos} min`} accent />
              )}
              {!hidePrices && (
                <>
                  <div className="border-t border-border my-2" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted px-3 mb-1">
                    Composição do Preço
                  </p>
                  {/* Tempo (escalão × pessoas) */}
                  {breakdown && (
                    <DetailRow
                      icon={<Clock size={12} />}
                      label={`Tempo (${breakdown.tierLabel})`}
                      value={`${breakdown.totalPessoas}× ${formatCurrency(breakdown.precoPorPessoa)} = ${formatCurrency(breakdown.custoTempo)}`}
                    />
                  )}
                  {/* Lanche */}
                  {breakdown && breakdown.custoLanche > 0 && (
                    <DetailRow
                      label="Lanche"
                      value={`${breakdown.totalPessoas}× ${formatCurrency(Number(configPreco?.precoLancheEntrada ?? 4.5))} = ${formatCurrency(breakdown.custoLanche)}`}
                    />
                  )}
                  {/* Meias */}
                  {breakdown && breakdown.custoMeias > 0 && (
                    <DetailRow
                      label="Meias"
                      value={`${entrada.meiasQuantidade}× ${formatCurrency(entrada.meiasPrecoUnit ?? Number(configPreco?.precoMeias ?? 2.5))} = ${formatCurrency(breakdown.custoMeias)}`}
                    />
                  )}
                  {/* Extras */}
                  {entrada.extras?.length > 0 && entrada.extras.map((e: any, i: number) => (
                    <DetailRow
                      key={i}
                      icon={<Package size={12} />}
                      label={e.extra?.nome ?? "Extra"}
                      value={`${e.quantidade ?? 1}× ${formatCurrency(e.extra?.precoUnitario ?? 0)} = ${formatCurrency(Number(e.extra?.precoUnitario ?? 0) * (e.quantidade ?? 1))}`}
                    />
                  ))}
                  {/* Subtotal calculado */}
                  {breakdown && (
                    <DetailRow label="Subtotal calculado" value={formatCurrency(breakdown.subtotal)} />
                  )}
                  <div className="border-t border-border my-2" />
                  {/* Custo final (guardado - pode ter override manual) */}
                  <DetailRow icon={<CreditCard size={12} />} label="Custo Final" value={formatCurrency(entrada.custoTotal)} bold />
                  {breakdown && Math.abs(breakdown.subtotal - Number(entrada.custoTotal)) > 0.01 && (
                    <p className="text-[10px] text-text-muted px-3">⚠ Valor ajustado manualmente</p>
                  )}
                  {entrada.custoExcesso != null && entrada.custoExcesso > 0 && (
                    <DetailRow label="Custo Excesso" value={formatCurrency(entrada.custoExcesso)} accent />
                  )}
                  <DetailRow label="Total Final" value={formatCurrency(entrada.custoTotalFinal ?? entrada.custoTotal)} bold />
                  <DetailRow
                    label="Pagamento"
                    value={entrada.pago ? "Pago" : "Por pagar"}
                  />
                  {entrada.metodoPagamento && (
                    <DetailRow
                      label={entrada.metodoPagamento2 ? "Métodos" : "Método"}
                      value={
                        entrada.metodoPagamento2
                          ? `${metodoPagamentoLabel(entrada.metodoPagamento)} + ${metodoPagamentoLabel(entrada.metodoPagamento2)}`
                          : metodoPagamentoLabel(entrada.metodoPagamento)
                      }
                    />
                  )}
                  {entrada.custoExcesso != null && entrada.custoExcesso > 0 && (
                    <DetailRow
                      label="Excesso Pago"
                      value={entrada.pagoExcesso ? "Sim" : "Não"}
                      accent={!entrada.pagoExcesso}
                    />
                  )}
                </>
              )}
              {entrada.observacoes && (
                <DetailRow icon={<FileText size={12} />} label="Observações" value={entrada.observacoes} />
              )}
              {entrada.observacoesLesoes && (
                <DetailRow icon={<AlertTriangle size={12} />} label="Alergias/Lesões" value={entrada.observacoesLesoes} accent />
              )}
            </div>

            {!hidePrices && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowPagamento(true)} className="gap-2">
                  <Wallet size={15} />
                  Gerir pagamento
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>

    {/* Pagamento - mesma modal unificada das restantes páginas */}
    {showPagamento && entrada && (
      <EntradaLivrePagamentoModal entrada={entrada} onClose={() => setShowPagamento(false)} />
    )}
    </>
  );
}

// ── Timer Section ──────────────────────────────────────────────
function TimerSection({ inicioEm, duracaoMinutos, now }: { inicioEm: string; duracaoMinutos: number; now: Date }) {
  const inicio = new Date(inicioEm);
  const plannedMs = duracaoMinutos * 60 * 1000;
  const elapsedMs = now.getTime() - inicio.getTime();
  const excessMs = Math.max(0, elapsedMs - plannedMs);
  const remainingMs = Math.max(0, plannedMs - elapsedMs);
  const isOvertime = excessMs > 0;
  const progressPercent = Math.min(100, (elapsedMs / plannedMs) * 100);

  const formatMs = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className={`rounded-xl border p-4 mb-4 ${isOvertime ? "border-accent-red-200 bg-accent-red-50/50" : "border-border bg-gray-50/50"}`}>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Decorrido</p>
          <p className={`text-lg font-bold font-mono tracking-wider ${isOvertime ? "text-accent-red-600" : "text-text-primary"}`}>
            {formatMs(elapsedMs)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Restante</p>
          <p className={`text-lg font-bold font-mono tracking-wider ${isOvertime ? "text-accent-red-500" : "text-brand-600"}`}>
            {isOvertime ? "Excedido" : formatMs(remainingMs)}
          </p>
        </div>
        <div className={`text-center ${isOvertime ? "bg-accent-red-100 rounded-lg" : ""}`}>
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Excesso</p>
          <p className={`text-lg font-bold font-mono tracking-wider ${isOvertime ? "text-accent-red-600" : "text-text-muted"}`}>
            {isOvertime ? `+${formatMs(excessMs)}` : "-"}
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 rounded-full ${isOvertime ? "bg-accent-red-500" : "bg-brand-500"}`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>
    </div>
  );
}

// ── Detail Row ──────────────────────────────────────────────────
function DetailRow({ label, value, icon, bold, accent }: { label: string; value: string; icon?: React.ReactNode; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
      {icon && <span className="text-text-muted">{icon}</span>}
      <span className="text-xs font-medium text-text-muted w-28 shrink-0">{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-text-primary" : accent ? "font-medium text-accent-red-600" : "font-medium text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}
