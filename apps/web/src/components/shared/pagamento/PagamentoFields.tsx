"use client";

import React from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Switch from "@/components/form/switch/Switch";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";

interface PagamentoEstadoRowProps {
  pago: boolean;
  onChange: (v: boolean) => void;
}

export const PagamentoEstadoRow = React.memo(function PagamentoEstadoRow({ pago, onChange }: PagamentoEstadoRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
      <div className="flex items-center gap-2">
        {pago ? (
          <CheckCircle2 size={18} className="text-accent-green-500" />
        ) : (
          <Wallet size={18} className="text-accent-orange-500" />
        )}
        <span className="text-sm font-medium text-text-primary">{pago ? "Pago" : "Por pagar"}</span>
      </div>
      <Switch checked={pago} onChange={onChange} />
    </div>
  );
});

interface PagamentoMetodoFieldProps {
  value: string;
  onChange: (v: string) => void;
  obrigatorioQuandoPago?: boolean;
}

export const PagamentoMetodoField = React.memo(function PagamentoMetodoField({
  value,
  onChange,
  obrigatorioQuandoPago = false,
}: PagamentoMetodoFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        Método de Pagamento {obrigatorioQuandoPago && <span className="text-accent-red-500">*</span>}
      </label>
      <Select options={METODO_PAGAMENTO_OPTIONS} value={value} onChange={onChange} placeholder="Seleccionar..." />
      {obrigatorioQuandoPago && (
        <p className="text-xs text-text-muted mt-1">* Obrigatório quando marcado como pago</p>
      )}
    </div>
  );
});

interface PagamentoSplitSectionProps {
  show: boolean;
  onToggle: (v: boolean) => void;
  metodo2: string;
  setMetodo2: (v: string) => void;
  valor2: string;
  setValor2: (v: string) => void;
}

export const PagamentoSplitSection = React.memo(function PagamentoSplitSection({
  show,
  onToggle,
  metodo2,
  setMetodo2,
  valor2,
  setValor2,
}: PagamentoSplitSectionProps) {
  return (
    <div className="border-t border-border pt-3 space-y-2">
      <Checkbox checked={show} onChange={onToggle} label="Dividir pagamento (2º método)" />
      {show && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">2º Método</label>
            <Select
              options={METODO_PAGAMENTO_OPTIONS}
              value={metodo2}
              onChange={setMetodo2}
              placeholder="2º método..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Valor 2º (€)</label>
            <InputField
              type="number"
              step={0.01}
              min={0}
              value={valor2}
              onChange={(e) => setValor2(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
      )}
    </div>
  );
});
