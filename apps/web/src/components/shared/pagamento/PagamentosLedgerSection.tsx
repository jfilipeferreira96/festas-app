"use client";

import React, { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import { formatEuro } from "@/lib/format";
import { METODO_PAGAMENTO_OPTIONS, metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import {
  EPS,
  faltaPagar,
  totalPago,
  type MetodoPagamentoValor,
  type PagamentoLedgerItem,
} from "@/lib/pagamento-ledger";

/** Sem a pseudo-opção "Não definido" - no ledger o método é obrigatório. */
const METODOS_OBRIGATORIOS = METODO_PAGAMENTO_OPTIONS.filter((o) => o.value !== "NONE");

interface PagamentosLedgerSectionProps {
  /** Total a entregar no dia (custo + caução), já com ajustes. */
  totalDevido: number;
  pagamentos: PagamentoLedgerItem[];
  onAdd: (pagamento: { valor: number; metodo: MetodoPagamentoValor; nota?: string }) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Ledger de pagamentos COMPACTO - desenhado para encaixar nas modais de
 * pagamento/edição (PagamentoModal, EntradaLivrePagamentoModal, forms).
 * Os pagamentos acumulam-se (método obrigatório) até a soma atingir o total;
 * o estado "pago" é derivado, nunca manual. Puro/controlado - sem API.
 */
export const PagamentosLedgerSection = React.memo(function PagamentosLedgerSection({
  totalDevido,
  pagamentos,
  onAdd,
  onRemove,
  readOnly = false,
}: PagamentosLedgerSectionProps) {
  const [metodo, setMetodo] = useState("");
  const [valor, setValor] = useState("");

  const falta = faltaPagar(totalDevido, pagamentos);
  const pago = falta <= EPS && totalDevido > 0;

  // Pré-preencher o valor com o que falta (atualiza ao adicionar/remover/ajustar)
  useEffect(() => {
    setValor(falta > 0 ? falta.toFixed(2) : "");
  }, [falta]);

  const valorNum = Number(valor) || 0;
  const excede = valorNum > falta + EPS;
  const podeAdicionar = !readOnly && !pago && metodo !== "" && valorNum > 0 && !excede;

  const handleAdd = () => {
    if (!podeAdicionar) return;
    onAdd({
      valor: Math.round(valorNum * 100) / 100,
      metodo: metodo as MetodoPagamentoValor,
    });
    setMetodo("");
  };

  return (
    <div className="space-y-2.5">
      {/* Estado derivado da soma - nunca manual */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-border">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          {pago ? (
            <>
              <CheckCircle2 size={14} className="text-accent-green-500" />
              <span className="text-accent-green-600">Liquidado</span>
            </>
          ) : (
            <>
              <Wallet size={14} className="text-accent-orange-500" />
              <span className="text-text-primary">Falta pagar</span>
              <span className="font-bold text-accent-orange-600">{formatEuro(falta)}</span>
            </>
          )}
        </span>
        <span className="text-[11px] text-text-muted">
          {formatEuro(totalPago(pagamentos))} de {formatEuro(totalDevido)}
        </span>
      </div>

      {/* Lista de pagamentos (mais recentes primeiro) - linhas compactas */}
      {pagamentos.length > 0 && (
        <ul className="space-y-1">
          {[...pagamentos]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface"
              >
                <span className="inline-flex items-center gap-1.5 min-w-0 text-xs text-text-primary">
                  <Banknote size={13} className="text-text-muted shrink-0" />
                  <span className="truncate">
                    {metodoPagamentoLabel(p.metodo)}
                    {p.nota ? <span className="text-text-muted"> · {p.nota}</span> : null}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-accent-green-600">
                    +{formatEuro(p.valor)}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      className="p-0.5 rounded text-text-muted hover:text-accent-red-500 transition-colors"
                      aria-label={`Remover pagamento de ${metodoPagamentoLabel(p.metodo)}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </li>
            ))}
        </ul>
      )}

      {/* Adicionar pagamento - método obrigatório, até completar o total */}
      {!readOnly && !pago && (
        <div className="flex items-end gap-2 pt-0.5">
          <div className="flex-1 min-w-0">
            <Select
              options={METODOS_OBRIGATORIOS}
              value={metodo || undefined}
              onChange={setMetodo}
              placeholder="Método *"
            />
          </div>
          <div className="w-28 shrink-0">
            <InputField
              type="number"
              step={0.01}
              min={0}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              error={excede}
              hint={excede ? `Excede (${formatEuro(falta)})` : undefined}
            />
          </div>
          <button
            type="button"
            disabled={!podeAdicionar}
            onClick={handleAdd}
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            title={metodo === "" ? "Obrigatório selecionar o método" : "Adicionar pagamento"}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
});
