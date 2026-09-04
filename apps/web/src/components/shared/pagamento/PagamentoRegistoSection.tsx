"use client";

import React from "react";
import { Banknote } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";
import { PagamentoEstadoRow } from "@/components/shared/pagamento/PagamentoFields";
import type { MetodoPagamento } from "@/lib/api/reservas";

interface MetodoOption {
  value: string;
  label: string;
}

interface PagamentoRegistoSectionProps {
  /** Total a pagar (editável). undefined = vazio. */
  totalValor: number | undefined;
  onTotalChange: (v: number | undefined) => void;
  /** Valor calculado automaticamente (mostrado como ≈ sugestão). */
  totalCalculado: number;
  erroTotal?: string;
  /** Valor recebido no pagamento 1 ("recebi X nesta fase"). */
  recebido1: number | undefined;
  onRecebido1Change: (v: number | undefined) => void;
  metodo1: string | undefined;
  onMetodo1Change: (v: string | undefined) => void;
  /** Dividir pagamento (2º pagamento). */
  split: boolean;
  onSplitToggle: (v: boolean) => void;
  metodo2: string | undefined;
  onMetodo2Change: (v: string | undefined) => void;
  valor2: number;
  onValor2Change: (v: number) => void;
  /** Total − recebido1 − recebido2 (>= 0). */
  falta: number;
  pago: boolean;
  onPagoChange: (v: boolean) => void;
  /** Linhas informativas do cálculo (ex.: Tempo/Lanche/Meias + Total). */
  breakdown?: React.ReactNode;
  /** Opções de método (por omissão: todas as de sistema). */
  metodoOptions?: MetodoOption[];
}

/**
 * Bloco de pagamento unificado (Festa & Entrada Livre, modo criação):
 * Total a pagar editável + Recebido nesta fase (pag. 1) + split pag. 2 + Falta pagar + Pago.
 * Componente controlado - cada form liga os seus campos RHF via props.
 */
export const PagamentoRegistoSection = React.memo(function PagamentoRegistoSection({
  totalValor,
  onTotalChange,
  totalCalculado,
  erroTotal,
  recebido1,
  onRecebido1Change,
  metodo1,
  onMetodo1Change,
  split,
  onSplitToggle,
  metodo2,
  onMetodo2Change,
  valor2,
  onValor2Change,
  falta,
  pago,
  onPagoChange,
  breakdown,
  metodoOptions = METODO_PAGAMENTO_OPTIONS,
}: PagamentoRegistoSectionProps) {
  return (
    <div className="space-y-3">
      {/* Total a pagar (editável) */}
      <div>
        <FieldLabel required>Total a pagar (€)</FieldLabel>
        <div className="flex items-center gap-2">
          <InputField
            type="number"
            step={0.01}
            min={0}
            placeholder="0,00"
            autoComplete="off"
            value={totalValor != null ? String(totalValor) : ""}
            onChange={(e) => {
              const v = e.target.value;
              onTotalChange(v === "" ? undefined : Number(v));
            }}
            error={!!erroTotal}
            hint={erroTotal}
          />
          <span className="text-xs text-text-muted whitespace-nowrap">≈ {formatEuro(totalCalculado)}</span>
        </div>
        <p className="text-[11px] text-text-muted mt-1">
          Pré-preenchido com o cálculo — editável (valor final acordado).
        </p>
      </div>

      {/* Pagamento 1 */}
      <div className="border-t border-border pt-3">
        <span className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
          <Banknote size={13} className="text-text-muted" /> Pagamento 1
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Método de pagamento</FieldLabel>
            <Select
              options={metodoOptions}
              value={metodo1 ?? "NONE"}
              onChange={(val) => onMetodo1Change(val === "NONE" ? undefined : (val as MetodoPagamento))}
              placeholder="Seleccionar..."
            />
          </div>
          <div>
            <FieldLabel>Recebi nesta fase (€)</FieldLabel>
            <InputField
              type="number"
              step={0.01}
              min={0}
              placeholder="0,00"
              autoComplete="off"
              value={recebido1 != null ? String(recebido1) : ""}
              onChange={(e) => {
                const v = e.target.value;
                onRecebido1Change(v === "" ? undefined : Number(v));
              }}
            />
          </div>
        </div>
      </div>

      {/* Pagamento 2 (split) */}
      <div className="border-t border-border pt-3 space-y-2">
        <Checkbox
          checked={split}
          onChange={onSplitToggle}
          label="Dividir pagamento (2º pagamento)"
        />
        {split && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <FieldLabel>2º Método</FieldLabel>
              <Select
                options={metodoOptions}
                placeholder="2º método"
                value={metodo2 ?? "NONE"}
                onChange={(val) => onMetodo2Change(val === "NONE" ? undefined : (val as MetodoPagamento))}
              />
            </div>
            <div>
              <FieldLabel>Valor 2º (€)</FieldLabel>
              <InputField
                type="number"
                step={0.01}
                min={0}
                placeholder="0,00"
                autoComplete="off"
                value={String(valor2 ?? 0)}
                onChange={(e) => onValor2Change(e.target.value === "" ? 0 : parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Estado + Falta pagar */}
      <div className="border-t border-border pt-3 space-y-2">
        <PagamentoEstadoRow pago={pago} onChange={onPagoChange} />
        {falta > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-text-secondary">Falta pagar</span>
            <span className="text-sm font-bold text-accent-orange-600">{formatEuro(falta)}</span>
          </div>
        )}
      </div>

      {/* Breakdown (display) */}
      {breakdown && <div className="border-t border-border pt-3 space-y-1.5">{breakdown}</div>}
    </div>
  );
});
