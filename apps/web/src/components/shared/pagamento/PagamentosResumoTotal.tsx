"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
  CAUCAO_LABELS,
  estaLiquidado,
  totalPago,
  type AjusteEdicao,
  type EstadoCaucaoValor,
  type PagamentoLedgerItem,
} from "@/lib/pagamento-ledger";

export interface LinhaCustoResumo {
  label: string;
  valor: number;
}

interface PagamentosResumoTotalProps {
  /** Etapas de custo (ex.: Crianças, Extras, Meias). */
  linhas: LinhaCustoResumo[];
  /** Ajustes = edições manuais ao total (acréscimos/descontos com motivo). */
  ajustes: AjusteEdicao[];
  /** Soma das linhas de custo (sem ajustes). */
  subtotal: number;
  /** Total a pagar = subtotal + ajustes. */
  totalAPagar: number;
  caucaoEstado: EstadoCaucaoValor;
  caucaoValor: number;
  pagamentos: PagamentoLedgerItem[];
}

/**
 * Resumo COMPACTO do total com todas as etapas: linhas de custo → ajustes
 * (edições) → Total a pagar → caução (linha própria que conta para o total
 * do dia) → Total a entregar → pagamentos (ledger) → Falta/Liquidado.
 * Desenhado para os rodapés/resumos das modais de pagamento.
 */
export const PagamentosResumoTotal = React.memo(function PagamentosResumoTotal({
  linhas,
  ajustes,
  subtotal,
  totalAPagar,
  caucaoEstado,
  caucaoValor,
  pagamentos,
}: PagamentosResumoTotalProps) {
  const caucaoAtiva = caucaoEstado !== "NAO_PAGA" ? caucaoValor : 0;
  const totalDevido = Math.round((totalAPagar + caucaoAtiva) * 100) / 100;
  const pago = estaLiquidado(totalDevido, pagamentos);
  const recebido = totalPago(pagamentos);
  const falta = Math.max(0, Math.round((totalDevido - recebido) * 100) / 100);

  return (
    <div className="space-y-1">
      {linhas.map((l) => (
        <Row key={l.label} label={l.label} valor={formatEuro(l.valor)} muted />
      ))}

      <div className="border-t border-border/50 pt-1 mt-1">
        <Row label="Subtotal" valor={formatEuro(subtotal)} />
      </div>

      {ajustes.map((a) => (
        <Row
          key={a.id}
          label={`${a.tipo === "ACRESCIMO" ? "Acréscimo" : "Desconto"} · ${a.motivo}`}
          valor={`${a.tipo === "ACRESCIMO" ? "+" : "−"}${formatEuro(a.valor)}`}
          valorClass={a.tipo === "ACRESCIMO" ? "text-accent-green-600" : "text-accent-red-500"}
        />
      ))}

      <div className="border-t border-border/50 pt-1 mt-1">
        <Row label="Total a pagar" valor={formatEuro(totalAPagar)} forte />
      </div>

      {caucaoAtiva > 0 && (
        <Row
          label={`Caução · ${CAUCAO_LABELS[caucaoEstado]}`}
          labelNota="conta para o total do dia — devolvível"
          valor={`+${formatEuro(caucaoAtiva)}`}
        />
      )}

      <div className="border-t-2 border-border pt-1.5 mt-1.5">
        <Row label="Total a entregar no dia" valor={formatEuro(totalDevido)} forte grande />
      </div>

      <Row
        label={`Pagamentos realizados (${pagamentos.length})`}
        valor={`−${formatEuro(recebido)}`}
        valorClass="text-accent-green-600"
      />

      <div className="border-t border-border pt-1.5 mt-1">
        {pago ? (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-green-600">
              <CheckCircle2 size={14} /> Liquidado
            </span>
            <span className="text-sm font-bold text-accent-green-600">{formatEuro(0)}</span>
          </div>
        ) : (
          <Row label="Falta pagar" valor={formatEuro(falta)} valorClass="text-accent-orange-600" />
        )}
      </div>
    </div>
  );
});

function Row({
  label,
  labelNota,
  valor,
  muted = false,
  forte = false,
  grande = false,
  valorClass,
}: {
  label: string;
  labelNota?: string;
  valor: string;
  muted?: boolean;
  forte?: boolean;
  grande?: boolean;
  valorClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-xs min-w-0 truncate ${muted ? "text-text-muted" : "text-text-secondary"}`}>
        {label}
        {labelNota ? <span className="block text-[10px] text-text-muted/80">{labelNota}</span> : null}
      </span>
      <span
        className={`shrink-0 ${grande ? "text-base font-bold text-primary-500" : forte ? "text-sm font-bold text-text-primary" : "text-xs text-text-secondary"} ${valorClass ?? ""}`}
      >
        {valor}
      </span>
    </div>
  );
}
