"use client";

import React from "react";
import { Shield, Percent } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";

const CAUCAO_OPTIONS = [
  { value: "NAO_PAGA", label: "Não paga" },
  { value: "PAGA", label: "Paga" },
  { value: "PAGA_NO_DIA", label: "Paga no dia" },
];

interface PagamentoCaucaoDescontoTabProps {
  caucao: string;
  setCaucao: (v: string) => void;
  valorCaucao: string;
  setValorCaucao: (v: string) => void;
  metodoCaucao: string;
  setMetodoCaucao: (v: string) => void;
  descontoPercentagem: string;
  setDescontoPercentagem: (v: string) => void;
  descontoMotivo: string;
  setDescontoMotivo: (v: string) => void;
  /** Caução paga é imutável. */
  bloqueada?: boolean;
}

export default React.memo(function PagamentoCaucaoDescontoTab({
  caucao,
  setCaucao,
  valorCaucao,
  setValorCaucao,
  metodoCaucao,
  setMetodoCaucao,
  descontoPercentagem,
  setDescontoPercentagem,
  descontoMotivo,
  setDescontoMotivo,
  bloqueada = false,
}: PagamentoCaucaoDescontoTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
          <Shield size={14} className="text-text-muted" /> Caução
        </label>
        {bloqueada ? (
          <p className="text-xs text-text-muted bg-gray-50 border border-border rounded-lg px-3 py-2">
            A caução já foi paga e está bloqueada - não pode ser alterada.
          </p>
        ) : (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
            <Select options={CAUCAO_OPTIONS} value={caucao} onChange={setCaucao} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Valor da Caução (€)</label>
            <InputField
              type="number"
              step={0.01}
              min={0}
              value={valorCaucao}
              onChange={(e) => setValorCaucao(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Método de pagamento</label>
            <Select options={METODO_PAGAMENTO_OPTIONS} value={metodoCaucao} onChange={setMetodoCaucao} />
          </div>
        </div>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
          <Percent size={14} className="text-text-muted" /> Desconto
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Percentagem (%)</label>
            <InputField
              type="number"
              min={0}
              max={100}
              value={descontoPercentagem}
              onChange={(e) => setDescontoPercentagem(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Motivo</label>
            <InputField
              value={descontoMotivo}
              onChange={(e) => setDescontoMotivo(e.target.value)}
              placeholder="Ex: cliente habitual..."
            />
          </div>
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          Para descontos com nota de auditoria, prefira a tab <span className="font-medium">Acertos</span>.
        </p>
      </div>
    </div>
  );
});
