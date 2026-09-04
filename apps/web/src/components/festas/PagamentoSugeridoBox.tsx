"use client";

import { Calculator } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { Reserva } from "@/lib/api/reservas";

export interface SugeridoFesta {
  criancasEfetivas: number;
  precoCrianca: number;
  custoFesta: number;
  custoExtras: number;
  custoMeias: number;
  desconto: number;
  sugerido: number;
}

export function calcularSugeridoFesta(
  reserva: Reserva,
  descontoPercentagem: number
): SugeridoFesta | null {
  const precoCrianca = Number(reserva.precoCriancaAplicado ?? 0);
  if (!precoCrianca) return null;

  const numCriancas = reserva.numCriancasConfirmadas ?? reserva.numCriancas ?? 0;
  const minimo = reserva.minimoCriancas ?? 0;
  const criancasEfetivas = Math.max(numCriancas, minimo);

  const custoFesta = precoCrianca * criancasEfetivas;
  const custoExtras = (reserva.extras ?? []).reduce((acc, e) => {
    const qtd = e.extra?.baseCobranca === "POR_PESSOA" ? criancasEfetivas : (e.quantidade ?? 1);
    return acc + Number(e.extra?.precoUnitario ?? 0) * qtd;
  }, 0);
  const custoMeias = (reserva.meiasQuantidade ?? 0) * Number(reserva.meiasPrecoUnit ?? 0);

  const bruto = custoFesta + custoExtras + custoMeias;
  const desconto = bruto * (descontoPercentagem / 100);

  return {
    criancasEfetivas,
    precoCrianca,
    custoFesta,
    custoExtras,
    custoMeias,
    desconto,
    sugerido: Math.max(bruto - desconto, 0),
  };
}

interface PagamentoSugeridoBoxProps {
  reserva: Reserva;
  descontoPercentagem: number;
  onUsarSugerido: (valor: number) => void;
}

export default function PagamentoSugeridoBox({
  reserva,
  descontoPercentagem,
  onUsarSugerido,
}: PagamentoSugeridoBoxProps) {
  const s = calcularSugeridoFesta(reserva, descontoPercentagem);
  if (!s) return null;

  return (
    <div className="rounded-lg border border-border bg-gray-50/50 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Calculator size={13} className="text-text-muted" /> Total sugerido
        </span>
        <button
          type="button"
          onClick={() => onUsarSugerido(s.sugerido)}
          className="text-xs font-medium text-primary-600 hover:underline cursor-pointer"
        >
          Usar sugerido
        </button>
      </div>
      <div className="flex justify-between text-[11px] text-text-secondary">
        <span>
          Festa ({s.criancasEfetivas} × {formatEuro(s.precoCrianca)})
        </span>
        <span className="tabular-nums">{formatEuro(s.custoFesta)}</span>
      </div>
      {s.custoExtras > 0 && (
        <div className="flex justify-between text-[11px] text-text-secondary">
          <span>Extras</span>
          <span className="tabular-nums">{formatEuro(s.custoExtras)}</span>
        </div>
      )}
      {s.custoMeias > 0 && (
        <div className="flex justify-between text-[11px] text-text-secondary">
          <span>Meias</span>
          <span className="tabular-nums">{formatEuro(s.custoMeias)}</span>
        </div>
      )}
      {s.desconto > 0 && (
        <div className="flex justify-between text-[11px] text-accent-orange-700">
          <span>Desconto {descontoPercentagem}%</span>
          <span className="tabular-nums">−{formatEuro(s.desconto)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs font-semibold text-text-primary pt-1 border-t border-border">
        <span>Sugerido</span>
        <span className="tabular-nums">{formatEuro(s.sugerido)}</span>
      </div>
    </div>
  );
}
