"use client";

import React from "react";
import { Shield } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";

const CAUCAO_OPTIONS = [
  { value: "NAO_PAGA", label: "Não paga" },
  { value: "PAGA", label: "Paga" },
  { value: "PAGA_NO_DIA", label: "Paga no dia" },
];

interface PagamentoCaucaoTabProps {
  caucao: string;
  setCaucao: (v: string) => void;
  valorCaucao: string;
  setValorCaucao: (v: string) => void;
  metodoCaucao: string;
  setMetodoCaucao: (v: string) => void;
}

/**
 * Tab "Caução" da modal de pagamento - só renderizada enquanto a caução não
 * está paga (PAGA é imutável: CAUCAO_BLOQUEADA no backend, e a caução paga
 * vive no ledger como linha fixa "Caução"). Descontos ficam na tab Acertos.
 */
export default React.memo(function PagamentoCaucaoTab({
  caucao,
  setCaucao,
  valorCaucao,
  setValorCaucao,
  metodoCaucao,
  setMetodoCaucao,
}: PagamentoCaucaoTabProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
        <Shield size={14} className="text-text-muted" /> Caução
      </label>
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
      <p className="text-[11px] text-text-muted mt-2">
        Marcando "Paga", a caução entra no livro de pagamentos e desconta o que falta.
      </p>
    </div>
  );
});
